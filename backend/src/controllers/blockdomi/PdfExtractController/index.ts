import { Request, Response } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { sendError, sendSuccess } from '../../../utils/responseUtils';
import { logger } from '../../../utils/logger';

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

class PdfExtractController {
  /**
   * Extrai domínios de um PDF usando script Python (pdfplumber)
   * POST /api/blockdomi/pdf-extract
   */
  async extractFromPdf(req: Request, res: Response): Promise<void> {
    let tempFilePath: string | null = null;

    try {
      logger.info('PdfExtract.extractFromPdf: início', {
        hasFile: !!req.file,
        fileSize: req.file?.buffer?.length
      });

      if (!req.file) {
        sendError(res, new Error('Nenhum arquivo PDF foi enviado'), 'Nenhum arquivo PDF foi enviado', 400, true, {
          context: 'PdfExtractController',
          action: 'extractFromPdf',
          reason: 'no_file'
        });
        return;
      }

      const uploadsDir = path.join(__dirname, relativeToRoot, 'uploads/temp');
      await fs.mkdir(uploadsDir, { recursive: true });

      const tempFileName = `pdf-${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`;
      tempFilePath = path.join(uploadsDir, tempFileName);

      await fs.writeFile(tempFilePath, req.file.buffer);

      const scriptPath = path.join(__dirname, relativeToRoot, 'scripts/extrair-dominios.py');
      logger.info('PdfExtract.extractFromPdf: executando script Python', {
        scriptPath,
        tempFilePath,
        fileSize: req.file.buffer.length
      });

      let stdout: string;
      let stderr: string | undefined;
      try {
        const result = await runPythonScript(scriptPath, tempFilePath, 300000);
        stdout = result.stdout;
        stderr = result.stderr;
      } catch (execErr: unknown) {
        const execError = execErr as { stdout?: string; stderr?: string; code?: string | number; killed?: boolean; message?: string };
        stderr = execError.stderr;
        const pyStderr = (execError.stderr || '').trim();
        const pyStdout = (execError.stdout || '').trim();
        if (pyStderr) logger.error(`PdfExtract.extractFromPdf: Python stderr: ${pyStderr}`);
        if (pyStdout) logger.error(`PdfExtract.extractFromPdf: Python stdout: ${pyStdout.substring(0, 800)}`);
        logger.error('PdfExtract.extractFromPdf: falha ao executar Python', {
          context: 'PdfExtractController',
          action: 'extractFromPdf',
          scriptPath,
          tempFilePath,
          exitCode: execError.code,
          killed: execError.killed,
          stdout: execError.stdout,
          stderr: execError.stderr,
          message: execError.message
        });
        throw execErr;
      }

      if (stderr && stderr.trim()) {
        logger.warn('PdfExtract.extractFromPdf: stderr do Python', { stderr });
      }

      const result = JSON.parse(stdout);

      if (!result.success) {
        logger.error('PdfExtract.extractFromPdf: script retornou success=false', {
          context: 'PdfExtractController',
          action: 'extractFromPdf',
          error: result.error,
          stdout: stdout.substring(0, 500)
        });
        sendError(res, new Error(result.error || 'Erro ao extrair domínios'), result.error || 'Erro ao extrair domínios', 500, true, {
          context: 'PdfExtractController',
          action: 'extractFromPdf',
          pythonError: result.error
        });
        return;
      }

      logger.info('PdfExtract.extractFromPdf: sucesso', { total: result.total });
      sendSuccess(res, {
        dominios: result.dominios,
        total: result.total,
        message: `${result.total} domínios extraídos com sucesso`
      });
    } catch (error: unknown) {
      const err = error as { code?: string; killed?: boolean; message?: string; stdout?: string; stderr?: string };

      logger.error('PdfExtract.extractFromPdf: exceção capturada', {
        context: 'PdfExtractController',
        action: 'extractFromPdf',
        code: err.code,
        killed: err.killed,
        message: err.message,
        stdout: err.stdout,
        stderr: err.stderr,
        stack: error instanceof Error ? error.stack : undefined
      });

      if (err.code === 'ENOENT') {
        sendError(res, error, 'Python 3 não está instalado ou script não encontrado', 500, true, {
          context: 'PdfExtractController',
          action: 'extractFromPdf',
          code: err.code
        });
      } else if (err.killed) {
        sendError(res, error, 'Processamento do PDF excedeu o tempo limite', 408, true, {
          context: 'PdfExtractController',
          action: 'extractFromPdf',
          killed: true
        });
      } else {
        sendError(res, error, `Erro ao processar PDF: ${err.message || 'Erro desconhecido'}`, 500, true, {
          context: 'PdfExtractController',
          action: 'extractFromPdf',
          message: err.message,
          stderr: err.stderr
        });
      }
    } finally {
      // Remove arquivo temporário
      if (tempFilePath) {
        try {
          await fs.unlink(tempFilePath);
        } catch (err) {
          console.error('Erro ao remover arquivo temporário:', err);
        }
      }
    }
  }

  /**
   * Extrai domínios de um PDF a partir de URL
   * POST /api/pdf-extract/extract-from-url
   */
  async extractFromPdfUrl(req: Request, res: Response): Promise<void> {
    let tempFilePath: string | null = null;

    try {
      const { url } = req.body as { url?: string };
      logger.info('PdfExtract.extractFromPdfUrl: início', {
        hasUrl: !!url,
        urlLength: typeof url === 'string' ? url.length : 0
      });

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

      logger.info('PdfExtract.extractFromPdfUrl: baixando PDF', { url: urlTrimmed });
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      const response = await fetch(urlTrimmed, {
        headers: { 'User-Agent': 'BackNet-ERP/1.0' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      logger.info('PdfExtract.extractFromPdfUrl: resposta recebida', {
        status: response.status,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
      });

      if (!response.ok) {
        sendError(res, new Error(`Falha ao baixar PDF: ${response.status}`), `Não foi possível baixar o PDF (${response.status})`, 400, true, {
          context: 'PdfExtractController',
          action: 'extractFromPdfUrl',
          status: response.status,
          url: urlTrimmed
        });
        return;
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/pdf') && !contentType.includes('octet-stream')) {
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength > 4) {
          const header = Buffer.from(buffer.slice(0, 4));
          const pdfHeader = Buffer.from([0x25, 0x50, 0x44, 0x46]);
          if (!header.equals(pdfHeader)) {
            sendError(res, new Error('O conteúdo não parece ser um PDF válido'), 'O URL não retornou um PDF válido', 400, true, {
              context: 'PdfExtractController',
              action: 'extractFromPdfUrl',
              reason: 'not_pdf',
              contentType
            });
            return;
          }
        }
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      logger.info('PdfExtract.extractFromPdfUrl: PDF baixado', { size: buffer.length });

      const uploadsDir = path.join(__dirname, relativeToRoot, 'uploads/temp');
      await fs.mkdir(uploadsDir, { recursive: true });
      const tempFileName = `pdf-url-${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`;
      tempFilePath = path.join(uploadsDir, tempFileName);
      await fs.writeFile(tempFilePath, buffer);

      const scriptPath = path.join(__dirname, relativeToRoot, 'scripts/extrair-dominios.py');
      logger.info('PdfExtract.extractFromPdfUrl: executando script Python', { scriptPath, tempFilePath });

      let stdout: string;
      try {
        const execResult = await runPythonScript(scriptPath, tempFilePath, 300000);
        stdout = execResult.stdout;
        if (execResult.stderr && execResult.stderr.trim()) {
          logger.warn('PdfExtract.extractFromPdfUrl: stderr do Python', { stderr: execResult.stderr });
        }
      } catch (execErr: unknown) {
        const execError = execErr as { stdout?: string; stderr?: string; code?: string | number; killed?: boolean; message?: string };
        const pyStderr = (execError.stderr || '').trim();
        const pyStdout = (execError.stdout || '').trim();
        if (pyStderr) logger.error(`PdfExtract.extractFromPdfUrl: Python stderr: ${pyStderr}`);
        if (pyStdout) logger.error(`PdfExtract.extractFromPdfUrl: Python stdout: ${pyStdout.substring(0, 800)}`);
        logger.error('PdfExtract.extractFromPdfUrl: falha ao executar Python', {
          context: 'PdfExtractController',
          action: 'extractFromPdfUrl',
          scriptPath,
          tempFilePath,
          exitCode: execError.code,
          killed: execError.killed,
          stdout: execError.stdout,
          stderr: execError.stderr,
          message: execError.message
        });
        throw execErr;
      }

      const result = JSON.parse(stdout);
      if (!result.success) {
        logger.error('PdfExtract.extractFromPdfUrl: script retornou success=false', {
          context: 'PdfExtractController',
          action: 'extractFromPdfUrl',
          error: result.error,
          stdout: stdout.substring(0, 500)
        });
        sendError(res, new Error(result.error || 'Erro ao extrair domínios'), result.error || 'Erro ao extrair domínios', 500, true, {
          context: 'PdfExtractController',
          action: 'extractFromPdfUrl',
          pythonError: result.error
        });
        return;
      }

      logger.info('PdfExtract.extractFromPdfUrl: sucesso', { total: result.total });
      sendSuccess(res, {
        dominios: result.dominios,
        total: result.total,
        message: `${result.total} domínios extraídos com sucesso`
      });
    } catch (error: unknown) {
      const err = error as { name?: string; code?: string; killed?: boolean; message?: string; stdout?: string; stderr?: string };

      logger.error('PdfExtract.extractFromPdfUrl: exceção capturada', {
        context: 'PdfExtractController',
        action: 'extractFromPdfUrl',
        name: err.name,
        code: err.code,
        killed: err.killed,
        message: err.message,
        stdout: err.stdout,
        stderr: err.stderr,
        stack: error instanceof Error ? error.stack : undefined
      });

      if (err.name === 'AbortError' || err.name === 'TimeoutError') {
        sendError(res, error, 'Tempo limite excedido ao baixar o PDF', 408, true, {
          context: 'PdfExtractController',
          action: 'extractFromPdfUrl',
          reason: 'timeout'
        });
      } else if (err.code === 'ENOENT') {
        sendError(res, error, 'Python 3 não está instalado ou script não encontrado', 500, true, {
          context: 'PdfExtractController',
          action: 'extractFromPdfUrl',
          code: err.code
        });
      } else if (err.killed) {
        sendError(res, error, 'Processamento do PDF excedeu o tempo limite', 408, true, {
          context: 'PdfExtractController',
          action: 'extractFromPdfUrl',
          killed: true
        });
      } else {
        sendError(res, error, `Erro ao processar PDF: ${err.message || 'Erro desconhecido'}`, 500, true, {
          context: 'PdfExtractController',
          action: 'extractFromPdfUrl',
          message: err.message,
          stderr: err.stderr
        });
      }
    } finally {
      if (tempFilePath) {
        try {
          await fs.unlink(tempFilePath);
        } catch (e) {
          console.error('Erro ao remover arquivo temporário:', e);
        }
      }
    }
  }
}

export default new PdfExtractController();
