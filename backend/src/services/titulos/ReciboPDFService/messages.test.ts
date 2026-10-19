import { RECIBO_MODELO_NAO_CONFIGURADO } from './messages';

describe('RECIBO_MODELO_NAO_CONFIGURADO', () => {
  it('mantém a mensagem usada nos logs e no histórico WhatsApp', () => {
    expect(RECIBO_MODELO_NAO_CONFIGURADO).toBe(
      'Modelo de recibo não configurado no modelo de contrato'
    );
  });
});
