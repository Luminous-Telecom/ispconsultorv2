jest.mock('axios', () => require('../test/httpMock').createAxiosMockModule());

import PdfExtractService from './pdfExtract';
import { getHttp, ok, resetHttp } from '../test/httpMock';

describe('PdfExtractService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('envio do PDF não inclui empresa_id e falha sem job', async () => {
    const arquivo = new File(['%PDF'], 'oficio.pdf', { type: 'application/pdf' });
    getHttp().post.mockResolvedValue(ok({}));
    await expect(PdfExtractService.extractFromPdf(arquivo)).rejects.toThrow(/jobId/);
    const body = getHttp().post.mock.calls[0][1] as FormData;
    expect(body.get('pdf')).toBeTruthy();
    expect(body.get('empresa_id')).toBeNull();
    expect(String(getHttp().post.mock.calls[0][0])).toBe('/pdf-extract/extract');
  });

  it('URL em branco não inicia extração', async () => {
    getHttp().post.mockResolvedValue(ok({}));
    await expect(PdfExtractService.extractFromPdfUrl('   ')).rejects.toThrow(/jobId/);
    expect(getHttp().post.mock.calls[0][1]).toEqual({ url: '' });
  });
});
