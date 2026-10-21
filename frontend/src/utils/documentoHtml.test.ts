import { decodeEscapedDocumentHtml, normalizeDocumentImageUrls, prepareDocumentEditorHtml } from './documentoHtml';

describe('documentoHtml', () => {
  it('mantém HTML real sem apagar as tags', () => {
    const html = '<table><tr><td>Contrato</td></tr></table>';
    expect(decodeEscapedDocumentHtml(html)).toBe(html);
  });

  it('decodifica HTML escapado duas vezes', () => {
    const escaped = '&amp;lt;p&amp;gt;Contrato&amp;lt;/p&amp;gt;';
    expect(decodeEscapedDocumentHtml(escaped)).toBe('<p>Contrato</p>');
  });

  it('troca o caminho antigo uploads pelo de arquivos', () => {
    const html = '<img src="uploads/documentos/assinatura.png" alt="">';
    expect(normalizeDocumentImageUrls(html)).toBe('<img src="/arquivos/documentos/assinatura.png" alt="">');
  });

  it('troca URL absoluta de arquivos por caminho do sistema', () => {
    const html = '<img src="http://consultor.ispvision.com.br/arquivos/documentos/logo.png" alt="logo">';
    expect(normalizeDocumentImageUrls(html)).toBe('<img src="/arquivos/documentos/logo.png" alt="logo">');
  });

  it('prepara o editor: remove blob, decodifica e normaliza a imagem', () => {
    const html = '<img src="blob:https://app/111"><img src="https://backnet.app/arquivos/documentos/assinatura.png">';
    expect(prepareDocumentEditorHtml(html)).toBe('<img src="/arquivos/documentos/assinatura.png">');
  });
});
