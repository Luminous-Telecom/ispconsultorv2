import {
  escolherMensagemCobranca,
  isFalhaCobranca,
  montarWhereFalhasCobranca,
  parseReenviarFalhasBody,
  selecionarFalhasCobrancaPendentes,
  textoMensagemCobranca,
  tituloAceitaReenvioCobranca,
  type HistoricoCobrancaRow,
} from './selecao';

const findMany = jest.fn();
const findUnique = jest.fn();
const enviarEmail = jest.fn();
const enviarWhatsApp = jest.fn();

jest.mock('../../../db/prisma', () => ({
  prisma: {
    sistema_logs_operacionais: { findMany: (...args: unknown[]) => findMany(...args) },
    financeiro_titulos: { findUnique: (...args: unknown[]) => findUnique(...args) },
    $queryRawUnsafe: jest.fn(),
  },
}));
jest.mock('../EmailService', () => ({
  EmailService: { enviarTituloManual: (...args: unknown[]) => enviarEmail(...args), reenviarCobrancaSaas: jest.fn() },
}));
jest.mock('../WhatsAppService', () => ({
  WhatsAppService: { enviarTituloManual: (...args: unknown[]) => enviarWhatsApp(...args) },
}));
jest.mock('../WhatsAppBoletoService', () => ({
  WhatsAppBoletoService: { reenviarCobrancaSaas: jest.fn() },
}));
jest.mock('../../../utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

import { ReenviarNotificacoesCobrancaService } from './index';

function falha(partial: Partial<HistoricoCobrancaRow> & Pick<HistoricoCobrancaRow, 'id' | 'entidade_id'>): HistoricoCobrancaRow {
  return {
    tipo: 'email',
    status: 'erro',
    entidade_tipo: 'titulo',
    titulo: 'Boleto de Pagamento',
    historico_origem: 'erp',
    created_at: '2026-10-16T10:00:00.000Z',
    ...partial,
  };
}

function modelo(row: HistoricoCobrancaRow) {
  return {
    id: BigInt(row.id),
    canal: row.tipo,
    tipo: row.status,
    tabela: row.entidade_tipo ?? null,
    recurso: row.historico_origem,
    recurso_id: row.entidade_id != null ? String(row.entidade_id) : null,
    payload: JSON.stringify({
      log_contexto: 'mensagem',
      titulo: row.titulo ?? null,
      destinatario: 'cliente@ispconsultor.com.br',
      mensagem: 'cobranca',
    }),
    mensagem: 'cobranca',
    empresa_id: 7,
    usuario_id: null,
    created_at: new Date(row.created_at),
    cadastros_usuarios: null,
    sistema_tenants: null,
  };
}

describe('seleção de falhas de cobrança', () => {
  it('recusa recibo, mensagem sem título e envio que já deu certo', () => {
    expect(isFalhaCobranca(falha({ id: 1, entidade_id: 10 }))).toBe(true);
    expect(isFalhaCobranca(falha({ id: 2, entidade_id: 10, titulo: 'Recibo de Pagamento' }))).toBe(false);
    expect(isFalhaCobranca(falha({ id: 3, entidade_id: null, entidade_tipo: null }))).toBe(false);
    expect(isFalhaCobranca(falha({ id: 4, entidade_id: 10, status: 'enviada' }))).toBe(false);
  });

  it('ignora falha que já teve cobrança enviada depois e junta tentativas do mesmo título', () => {
    const pendentes = selecionarFalhasCobrancaPendentes([
      falha({ id: 1, entidade_id: 10, created_at: '2026-10-16T10:00:00.000Z' }),
      falha({ id: 2, entidade_id: 10, created_at: '2026-10-16T11:00:00.000Z' }),
      falha({ id: 3, entidade_id: 20, created_at: '2026-10-16T09:00:00.000Z' }),
      falha({ id: 4, entidade_id: 20, status: 'enviada', created_at: '2026-10-16T12:00:00.000Z' }),
      falha({ id: 5, entidade_id: 30, titulo: 'Recibo de Pagamento' }),
    ]);
    expect(pendentes.map((item) => item.id)).toEqual([2]);
  });

  it('só reenvia título pendente, vencido ou parcial', () => {
    expect(tituloAceitaReenvioCobranca({ status: 'vencido', pago: false })).toBe(true);
    expect(tituloAceitaReenvioCobranca({ status: 'parcial', pago: false })).toBe(true);
    expect(tituloAceitaReenvioCobranca({ status: 'pendente', pago: true })).toBe(false);
    expect(tituloAceitaReenvioCobranca({ status: 'cancelado', pago: false })).toBe(false);
    expect(tituloAceitaReenvioCobranca({ status: 'pago', pago: false })).toBe(false);
    expect(tituloAceitaReenvioCobranca(null)).toBe(false);
  });

  it('prefere a mensagem de cobrança do dia e ignora recibo desativado', () => {
    const escolhida = escolherMensagemCobranca([
      { tipo: 'recibo_pagamento', tipo_envio: 'pdf' },
      { tipo: '05_dias_antes_vencimento', tipo_envio: 'desativado' },
      { tipo: 'envio_manual', tipo_envio: 'pdf' },
      { tipo: 'mesmo_dia_vencimento', tipo_envio: 'pdf' },
    ]);
    expect(escolhida?.tipo).toBe('mesmo_dia_vencimento');
    expect(textoMensagemCobranca({ tipo: 'envio_manual', mensagem_manual: '<p>Oi</p>', mensagem_padrao: 'padrao' })).toBe('<p>Oi</p>');
    expect(textoMensagemCobranca({ tipo: 'mesmo_dia_vencimento', mensagem_manual: 'manual', mensagem_padrao: 'padrao' })).toBe('padrao');
  });

  it('recusa canal inválido e ids que não são inteiros positivos', () => {
    expect(parseReenviarFalhasBody({ tipo: 'sms' }).ok).toBe(false);
    expect(parseReenviarFalhasBody({ tipo: 'email', ids: [1, 0] }).ok).toBe(false);
    expect(parseReenviarFalhasBody({ tipo: 'whatsapp', ids: [4], incluir_erp: true })).toEqual({
      ok: true,
      tipo: 'whatsapp',
      ids: [4],
      incluirErp: true,
    });
  });

  it('prende a busca ao empresa_id informado e aos ids pedidos', () => {
    const where = montarWhereFalhasCobranca({
      tipo: 'email',
      origens: ['erp'],
      empresaId: 7,
      ids: [15, 16],
    });
    expect(where.empresa_id).toBe(7);
    expect(where.tipo).toBe('email');
    expect(where.entidade_tipo).toBe('titulo');
    expect(where.status).toBe('erro');
    expect(where.id).toEqual({ in: [15, 16] });
    expect(where.historico_origem).toBe('erp');

    const admin = montarWhereFalhasCobranca({ tipo: 'whatsapp', origens: ['erp', 'saas'], empresaId: null });
    expect(admin.empresa_id).toBeUndefined();
    expect(admin.historico_origem).toEqual({ in: ['erp', 'saas'] });
  });
});

describe('ReenviarNotificacoesCobrancaService', () => {
  beforeEach(() => {
    findMany.mockReset();
    findUnique.mockReset();
    enviarEmail.mockReset();
    enviarWhatsApp.mockReset();
  });

  it('filtra falhas pela empresa e reenvia o e-mail do título em aberto', async () => {
    const erro = falha({ id: 15, entidade_id: 44 });
    findMany.mockImplementation(async (query: { where: { tipo: string } }) => {
      if (query.where.tipo === 'erro') return [modelo(erro)];
      return [];
    });
    findUnique.mockResolvedValue({ status: 'vencido', pago: false });
    enviarEmail.mockResolvedValue({ sucesso: true, mensagem: 'Email enviado com sucesso' });

    const resultado = await ReenviarNotificacoesCobrancaService.reenviar({
      tipo: 'email',
      empresaId: 7,
      origens: ['erp'],
      ids: [15],
    });

    expect(findMany.mock.calls[0][0].where.empresa_id).toBe(7);
    expect(findMany.mock.calls[0][0].where.canal).toBe('email');
    expect(findMany.mock.calls[0][0].where.id).toEqual({ in: [BigInt(15)] });
    expect(enviarEmail).toHaveBeenCalledWith(44);
    expect(enviarWhatsApp).not.toHaveBeenCalled();
    expect(resultado).toEqual({ total: 1, reenviadas: 1, erros: 0, ignoradas: 0 });
  });

  it('não reenvia cobrança de título pago nem falha já sucedida', async () => {
    findMany.mockImplementation(async (query: { where: { tipo: string } }) => {
      if (query.where.tipo === 'erro') {
        return [modelo(falha({ id: 1, entidade_id: 8 }))];
      }
      return [modelo(falha({
        id: 2,
        entidade_id: 8,
        status: 'enviada',
        created_at: '2026-10-16T18:00:00.000Z',
      }))];
    });

    const jaEnviada = await ReenviarNotificacoesCobrancaService.reenviar({
      tipo: 'email',
      empresaId: 7,
      origens: ['erp'],
    });
    expect(jaEnviada.total).toBe(0);
    expect(enviarEmail).not.toHaveBeenCalled();

    findMany.mockClear();
    findMany.mockImplementation(async (query: { where: { tipo: string } }) => (
      query.where.tipo === 'erro' ? [modelo(falha({ id: 3, entidade_id: 9 }))] : []
    ));
    findUnique.mockResolvedValue({ status: 'pago', pago: true });
    const pago = await ReenviarNotificacoesCobrancaService.reenviar({
      tipo: 'email',
      empresaId: 3,
      origens: ['erp'],
    });
    expect(pago).toEqual({ total: 1, reenviadas: 0, erros: 0, ignoradas: 1 });
    expect(findMany.mock.calls[0][0].where.empresa_id).toBe(3);
    expect(enviarEmail).not.toHaveBeenCalled();
  });
});
