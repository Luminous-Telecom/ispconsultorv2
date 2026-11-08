import { montarAgendaCobranca, TituloAgenda } from './montarAgendaCobranca';
import { passosAtivos } from './passosCobranca';

const titulo: TituloAgenda = {
  id: 7,
  numeroTitulo: 'FAT-7',
  valor: 80,
  clienteId: 3,
  clienteNome: 'Alfa Net',
  recebeEmail: true,
  recebeWhatsapp: false,
  dataVencimento: '2026-11-20',
};

const base = {
  hoje: '2026-11-07',
  dataInicio: '2026-11-07',
  dataFim: '2026-11-22',
  page: 1,
  limit: 15,
};

describe('montarAgendaCobranca', () => {
  it('agenda o aviso antes do vencimento só no canal que o cliente recebe', () => {
    const passos = passosAtivos(
      { antesVencimento: [10], mesmoDia: false, depoisVencimento: [] },
      [{ tipo: '10_dias_antes_vencimento', canal: 'email' }, { tipo: '10_dias_antes_vencimento', canal: 'whatsapp' }]
    );
    const agenda = montarAgendaCobranca({ ...base, titulos: [titulo], passos });
    expect(agenda.sem_passos).toBe(false);
    expect(agenda.itens).toEqual([
      expect.objectContaining({
        id: '7:10_dias_antes_vencimento:email',
        data_envio: '2026-11-10',
        situacao: 'vai_sair',
        canal: 'email',
        cliente: 'Alfa Net',
      }),
    ]);
  });

  it('marca sai hoje, já passou e deixa aviso fora do período de fora', () => {
    const passos = passosAtivos(
      { antesVencimento: [2], mesmoDia: true, depoisVencimento: [1] },
      [
        { tipo: '02_dias_antes_vencimento', canal: 'email' },
        { tipo: 'mesmo_dia_vencimento', canal: 'email' },
        { tipo: '01_dias_depois_vencimento', canal: 'email' },
      ]
    );
    const agenda = montarAgendaCobranca({
      ...base,
      hoje: '2026-11-20',
      dataInicio: '2026-11-18',
      dataFim: '2026-11-20',
      titulos: [titulo],
      passos,
    });
    const situacoes = Object.fromEntries(agenda.itens.map((item) => [item.tipo_mensagem, item.situacao]));
    expect(situacoes['02_dias_antes_vencimento']).toBe('ja_passou');
    expect(situacoes.mesmo_dia_vencimento).toBe('sai_hoje');
    expect(situacoes['01_dias_depois_vencimento']).toBeUndefined();
  });

  it('filtra pelo cliente, pagina e avisa quando não há passo ativo', () => {
    const passos = passosAtivos({ antesVencimento: [5], mesmoDia: false, depoisVencimento: [] }, [
      { tipo: '05_dias_antes_vencimento', canal: 'email' },
    ]);
    const outro: TituloAgenda = { ...titulo, id: 8, numeroTitulo: 'FAT-8', clienteNome: 'Beta' };
    const pagina = montarAgendaCobranca({
      ...base,
      dataInicio: '2026-11-15',
      dataFim: '2026-11-15',
      titulos: [titulo, outro],
      passos,
      search: 'beta',
      page: 1,
      limit: 1,
    });
    expect(pagina.itens).toHaveLength(1);
    expect(pagina.itens[0].cliente).toBe('Beta');
    expect(pagina.pagination.total).toBe(1);

    const vazia = montarAgendaCobranca({ ...base, titulos: [titulo], passos: [] });
    expect(vazia.sem_passos).toBe(true);
    expect(vazia.itens).toEqual([]);
  });
});
