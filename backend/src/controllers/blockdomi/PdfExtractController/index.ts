import { Request, Response } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { sendError, sendSuccess } from '../../../utils/responseUtils';
import { logger } from '../../../utils/logger';
import { isRedisAvailable } from '../../../config/redis';
import { setPdfExtractJob, getPdfExtractJob } from '../../../services/pdfExtractJobService';

/** Clientes SSE ativos por jobId (progresso em tempo real). */
const sseClients = new Map<string, Set<Response>>();

function sseFlush(res: Response): void {
  (res as unknown as { flush?: () => void }).flush?.();
}

function sseWrite(res: Response, payload: string): void {
  try {
    res.write(payload);
    sseFlush(res);
  } catch { /* cliente desconectado */ }
}

function ssePublish(jobId: string, event: string, data: unknown): void {
  const clients = sseClients.get(jobId);
  if (!clients?.size) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    sseWrite(res, payload);
  }
}

function sseRegister(jobId: string, res: Response): void {
  if (!sseClients.has(jobId)) sseClients.set(jobId, new Set());
  sseClients.get(jobId)!.add(res);
}

function sseUnregister(jobId: string, res: Response): void {
  sseClients.get(jobId)?.delete(res);
  if (sseClients.get(jobId)?.size === 0) sseClients.delete(jobId);
}

function runPythonScript(scriptPath: string, pdfPath: string, timeoutMs: number): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', [scriptPath, pdfPath]);
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    const t = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(Object.assign(new Error('Timeout'), { stdout, stderr, code: null, killed: true }));
    }, timeoutMs);
    proc.on('close', (code, signal) => {
      clearTimeout(t);
      if (signal) {
        reject(Object.assign(new Error(`Processo finalizado por signal: ${signal}`), { stdout, stderr, code, killed: true }));
      } else if (code !== 0) {
        reject(Object.assign(new Error(`Python exit code ${code}`), { stdout, stderr, code }));
      } else {
        resolve({ stdout, stderr, code });
      }
    });
    proc.on('error', (err) => {
      clearTimeout(t);
      reject(err);
    });
  });
}

/** Detecta se está rodando do dist (produção) ou src (desenvolvimento) */
const isDist = __dirname.includes(`${path.sep}dist${path.sep}`);
const relativeToRoot = isDist ? '../../../' : '../../../../'; // dist: 3 níveis | src: 4 níveis até backend

/**
 * Executado em background: baixa PDF da URL, salva em temp e chama o script Python.
 * Função no nível do módulo para não depender de `this` no callback do setImmediate.
 */
async function runExtractFromUrlBackground(jobId: string, url: string): Promise<void> {
  const uploadsDir = '/tmp/backnet-pdf';
  await fs.mkdir(uploadsDir, { recursive: true });
  const tempFilePath = path.join(uploadsDir, `job-${jobId}.pdf`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    const response = await fetch(url, {
      headers: { 'User-Agent': 'BackNet/1.0' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Falha ao baixar PDF: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/pdf') && !contentType.includes('octet-stream')) {
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > 4) {
        const header = Buffer.from(buffer.slice(0, 4));
        const pdfHeader = Buffer.from([0x25, 0x50, 0x44, 0x46]);
        if (!header.equals(pdfHeader)) {
          throw new Error('O URL não retornou um PDF válido');
        }
      }
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(tempFilePath, buffer);

    const scriptPath = path.join(__dirname, relativeToRoot, 'scripts/extrair-dominios.py');
    runPythonInBackground(scriptPath, tempFilePath, jobId);
  } catch (err) {
    await fs.unlink(tempFilePath).catch(() => {});
    throw err;
  }
}

/**
 * Executa o script Python em background (sem bloquear a requisição).
 * Ao terminar, atualiza o Redis com resultado ou erro e remove o arquivo temporário.
 */
function runPythonInBackground(scriptPath: string, tempFilePath: string, jobId: string): void {
  const proc = spawn('python3', [scriptPath, tempFilePath], {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  proc.unref();

  let stdout = '';
  let stderr = '';
  let stdoutBuffer = '';
  let stderrBuffer = '';

  logger.info('PdfExtract.background: processo Python iniciado', {
    jobId,
    pid: proc.pid,
    scriptPath
  });

  proc.stdout?.on('data', (d: Buffer) => {
    const chunk = d.toString();
    stdout += chunk;
    stdoutBuffer += chunk;
    const lines = stdoutBuffer.split('\n');
    stdoutBuffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('{')) continue;
      logger.info('PdfExtract.background: stdout', { jobId, line: trimmed });
    }
  });

  const pageProgressLog: Array<{ current: number; total: number }> = [];

  proc.stderr?.on('data', (d: Buffer) => {
    const chunk = d.toString();
    stderr += chunk;
    stderrBuffer += chunk;
    const lines = stderrBuffer.split('\n');
    stderrBuffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      logger.info('PdfExtract.background: progresso', { jobId, line: trimmed });

      // Acumula progresso: "processando página X/Y"
      const m = trimmed.match(/processando p[aá]gina\s+(\d+)\/(\d+)/i);
      if (m) {
        const current = parseInt(m[1], 10);
        const total = parseInt(m[2], 10);
        pageProgressLog.push({ current, total });
        // Push imediato via SSE (tempo real)
        ssePublish(jobId, 'progress', { current, total });
        // Atualiza Redis para quem fizer polling
        setPdfExtractJob(jobId, {
          status: 'processing',
          progress: { current, total },
          progressLog: [...pageProgressLog],
          createdAt: Date.now()
        });
      }
    }
  });

  proc.on('close', (code, signal) => {
    const stdoutTail = stdoutBuffer.trim();
    if (stdoutTail && !stdoutTail.startsWith('{')) {
      logger.info('PdfExtract.background: stdout', { jobId, line: stdoutTail });
    }
    const stderrTail = stderrBuffer.trim();
    if (stderrTail) {
      logger.info('PdfExtract.background: progresso', { jobId, line: stderrTail });
    }

    const cleanup = (): void => {
      fs.unlink(tempFilePath).catch((err) => {
        logger.error('PdfExtract.background: falha ao remover temp', { jobId, tempFilePath, error: err instanceof Error ? err.message : String(err) });
      });
    };

    if (signal || code !== 0) {
      let errMsg = signal ? `Processo finalizado por signal: ${signal}` : `Python exit code ${code}`;
      const stderrTrim = stderr?.trim();
      const stdoutTrim = stdout?.trim();
      if (stderrTrim) logger.warn('PdfExtract.background: Python stderr', { jobId, stderr: stderrTrim });
      if (stdoutTrim) logger.warn('PdfExtract.background: Python stdout (exit != 0)', { jobId, stdout: stdoutTrim });

      // Quando o script falha com sys.exit(1), ele ainda pode escrever JSON com "error" no stdout.
      // Extraímos essa mensagem para retornar um erro útil ao frontend.
      if (stdoutTrim) {
        try {
          const parsed = JSON.parse(stdoutTrim) as { error?: string };
          if (parsed?.error) errMsg = parsed.error;
        } catch {
          const lines = stdoutTrim.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('{')) continue;
            try {
              const parsed = JSON.parse(trimmed) as { error?: string };
              if (parsed?.error) {
                errMsg = parsed.error;
                break;
              }
            } catch {
              continue;
            }
          }
        }
      }
      if (errMsg.startsWith('Python exit code') && stderrTrim) {
        // Fallback final: usa a última linha útil do stderr.
        const lastErrLine = stderrTrim.split('\n').map((l) => l.trim()).filter(Boolean).pop();
        if (lastErrLine) errMsg = lastErrLine;
      }

      ssePublish(jobId, 'failed', { error: errMsg });
      setPdfExtractJob(jobId, {
        status: 'failed',
        error: errMsg,
        createdAt: Date.now()
      }).then(cleanup);
      return;
    }

    logger.info('PdfExtract.background: processo Python concluído com sucesso', {
      jobId,
      code
    });

    type PyResult = {
      success?: boolean;
      // campos legados (versões antigas do script)
      dominios?: string[];
      dominios_bruto?: string[];
      total?: number;
      total_bruto?: number;
      // campos atuais do script (versão com colunas específicas)
      dominios_bloqueados?: string[];
      novos_dominios?: string[];
      url_host?: string[];
      ip_host?: string[];
      total_dominios_bloqueados?: number;
      total_novos_dominios?: number;
      total_url_host?: number;
      total_ip_host?: number;
      data_inicio_bloqueio?: string | null;
      data_fim_bloqueio?: string | null;
      error?: string;
    };
    let result: PyResult | null = null;
    try {
      result = JSON.parse(stdout);
    } catch {
      const lines = stdout.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('{')) {
          try {
            result = JSON.parse(trimmed);
            break;
          } catch {
            continue;
          }
        }
      }
    }

    if (result && result.success) {
      // Suporte ao formato atual do script (colunas específicas) e legado (dominios direto)
      const novos = result.novos_dominios ?? [];
      const bloqueados = result.dominios_bloqueados ?? [];
      const urlHost = result.url_host ?? [];
      const ipHost = result.ip_host ?? [];

      // Combinação de todos os itens extraídos (sem duplicatas), mantendo ordem: novos → url_host → ip_host → já bloqueados
      const todosDedup = [...new Set([...novos, ...urlHost, ...ipHost, ...bloqueados])];

      const dominios = result.dominios ?? todosDedup;
      const dominiosBruto = result.dominios_bruto ?? todosDedup;

      const jobResult = {
        dominios,
        dominios_bruto: dominiosBruto,
        total: result.total ?? dominios.length,
        total_bruto: result.total_bruto ?? dominiosBruto.length,
        data_inicio_bloqueio: result.data_inicio_bloqueio ?? undefined,
        data_fim_bloqueio: result.data_fim_bloqueio ?? undefined
      };
      ssePublish(jobId, 'completed', { result: jobResult });
      setPdfExtractJob(jobId, {
        status: 'completed',
        result: jobResult,
        createdAt: Date.now()
      }).then(cleanup);
    } else {
      const errMsg = result?.error ?? 'Erro ao extrair domínios';
      ssePublish(jobId, 'failed', { error: errMsg });
      setPdfExtractJob(jobId, {
        status: 'failed',
        error: errMsg,
        createdAt: Date.now()
      }).then(cleanup);
    }
  });

  proc.on('error', (err) => {
    logger.error('PdfExtract.background: erro ao iniciar Python', { jobId, error: err.message });
    setPdfExtractJob(jobId, {
      status: 'failed',
      error: err.message ?? 'Erro ao iniciar processamento',
      createdAt: Date.now()
    }).then(() => {
      fs.unlink(tempFilePath).catch(() => {});
    });
  });
}

class PdfExtractController {
  /**
   * Upload de PDF e início do processamento assíncrono (evita timeout Cloudflare).
   * Retorna jobId imediatamente; frontend consulta GET /pdf-extract/status/:jobId até status !== 'processing'.
   * POST /api/pdf-extract/extract
   */
  async extractFromPdf(req: Request, res: Response): Promise<void> {
    try {
      if (!isRedisAvailable()) {
        sendError(res, new Error('Processamento assíncrono indisponível'), 'Redis não configurado. Defina REDIS_URL.', 503, true, {
          context: 'PdfExtractController',
          action: 'extractFromPdf'
        });
        return;
      }

      if (!req.file) {
        sendError(res, new Error('Nenhum arquivo PDF foi enviado'), 'Nenhum arquivo PDF foi enviado', 400, true, {
          context: 'PdfExtractController',
          action: 'extractFromPdf',
          reason: 'no_file'
        });
        return;
      }

      const jobId = `pdf-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      const uploadsDir = '/tmp/backnet-pdf';
      await fs.mkdir(uploadsDir, { recursive: true });
      const tempFileName = `job-${jobId}.pdf`;
      const tempFilePath = path.join(uploadsDir, tempFileName);

      await fs.writeFile(tempFilePath, req.file.buffer);

      await setPdfExtractJob(jobId, {
        status: 'processing',
        createdAt: Date.now()
      });

      const scriptPath = path.join(__dirname, relativeToRoot, 'scripts/extrair-dominios.py');
      logger.info('PdfExtract.extractFromPdf: job criado, disparando Python em background', { jobId, fileSize: req.file.buffer.length });

      runPythonInBackground(scriptPath, tempFilePath, jobId);

      sendSuccess(res, { jobId }, undefined, 202);
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      logger.error('PdfExtract.extractFromPdf: exceção', {
        context: 'PdfExtractController',
        action: 'extractFromPdf',
        message: err.message
      });
      sendError(res, error, err.message ?? 'Erro ao iniciar processamento do PDF', 500, true, {
        context: 'PdfExtractController',
        action: 'extractFromPdf'
      });
    }
  }

  /**
   * Consulta status e resultado do job de extração (polling).
   * GET /api/pdf-extract/status/:jobId
   */
  async getJobStatus(req: Request, res: Response): Promise<void> {
    const jobId = req.params.jobId as string;
    if (!jobId?.trim()) {
      sendError(res, new Error('jobId obrigatório'), 'jobId obrigatório', 400, true, {
        context: 'PdfExtractController',
        action: 'getJobStatus'
      });
      return;
    }

    const state = await getPdfExtractJob(jobId.trim());
    if (!state) {
      sendError(res, new Error('Job não encontrado'), 'Job não encontrado ou expirado', 404, false, {
        context: 'PdfExtractController',
        action: 'getJobStatus',
        jobId
      });
      return;
    }

    const payload: { status: string; progress?: { current: number; total: number }; progressLog?: Array<{ current: number; total: number }>; result?: unknown; error?: string } = {
      status: state.status
    };
    if (state.status === 'processing') {
      if (state.progress) payload.progress = state.progress;
      if (state.progressLog?.length) payload.progressLog = state.progressLog;
    }
    if (state.status === 'completed' && state.result) payload.result = state.result;
    if (state.status === 'failed' && state.error) payload.error = state.error;
    sendSuccess(res, payload);
  }

  /**
   * SSE: stream de progresso em tempo real do job de extração.
   * GET /api/pdf-extract/progress/:jobId
   *
   * Emite eventos SSE:
   *   event: progress  data: { current, total }
   *   event: completed data: { result }
   *   event: failed    data: { error }
   *
   * Ao conectar, reenvia o histórico já acumulado no Redis e depois mantém
   * a conexão aberta para receber eventos futuros via ssePublish().
   */
  async streamProgress(req: Request, res: Response): Promise<void> {
    const jobId = (req.params.jobId as string)?.trim();
    if (!jobId) {
      res.status(400).end('jobId obrigatório');
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Nginx: desabilita buffer
    res.flushHeaders();

    // Ping inicial para abrir o tubo imediatamente (força flush no cliente)
    sseWrite(res, ': connected\n\n');

    // Reenvia histórico acumulado (para reconexões ou clientes que chegaram tarde)
    const state = await getPdfExtractJob(jobId);
    if (state) {
      if (state.progressLog?.length) {
        for (const p of state.progressLog) {
          sseWrite(res, `event: progress\ndata: ${JSON.stringify(p)}\n\n`);
        }
      }
      if (state.status === 'completed' && state.result) {
        sseWrite(res, `event: completed\ndata: ${JSON.stringify({ result: state.result })}\n\n`);
        res.end();
        return;
      }
      if (state.status === 'failed') {
        sseWrite(res, `event: failed\ndata: ${JSON.stringify({ error: state.error })}\n\n`);
        res.end();
        return;
      }
    }

    // Registra cliente para receber eventos futuros
    sseRegister(jobId, res);

    // Keep-alive a cada 15s para evitar timeout de proxy
    const keepAlive = setInterval(() => {
      sseWrite(res, ': keep-alive\n\n');
    }, 15000);

    req.on('close', () => {
      clearInterval(keepAlive);
      sseUnregister(jobId, res);
    });
  }

  /**
   * Inicia extração de domínios a partir de URL (assíncrono).
   * Retorna jobId; frontend faz polling em GET /pdf-extract/status/:jobId.
   * POST /api/pdf-extract/extract-from-url
   */
  async extractFromPdfUrl(req: Request, res: Response): Promise<void> {
    try {
      if (!isRedisAvailable()) {
        sendError(res, new Error('Processamento assíncrono indisponível'), 'Redis não configurado. Defina REDIS_URL.', 503, true, {
          context: 'PdfExtractController',
          action: 'extractFromPdfUrl'
        });
        return;
      }

      const { url } = req.body as { url?: string };
      if (!url || typeof url !== 'string' || !url.trim()) {
        sendError(res, new Error('URL do PDF é obrigatória'), 'URL do PDF é obrigatória', 400, true, {
          context: 'PdfExtractController',
          action: 'extractFromPdfUrl',
          reason: 'no_url'
        });
        return;
      }

      const urlTrimmed = url.trim();
      if (!urlTrimmed.startsWith('http://') && !urlTrimmed.startsWith('https://')) {
        sendError(res, new Error('URL inválida'), 'Informe uma URL válida (http ou https)', 400, true, {
          context: 'PdfExtractController',
          action: 'extractFromPdfUrl',
          reason: 'invalid_url'
        });
        return;
      }

      const jobId = `pdf-url-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      await setPdfExtractJob(jobId, {
        status: 'processing',
        createdAt: Date.now()
      });

      logger.info('PdfExtract.extractFromPdfUrl: job criado, processamento em background', { jobId, url: urlTrimmed });

      setImmediate(() => {
        runExtractFromUrlBackground(jobId, urlTrimmed).catch((err) => {
          logger.error('PdfExtract.extractFromPdfUrl.background', { jobId, error: err instanceof Error ? err.message : String(err) });
          setPdfExtractJob(jobId, {
            status: 'failed',
            error: err instanceof Error ? err.message : String(err),
            createdAt: Date.now()
          });
        });
      });

      sendSuccess(res, { jobId }, undefined, 202);
    } catch (error: unknown) {
      const err = error as { message?: string };
      sendError(res, error, err.message ?? 'Erro ao iniciar processamento', 500, true, {
        context: 'PdfExtractController',
        action: 'extractFromPdfUrl'
      });
    }
  }
}

export default new PdfExtractController();
