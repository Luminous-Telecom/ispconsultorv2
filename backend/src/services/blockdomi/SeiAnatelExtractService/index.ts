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

export type SeiExtractResult = { success: boolean; sei?: string; message?: string };

/**
 * Extrai o número SEI do ofício Anatel a partir do texto do PDF (últimas páginas / código verificador).
 */
export class SeiAnatelExtractService {
  static async extractFromPdfPath(pdfPath: string): Promise<SeiExtractResult> {
    const scriptPath = path.join(__dirname, relativeToRoot, 'python/extrair-sei-anatel.py');
    const { stdout } = await runPythonSeiExtract(scriptPath, pdfPath, 60000);
    const line = stdout.trim().split(/\r?\n/).filter(Boolean).pop() ?? stdout.trim();
    try {
      const parsed = JSON.parse(line) as SeiExtractResult;
      if (parsed && typeof parsed.success === 'boolean') {
        return parsed;
      }
    } catch {
      /* ignore */
    }
    return { success: false, message: 'Resposta inválida do extrator SEI' };
  }
}
