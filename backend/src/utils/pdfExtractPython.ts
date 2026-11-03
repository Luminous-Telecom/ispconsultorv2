import fs from 'fs';
import path from 'path';

export type PdfExtractPython = {
  command: string;
  env: NodeJS.ProcessEnv;
};

function findBackendRoot(startDir: string): string | null {
  let dir = path.resolve(startDir);
  for (let i = 0; i < 10; i++) {
    const isBackend =
      fs.existsSync(path.join(dir, 'package.json'))
      && fs.existsSync(path.join(dir, 'python', 'requirements.txt'));
    if (isBackend) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Python que roda extrair-sei-anatel.py e extrair-dominios.py.
 * PDF_EXTRACT_PYTHON tem prioridade. Sem a variável, usa backend/.venv
 * (criado no build) ou o wheel em backend/.python-packages.
 */
export function resolvePdfExtractPython(startDir: string): PdfExtractPython {
  const fromEnv = process.env.PDF_EXTRACT_PYTHON?.trim();
  if (fromEnv) return { command: fromEnv, env: process.env };

  const backendRoot = findBackendRoot(startDir);
  if (backendRoot) {
    const venvPython = path.join(backendRoot, '.venv', 'bin', 'python');
    if (fs.existsSync(venvPython)) return { command: venvPython, env: process.env };

    const packages = path.join(backendRoot, '.python-packages');
    if (fs.existsSync(path.join(packages, 'pymupdf', '__init__.py'))) {
      const current = process.env.PYTHONPATH;
      const pythonPath = current ? `${packages}${path.delimiter}${current}` : packages;
      return { command: 'python3', env: { ...process.env, PYTHONPATH: pythonPath } };
    }
  }

  return { command: 'python3', env: process.env };
}
