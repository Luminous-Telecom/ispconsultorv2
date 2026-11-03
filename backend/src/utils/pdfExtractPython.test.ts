import fs from 'fs';
import os from 'os';
import path from 'path';
import { resolvePdfExtractPython } from './pdfExtractPython';

function backendFalso(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-py-'));
  fs.mkdirSync(path.join(root, 'python'), { recursive: true });
  fs.writeFileSync(path.join(root, 'package.json'), '{}');
  fs.writeFileSync(path.join(root, 'python', 'requirements.txt'), 'pymupdf\n');
  return root;
}

describe('resolvePdfExtractPython', () => {
  const anterior = process.env.PDF_EXTRACT_PYTHON;
  const dirs: string[] = [];

  afterEach(() => {
    if (anterior === undefined) delete process.env.PDF_EXTRACT_PYTHON;
    else process.env.PDF_EXTRACT_PYTHON = anterior;
    while (dirs.length > 0) {
      fs.rmSync(dirs.pop() as string, { recursive: true, force: true });
    }
  });

  it('usa PDF_EXTRACT_PYTHON quando a variável está definida', () => {
    process.env.PDF_EXTRACT_PYTHON = '/opt/venv/bin/python';
    expect(resolvePdfExtractPython('/tmp')).toEqual({
      command: '/opt/venv/bin/python',
      env: process.env,
    });
  });

  it('ignora PDF_EXTRACT_PYTHON em branco e cai no python3', () => {
    process.env.PDF_EXTRACT_PYTHON = '   ';
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-py-vazio-'));
    dirs.push(root);
    expect(resolvePdfExtractPython(root)).toEqual({
      command: 'python3',
      env: process.env,
    });
  });

  it('prefere o .venv do backend a partir do dist de produção', () => {
    delete process.env.PDF_EXTRACT_PYTHON;
    const root = backendFalso();
    dirs.push(root);
    const bin = path.join(root, '.venv', 'bin');
    fs.mkdirSync(bin, { recursive: true });
    const py = path.join(bin, 'python');
    fs.writeFileSync(py, '');
    const start = path.join(root, 'dist', 'src', 'services', 'blockdomi');
    fs.mkdirSync(start, { recursive: true });

    expect(resolvePdfExtractPython(start).command).toBe(py);
  });

  it('aponta o python3 para o wheel em .python-packages quando não há venv', () => {
    delete process.env.PDF_EXTRACT_PYTHON;
    const root = backendFalso();
    dirs.push(root);
    const pacote = path.join(root, '.python-packages', 'pymupdf');
    fs.mkdirSync(pacote, { recursive: true });
    fs.writeFileSync(path.join(pacote, '__init__.py'), '');

    const resolved = resolvePdfExtractPython(path.join(root, 'src'));
    expect(resolved.command).toBe('python3');
    expect(resolved.env.PYTHONPATH?.split(path.delimiter)[0]).toBe(path.join(root, '.python-packages'));
  });

  it('usa python3 quando o backend não tem pymupdf instalado', () => {
    delete process.env.PDF_EXTRACT_PYTHON;
    const root = backendFalso();
    dirs.push(root);
    expect(resolvePdfExtractPython(path.join(root, 'src'))).toEqual({
      command: 'python3',
      env: process.env,
    });
  });
});
