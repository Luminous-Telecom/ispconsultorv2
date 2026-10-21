import fs from 'fs';
import { inlineArquivosImages } from './inlineArquivosImages';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

jest.mock('../../utils/pathUtils', () => ({
  resolveArquivosPath: (...parts: string[]) =>
    parts.length ? `/data/arquivos/${parts.join('/')}` : '/data/arquivos',
}));

const existsSync = fs.existsSync as jest.Mock;
const readFileSync = fs.readFileSync as jest.Mock;

describe('inlineArquivosImages', () => {
  beforeEach(() => {
    existsSync.mockReset();
    readFileSync.mockReset();
  });

  it('embute imagem local e mantém a que não existe', () => {
    existsSync.mockImplementation((filePath: string) => String(filePath).endsWith('logo.png'));
    readFileSync.mockReturnValue(Buffer.from('png'));

    const html = [
      '<img src="http://consultor.ispvision.com.br/arquivos/documentos/logo.png" alt="l">',
      '<img src="http://consultor.ispvision.com.br/arquivos/documentos/falta.png">',
    ].join('');

    const result = inlineArquivosImages(html);

    expect(result).toContain('src="data:image/png;base64,');
    expect(result).toContain('falta.png');
    expect(readFileSync).toHaveBeenCalledTimes(1);
  });

  it('não lê caminho fora da pasta de arquivos', () => {
    const html = '<img src="/arquivos/../segredo.png">';
    expect(inlineArquivosImages(html)).toBe(html);
    expect(readFileSync).not.toHaveBeenCalled();
  });
});
