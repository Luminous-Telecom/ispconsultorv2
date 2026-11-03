import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { SeiAnatelExtractService } from './index';

const python = process.env.PDF_EXTRACT_PYTHON?.trim() || 'python3';

function criarPdf(corpo: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sei-anatel-'));
  const pdf = path.join(dir, 'oficio.pdf');
  const run = spawnSync(python, ['-c', corpo.replace('__PDF__', pdf)], { encoding: 'utf8' });
  if (run.status !== 0) {
    throw new Error(run.stderr || run.stdout || 'falha ao gerar pdf de teste');
  }
  return pdf;
}

function apagarPdf(pdf: string): void {
  fs.rmSync(path.dirname(pdf), { recursive: true, force: true });
}

describe('SeiAnatelExtractService', () => {
  const criados: string[] = [];

  afterEach(() => {
    while (criados.length > 0) {
      apagarPdf(criados.pop() as string);
    }
  });

  it('lê o código verificador com ligadura nas primeiras páginas, mesmo com a lista no restante do PDF', async () => {
    const pdf = criarPdf(String.raw`
import pymupdf as fitz
doc = fitz.open()
p = doc.new_page()
p.insert_htmlbox(p.rect, "<p>informando o c\u00f3digo veri\ufb01cador 15497675 e o c\u00f3digo CRC ABCD1234.</p>")
for i in range(14):
    extra = doc.new_page()
    extra.insert_htmlbox(extra.rect, "<p>dominio%d.com 192.0.2.1</p>" % i)
doc.save("__PDF__")
doc.close()
`);
    criados.push(pdf);

    const result = await SeiAnatelExtractService.extractFromPdfPath(pdf);

    expect(result).toEqual({ success: true, sei: '15497675' });
  });

  it('prefere o código verificador quando o corpo cita outro SEI nº', async () => {
    const pdf = criarPdf(String.raw`
import pymupdf as fitz
doc = fitz.open()
p = doc.new_page()
p.insert_text((72, 72), "conforme SEI no 11111111\ninformando o codigo verificador 15497675")
for i in range(6):
    extra = doc.new_page()
    extra.insert_text((72, 72), "SEI no 99999999 dominio%d.com" % i)
doc.save("__PDF__")
doc.close()
`);
    criados.push(pdf);

    const result = await SeiAnatelExtractService.extractFromPdfPath(pdf);

    expect(result.success).toBe(true);
    expect(result.sei).toBe('15497675');
  });

  it('aceita o cabeçalho SEI/ANATEL e o verificador com dois-pontos', async () => {
    const cabecalho = criarPdf(String.raw`
import pymupdf as fitz
doc = fitz.open()
p = doc.new_page()
p.insert_htmlbox(p.rect, "<p>SEI/ANATEL - 16430998 - Of\u00edcio</p>")
doc.save("__PDF__")
doc.close()
`);
    const pontos = criarPdf(String.raw`
import pymupdf as fitz
doc = fitz.open()
p = doc.new_page()
p.insert_text((72, 72), "codigo verificador: 17000001")
doc.save("__PDF__")
doc.close()
`);
    criados.push(cabecalho, pontos);

    await expect(SeiAnatelExtractService.extractFromPdfPath(cabecalho)).resolves.toMatchObject({
      success: true,
      sei: '16430998',
    });
    await expect(SeiAnatelExtractService.extractFromPdfPath(pontos)).resolves.toMatchObject({
      success: true,
      sei: '17000001',
    });
  });

  it('usa o título do PDF quando o corpo não traz o número', async () => {
    const pdf = criarPdf(String.raw`
import pymupdf as fitz
doc = fitz.open()
p = doc.new_page()
p.insert_htmlbox(p.rect, "<p>lista de dominios exemplo.com</p>")
doc.set_metadata({"title": "SEI/ANATEL - 13193909 - Of\u00edcio"})
doc.save("__PDF__")
doc.close()
`);
    criados.push(pdf);

    const result = await SeiAnatelExtractService.extractFromPdfPath(pdf);

    expect(result).toEqual({ success: true, sei: '13193909' });
  });

  it('recusa PDF sem número SEI', async () => {
    const pdf = criarPdf(String.raw`
import pymupdf as fitz
doc = fitz.open()
p = doc.new_page()
p.insert_htmlbox(p.rect, "<p>apenas exemplo.com e 192.0.2.1</p>")
doc.save("__PDF__")
doc.close()
`);
    criados.push(pdf);

    const result = await SeiAnatelExtractService.extractFromPdfPath(pdf);

    expect(result.success).toBe(false);
    expect(result.sei).toBeUndefined();
  });
});
