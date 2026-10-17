const create = jest.fn();

jest.mock('../../db/prisma', () => ({
  prisma: {
    sistema_logs_operacionais: { create: (...args: unknown[]) => create(...args) },
  },
}));

import { gravarMensagemHistoricoLog } from './mensagemHistoricoLog';

describe('gravarMensagemHistoricoLog', () => {
  beforeEach(() => {
    create.mockReset();
    create.mockResolvedValue({ id: 1n });
  });

  it('grava mensagem no log unificado com contexto, canal e origem', async () => {
    await gravarMensagemHistoricoLog({
      tipo: 'email',
      destinatario: 'cliente@ispconsultor.com.br',
      titulo: 'Boleto',
      mensagem: 'segue o boleto',
      status: 'erro',
      entidade_tipo: 'titulo',
      entidade_id: 44,
      empresa_id: 10,
      historico_origem: 'erp',
    });

    const data = create.mock.calls[0][0].data;
    expect(data.canal).toBe('email');
    expect(data.tipo).toBe('erro');
    expect(data.tabela).toBe('titulo');
    expect(data.recurso).toBe('erp');
    expect(data.recurso_id).toBe('44');
    expect(data.empresa_id).toBe(10);
    expect(JSON.parse(data.payload).log_contexto).toBe('mensagem');
    expect(JSON.parse(data.payload).destinatario).toBe('cliente@ispconsultor.com.br');
  });

  it('não grava entidade quando o id não foi enviado', async () => {
    await gravarMensagemHistoricoLog({
      tipo: 'whatsapp',
      destinatario: '11999999999',
      mensagem: 'ok',
      status: 'enviada',
      historico_origem: 'saas',
    });

    expect(create.mock.calls[0][0].data.recurso_id).toBeNull();
    expect(create.mock.calls[0][0].data.recurso).toBe('saas');
  });
});
