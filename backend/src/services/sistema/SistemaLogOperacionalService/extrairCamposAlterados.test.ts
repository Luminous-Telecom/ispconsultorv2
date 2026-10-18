import { extrairCamposAlteradosParaPayload } from './index';

describe('extrairCamposAlteradosParaPayload', () => {
  it('grava só o valor novo do campo alterado', () => {
    const { dados_novos } = extrairCamposAlteradosParaPayload(
      { nome: 'Antigo', ativo: true },
      { nome: 'Novo', ativo: true }
    );
    expect(dados_novos).toEqual({ nome: 'Novo' });
    expect(Object.prototype.hasOwnProperty.call(dados_novos, 'ativo')).toBe(false);
  });

  it('grava null quando o valor novo é limpo', () => {
    const { dados_novos } = extrairCamposAlteradosParaPayload(
      { descricao: 'texto' },
      { descricao: null }
    );
    expect(dados_novos).toEqual({ descricao: null });
  });
});
