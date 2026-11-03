import { spawn } from 'child_process';
import path from 'path';

function getPdfExtractPython(): string {
  return process.env.PDF_EXTRACT_PYTHON?.trim() || 'python3';
}

const isDist = __dirname.includes(`${path.sep}dist${path.sep}`);
const relativeToRoot = isDist ? '../../../' : '../../../../';

function runPythonSeiExtract(scriptPath: string, pdfPath: string, timeoutMs: number): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(getPdfExtractPython(), [scriptPath, pdfPath]);
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    const t = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(Object.assign(new Error('Timeout ao extrair SEI'), { stdout, stderr, code: null, killed: true }));
    }, timeoutMs);
    proc.on('close', (code, signal) => {
      clearTimeout(t);
      if (signal) {
        reject(Object.assign(new Error(`Processo finalizado por signal: ${signal}`), { stdout, stderr, code, killed: true }));
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

export type SeiExtractResult = { success: boolean; sei?: string; message?: string };

export function parseSeiStdout(stdout: string): SeiExtractResult | null {
  const line = stdout.trim().split(/\r?\n/).filter(Boolean).pop() ?? '';
  if (!line) return null;
  try {
    const parsed = JSON.parse(line) as SeiExtractResult;
    if (parsed && typeof parsed.success === 'boolean') return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function detalheStderr(stderr: string): string {
  return stderr.trim().split(/\r?\n/).map((linha) => linha.trim()).filter(Boolean).pop() ?? '';
}

/**
 * Extrai o número SEI do ofício Anatel (código verificador, cabeçalho SEI/ANATEL ou referência SEI nº).
 */
export class SeiAnatelExtractService {
  static async extractFromPdfPath(pdfPath: string): Promise<SeiExtractResult> {
    const scriptPath = path.join(__dirname, relativeToRoot, 'python/extrair-sei-anatel.py');
    const { stdout, stderr, code } = await runPythonSeiExtract(scriptPath, pdfPath, 60000);
    const parsed = parseSeiStdout(stdout);
    if (parsed) return parsed;
    if (code !== 0) {
      const detalhe = detalheStderr(stderr);
      return {
        success: false,
        message: detalhe ? `Python exit code ${code}: ${detalhe}` : `Python exit code ${code}`,
      };
    }
    return { success: false, message: 'Resposta inválida do extrator SEI' };
  }
}
