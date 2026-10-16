import { idsSelecionadosParaReenvio } from './reenviarFalhasCobranca';

describe('idsSelecionadosParaReenvio', () => {
  it('sem seleção reenvia todas as falhas do canal', () => {
    expect(idsSelecionadosParaReenvio([])).toBeUndefined();
  });

  it('usa o id real e ignora mensagens que não falharam', () => {
    expect(idsSelecionadosParaReenvio([
      { id: 9001, historico_id_real: 15, status: 'erro' },
      { id: 4, status: 'enviada' },
    ])).toEqual([15]);
  });

  it('seleção só de envios ok não gera reenvio', () => {
    expect(idsSelecionadosParaReenvio([{ id: 4, status: 'enviada' }])).toEqual([]);
  });
});
