import { Prisma } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { whereComunicacaoEmpresaEstrito } from '../../../utils/comunicacaoEmpresaWhere';
import { formatDateOnly } from '../../../utils/timezoneUtils';
import {
  calcularIndicadoresCobranca,
  IndicadoresCobranca,
  TituloCalculo,
} from '../calcularIndicadoresCobranca';
import {
  adicionarDias,
  adicionarMeses,
  dataLocal,
  diferencaDias,
  ehIsoData,
  ehIsoMes,
  hojeIso,
  limitesDoMes,
} from '../datasCobranca';
import { AgendaMontada, montarAgendaCobranca, TituloAgenda } from '../montarAgendaCobranca';
import { CanalCobranca, PassoAtivo, passosAtivos } from '../passosCobranca';

export interface AgendaFiltros {
  dataInicio?: string;
  dataFim?: string;
  search?: string;
  searchField?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  page: number;
  limit: number;
}

const JANELA_PADRAO_DIAS = 15;
const JANELA_MAXIMA_DIAS = 89;

export class CobrancaPainelService {
  static async indicadores(empresaId: number | null, mesInformado?: string): Promise<IndicadoresCobranca> {
    const hoje = hojeIso();
    const mes = ehIsoMes(mesInformado) ? mesInformado : hoje.slice(0, 7);
    const { inicio, fimExclusivo } = limitesDoMes(mes);
    const empresa = filtroEmpresa(empresaId);

    const [doMes, emAtraso, somaVencidos, pagos, contratos] = await Promise.all([
      prisma.financeiro_titulos.findMany({
        where: {
          ...empresa,
          status: { not: 'cancelado' },
          data_vencimento: { gte: dataLocal(inicio), lt: dataLocal(fimExclusivo) },
        },
        select: selecaoTitulo,
      }),
      prisma.financeiro_titulos.findMany({
        where: {
          ...empresa,
          pago: false,
          status: { in: ['pendente', 'vencido', 'parcial'] },
          data_vencimento: { lt: dataLocal(hoje) },
        },
        select: selecaoTitulo,
      }),
      prisma.financeiro_titulos.aggregate({
        where: {
          ...empresa,
          status: { not: 'cancelado' },
          data_vencimento: { lt: dataLocal(hoje) },
        },
        _sum: { valor: true },
      }),
      prisma.financeiro_titulos.findMany({
        where: {
          ...empresa,
          status: { in: ['pago', 'pago_atraso'] },
          data_pagamento: { not: null },
          data_vencimento: { gte: dataLocal(adicionarMeses(hoje, -12)) },
        },
        select: selecaoTitulo,
      }),
      prisma.contratos.findMany({
        where: { ...empresa, status: 'ativo' },
        select: { cliente_id: true },
        distinct: ['cliente_id'],
      }),
    ]);

    return calcularIndicadoresCobranca({
      mes,
      hoje,
      doMes: doMes.map(paraCalculo),
      emAtraso: emAtraso.map(paraCalculo),
      valorBaseVencido: Number(somaVencidos._sum.valor ?? 0),
      pagos: pagos.map(paraCalculo),
      clientesComContratoAtivo: contratos.length,
    });
  }

  static async agenda(empresaId: number | null, filtros: AgendaFiltros): Promise<AgendaMontada> {
    const hoje = hojeIso();
    const dataInicio = ehIsoData(filtros.dataInicio) ? filtros.dataInicio : hoje;
    const dataFim = ehIsoData(filtros.dataFim) ? filtros.dataFim : adicionarDias(hoje, JANELA_PADRAO_DIAS);
    if (dataFim < dataInicio || diferencaDias(dataInicio, dataFim) > JANELA_MAXIMA_DIAS) {
      throw new Error('PERIODO_AGENDA_INVALIDO');
    }

    const passos = await carregarPassos(empresaId);
    if (passos.length === 0) {
      return montarAgendaCobranca({
        titulos: [],
        passos,
        hoje,
        dataInicio,
        dataFim,
        page: filtros.page,
        limit: filtros.limit,
      });
    }

    const maiorAntes = Math.max(0, ...passos.filter((passo) => passo.momento === 'antes').map((passo) => passo.dias));
    const maiorDepois = Math.max(0, ...passos.filter((passo) => passo.momento === 'depois').map((passo) => passo.dias));
    const titulos = await prisma.financeiro_titulos.findMany({
      where: {
        ...filtroEmpresa(empresaId),
        pago: false,
        status: { in: ['pendente', 'vencido'] },
        data_vencimento: {
          gte: dataLocal(adicionarDias(dataInicio, -maiorDepois)),
          lt: dataLocal(adicionarDias(dataFim, maiorAntes + 1)),
        },
        clientes: { ativo: true },
      },
      select: {
        id: true,
        numero_titulo: true,
        valor: true,
        valor_aberto: true,
        data_vencimento: true,
        clientes: {
          select: {
            id: true,
            razao_social: true,
            nome_fantasia: true,
            recebe_email: true,
            recebe_whatsapp: true,
          },
        },
      },
    });

    return montarAgendaCobranca({
      titulos: titulos.map(paraAgenda),
      passos,
      hoje,
      dataInicio,
      dataFim,
      search: filtros.search,
      searchField: filtros.searchField,
      sortColumn: filtros.sortColumn,
      sortDirection: filtros.sortDirection,
      page: filtros.page,
      limit: filtros.limit,
    });
  }
}

const selecaoTitulo = {
  cliente_id: true,
  status: true,
  pago: true,
  valor: true,
  valor_aberto: true,
  data_vencimento: true,
  data_pagamento: true,
} satisfies Prisma.financeiro_titulosSelect;

type TituloRow = Prisma.financeiro_titulosGetPayload<{ select: typeof selecaoTitulo }>;

function paraCalculo(row: TituloRow): TituloCalculo {
  return {
    clienteId: row.cliente_id,
    status: row.status,
    pago: row.pago,
    valor: Number(row.valor),
    valorAberto: row.valor_aberto == null ? null : Number(row.valor_aberto),
    dataVencimento: formatDateOnly(row.data_vencimento) ?? '',
    dataPagamento: formatDateOnly(row.data_pagamento),
  };
}

function paraAgenda(row: {
  id: number;
  numero_titulo: string;
  valor: Prisma.Decimal;
  valor_aberto: Prisma.Decimal | null;
  data_vencimento: Date;
  clientes: {
    id: number;
    razao_social: string | null;
    nome_fantasia: string | null;
    recebe_email: boolean | null;
    recebe_whatsapp: boolean | null;
  };
}): TituloAgenda {
  const cliente = row.clientes;
  return {
    id: row.id,
    numeroTitulo: row.numero_titulo,
    valor: Number(row.valor_aberto ?? row.valor),
    clienteId: cliente.id,
    clienteNome: cliente.razao_social || cliente.nome_fantasia || String(cliente.id),
    recebeEmail: cliente.recebe_email === true,
    recebeWhatsapp: cliente.recebe_whatsapp === true,
    dataVencimento: formatDateOnly(row.data_vencimento) ?? '',
  };
}

async function carregarPassos(empresaId: number | null): Promise<PassoAtivo[]> {
  const where = whereComunicacaoEmpresaEstrito(empresaId, { ativo: true, tipo_envio: { not: 'desativado' } });
  if (!where) return [];

  const [rotina, emails, whatsapps] = await Promise.all([
    prisma.sistema_scheduled_routines.findFirst({
      where: { ...filtroEmpresa(empresaId), tipo: 'envio_boletos', ativo: true },
      select: { configuracao: true },
      orderBy: { id: 'asc' },
    }),
    prisma.comunicacao_mensagens_email.findMany({
      where: where as Prisma.comunicacao_mensagens_emailWhereInput,
      select: { tipo: true },
    }),
    prisma.comunicacao_mensagens_whatsapp.findMany({
      where: where as Prisma.comunicacao_mensagens_whatsappWhereInput,
      select: { tipo: true },
    }),
  ]);

  const mensagens: Array<{ tipo: string; canal: CanalCobranca }> = [
    ...emails.map((mensagem) => ({ tipo: mensagem.tipo, canal: 'email' as const })),
    ...whatsapps.map((mensagem) => ({ tipo: mensagem.tipo, canal: 'whatsapp' as const })),
  ];
  return passosAtivos(rotina?.configuracao ?? {}, mensagens);
}

function filtroEmpresa(empresaId: number | null): { empresa_id: number } | Record<string, never> {
  return empresaId != null ? { empresa_id: empresaId } : {};
}
