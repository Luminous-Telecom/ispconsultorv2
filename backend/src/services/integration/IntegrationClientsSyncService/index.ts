import { Op, WhereOptions } from 'sequelize';
import { ClienteService } from '../../clientes/ClienteService';
import { ContratoService } from '../../contratos/ContratoService';
import { TituloService } from '../../financeiro/TituloService';
import { logger } from '../../../utils/logger';
import { formatDateISO } from '../../../utils/dateUtils';
import { getCurrentTimestamp } from '../../../utils/timezoneUtils';
import * as helpers from '../../../controllers/IntegrationWebhookController/helpers';

export interface IntegrationClientsPayload {
  cnpj?: string;
  includeInactive?: boolean;
  clienteStatus?: 'ativo' | 'inativo' | 'all';
  tituloStatus?: string[];
  contratoStatus?: string[];
  limit?: number;
  offset?: number;
  updatedAfter?: string;
}

interface ClienteWithAssociations {
  id: number;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  email: string;
  telefone: string | null;
  whatsapp: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at?: string | Date;
  updated_at?: string | Date;
  contratos?: ContratoWithAssociations[];
  titulos?: TituloData[];
  planos?: PlanoData[];
}

interface ContratoWithAssociations {
  id: number;
  status: 'ativo' | 'inativo' | 'suspenso';
  valor_final: string | number | null;
  data_inicio: string | Date | null;
  data_fim: string | Date | null;
  observacoes: string | null;
  created_at?: string | Date;
  updated_at?: string | Date;
  plano?: PlanoData | null;
  termos?: TermoData[];
}

interface PlanoData {
  id: number;
  nome_plano: string;
  valor_mensal: string | number | null;
  status: string;
}

interface TermoData {
  id: number;
  tipo_termo: string;
  assinado: string;
  data_aceite: string | Date | null;
  observacoes: string | null;
  modeloDocumento?: {
    id: number;
    nome: string;
    tipo: string;
  } | null;
  conteudo?: string | null;
}

interface TituloData {
  id: number;
  numero_titulo: string;
  valor: string | number;
  status: string;
  data_vencimento: string | Date | null;
  data_pagamento: string | Date | null;
  valor_pago: string | number | null;
  valor_aberto: string | number | null;
  descricao: string | null;
  url_boleto: string | null;
  linha_digitavel: string | null;
  qrcode: string | null;
}

interface FormattedClienteData {
  id: number;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  status: 'ativo' | 'inativo';
  cadastradoEm?: string;
  atualizadoEm?: string;
  contatos: {
    email: string;
    telefone: string | null;
    whatsapp: string | null;
  };
  endereco: {
    cep: string | null;
    logradouro: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    cidade: string | null;
    estado: string | null;
  };
  observacoes: string | null;
  totais: {
    contratosAtivos: number;
    valorContratosAtivos: number;
    totalContratos: number;
    titulosTotal: number;
    titulosEmAberto: number;
    valorTitulos: number;
    valorTitulosEmAberto: number;
  };
  planos: Array<{
    id: number;
    nome: string;
    valorMensal: number;
    status: string;
  }>;
  contratos: Array<{
    id: number;
    status: string;
    valorFinal: number | null;
    dataInicio: string | null;
    dataFim: string | null;
    observacoes: string | null;
    plano: {
      id: number;
      nome: string;
      valorMensal: number;
      status: string;
    } | null;
    termos: Array<{
      id: number;
      tipo: string;
      assinado: boolean;
      dataAceite: string | null;
      observacoes: string | null;
      modelo: {
        id: number;
        nome: string;
        tipo: string;
      } | null;
      conteudo: string | null;
    }>;
  }>;
  titulos: Array<{
    id: number;
    numero: string;
    valor: number;
    status: string;
    dataVencimento: string;
    dataPagamento: string | null;
    valorPago: number | null;
    valorAberto: number | null;
    descricao: string | null;
    urlBoleto: string | null;
    linhaDigitavel: string | null;
    qrcode: string | null;
  }>;
}

export interface ClientsSyncResult {
  timestamp: string;
  meta: {
    totalClientes: number;
    retornados: number;
    limite: number;
    offset: number;
    hasMore: boolean;
  };
  data: FormattedClienteData[];
}

export class IntegrationClientsSyncService {
  /**
   * Processa sincronização de clientes
   */
  static async processSync(payload: IntegrationClientsPayload | undefined): Promise<ClientsSyncResult> {
    const limit = helpers.parseLimit(payload?.limit);
    const offset = helpers.parseOffset(payload?.offset);
    const filters: WhereOptions = {};

    // Processar filtro de status de cliente
    const clienteStatus = payload?.clienteStatus ?? (payload?.includeInactive ? 'all' : 'ativo');
    if (clienteStatus === 'ativo') {
      filters.ativo = true;
    } else if (clienteStatus === 'inativo') {
      filters.ativo = false;
    }

    if (payload?.cnpj) {
      filters.cnpj = payload.cnpj;
    }

    if (payload?.updatedAfter) {
      const updatedAt = new Date(payload.updatedAfter);
      if (!Number.isNaN(updatedAt.getTime())) {
        filters.updated_at = { [Op.gte]: updatedAt };
      }
    }

    // Processar filtro de status de contratos
    let contratoStatusFilter: { statuses: string[]; includeAtrasados: boolean } | null = null;
    if (payload?.contratoStatus && Array.isArray(payload.contratoStatus) && payload.contratoStatus.length > 0) {
      contratoStatusFilter = helpers.expandContratoStatusFilters(payload.contratoStatus);
      
      const contratoWhere: WhereOptions = {};
      const hoje = new Date();
      hoje.setHours(23, 59, 59, 999);
      
      if (contratoStatusFilter.statuses.length > 0 && contratoStatusFilter.includeAtrasados) {
        (contratoWhere as Record<symbol, unknown>)[Op.or] = [
          { status: { [Op.in]: contratoStatusFilter.statuses } },
          { data_fim: { [Op.lt]: hoje } }
        ];
      } else if (contratoStatusFilter.statuses.length > 0) {
        contratoWhere.status = { [Op.in]: contratoStatusFilter.statuses };
      } else if (contratoStatusFilter.includeAtrasados) {
        contratoWhere.data_fim = { [Op.lt]: hoje };
      }
      
      if (Object.keys(contratoWhere).length > 0) {
        const clienteIds = await ContratoService.getClienteIdsByContratoFilters(contratoWhere);
        
        if (clienteIds.length === 0) {
          return {
            timestamp: getCurrentTimestamp(),
            meta: {
              totalClientes: 0,
              retornados: 0,
              limite: limit,
              offset,
              hasMore: false
            },
            data: []
          };
        }

        if (filters.id && Array.isArray((filters.id as { [Op.in]: number[] })[Op.in])) {
          const existingIds = (filters.id as { [Op.in]: number[] })[Op.in];
          filters.id = { [Op.in]: existingIds.filter((id: number) => clienteIds.includes(id)) };
        } else {
          filters.id = { [Op.in]: clienteIds };
        }
      }
    }

    // Processar filtro de status de títulos
    let tituloStatusFilter: string[] | null = null;
    if (payload?.tituloStatus && Array.isArray(payload.tituloStatus) && payload.tituloStatus.length > 0) {
      tituloStatusFilter = helpers.expandTituloStatusFilters(payload.tituloStatus);
      
      const clienteIds = await TituloService.getClienteIdsByStatus(tituloStatusFilter);
      
      if (clienteIds.length === 0) {
        return {
          timestamp: getCurrentTimestamp(),
          meta: {
            totalClientes: 0,
            retornados: 0,
            limite: limit,
            offset,
            hasMore: false
          },
          data: []
        };
      }

      if (filters.id && Array.isArray((filters.id as { [Op.in]: number[] })[Op.in])) {
        const existingIds = (filters.id as { [Op.in]: number[] })[Op.in];
        filters.id = { [Op.in]: existingIds.filter((id: number) => clienteIds.includes(id)) };
      } else {
        filters.id = { [Op.in]: clienteIds };
      }
    }

    logger.info('Buscando clientes com filtros', { filters: JSON.stringify(filters) });
    
    const [totalClientes, clientes] = await Promise.all([
      ClienteService.count(filters),
      ClienteService.findAllWithFilters(filters, {
        include: [
          {
            association: 'contratos',
            attributes: [
              'id',
              'status',
              'valor_final',
              'data_inicio',
              'data_fim',
              'observacoes',
              'created_at',
              'updated_at'
            ],
            ...(contratoStatusFilter && (contratoStatusFilter.statuses.length > 0 || contratoStatusFilter.includeAtrasados)
              ? (() => {
                  const contratoWhere: WhereOptions = {};
                  const hoje = new Date();
                  hoje.setHours(23, 59, 59, 999);
                  
                  if (contratoStatusFilter.statuses.length > 0 && contratoStatusFilter.includeAtrasados) {
                    (contratoWhere as Record<symbol, unknown>)[Op.or] = [
                      { status: { [Op.in]: contratoStatusFilter.statuses } },
                      { data_fim: { [Op.lt]: hoje } }
                    ];
                  } else if (contratoStatusFilter.statuses.length > 0) {
                    contratoWhere.status = { [Op.in]: contratoStatusFilter.statuses };
                  } else if (contratoStatusFilter.includeAtrasados) {
                    contratoWhere.data_fim = { [Op.lt]: hoje };
                  }
                  
                  return { where: contratoWhere };
                })()
              : {}),
            include: [
              {
                association: 'plano',
                attributes: ['id', 'nome_plano', 'valor_mensal', 'status']
              },
              {
                association: 'termos',
                attributes: [
                  'id',
                  'tipo_termo',
                  'assinado',
                  'data_aceite',
                  'observacoes',
                  'conteudo',
                  'created_at',
                  'updated_at'
                ],
                include: [
                  {
                    association: 'modeloDocumento',
                    attributes: ['id', 'nome', 'tipo']
                  }
                ]
              }
            ]
          },
          {
            association: 'titulos',
            attributes: [
              'id',
              'numero_titulo',
              'valor',
              'status',
              'data_vencimento',
              'data_pagamento',
              'valor_pago',
              'valor_aberto',
              'descricao',
              'url_boleto',
              'linha_digitavel',
              'qrcode'
            ],
            ...(tituloStatusFilter && tituloStatusFilter.length > 0
              ? {
                  where: {
                    status: { [Op.in]: tituloStatusFilter }
                  }
                }
              : {})
          },
          {
            association: 'planos',
            attributes: ['id', 'nome_plano', 'valor_mensal', 'status'],
            through: {
              attributes: []
            }
          }
        ],
        order: [['razao_social', 'ASC']],
        limit,
        offset: offset as number
      } as any)
    ]);

    logger.info('Clientes encontrados', { total: totalClientes, retornados: clientes.length });

    const clientesFormatados = clientes.map((cliente) => {
      const raw = cliente.toJSON() as unknown as ClienteWithAssociations;

      const planos = (raw.planos ?? []).map((plano) => ({
        id: plano.id,
        nome: plano.nome_plano,
        valorMensal: helpers.parseNumber(plano.valor_mensal),
        status: plano.status
      }));

      let contratos = (raw.contratos ?? []).map((contrato) => {
        const valorFinal = helpers.parseNumber(contrato.valor_final);
        const plano = contrato.plano
          ? {
              id: contrato.plano.id,
              nome: contrato.plano.nome_plano,
              valorMensal: helpers.parseNumber(contrato.plano.valor_mensal),
              status: contrato.plano.status
            }
          : null;

        const termos = (contrato.termos ?? []).map((termo) => ({
          id: termo.id,
          tipo: termo.tipo_termo,
          assinado: termo.assinado === 'SIM',
          dataAceite: formatDateISO(termo.data_aceite),
          observacoes: termo.observacoes,
          modelo: termo.modeloDocumento
            ? {
                id: termo.modeloDocumento.id,
                nome: termo.modeloDocumento.nome,
                tipo: termo.modeloDocumento.tipo
              }
            : null,
          conteudo: termo.conteudo ?? null
        }));

        return {
          id: contrato.id,
          status: contrato.status,
          valorFinal,
          dataInicio: formatDateISO(contrato.data_inicio),
          dataFim: formatDateISO(contrato.data_fim),
          observacoes: contrato.observacoes,
          plano,
          termos
        };
      });

      // Filtrar contratos por status se especificado
      if (contratoStatusFilter) {
        contratos = contratos.filter((contrato) => {
          let matchesStatus = false;
          let matchesAtrasado = false;
          
          if (contratoStatusFilter.statuses.length > 0) {
            matchesStatus = contratoStatusFilter.statuses.includes(contrato.status);
          } else {
            matchesStatus = true;
          }
          
          if (contratoStatusFilter.includeAtrasados) {
            if (contrato.dataFim) {
              const dataFim = new Date(contrato.dataFim);
              const hoje = new Date();
              hoje.setHours(23, 59, 59, 999);
              matchesAtrasado = dataFim < hoje;
            }
          } else {
            matchesAtrasado = true;
          }
          
          if (contratoStatusFilter.statuses.length > 0 && contratoStatusFilter.includeAtrasados) {
            return matchesStatus || matchesAtrasado;
          }
          
          return matchesStatus && matchesAtrasado;
        });
      }

      let titulos = (raw.titulos ?? []).map((titulo) => {
        const valor = helpers.parseNumber(titulo.valor);
        const valorPago = helpers.parseNullableNumber(titulo.valor_pago);
        const valorAberto = helpers.parseNullableNumber(
          titulo.valor_aberto ?? titulo.valor
        );

        return {
          id: titulo.id,
          numero: titulo.numero_titulo,
          valor,
          status: titulo.status,
          dataVencimento: formatDateISO(titulo.data_vencimento) ?? '',
          dataPagamento: formatDateISO(titulo.data_pagamento),
          valorPago,
          valorAberto,
          descricao: titulo.descricao,
          urlBoleto: titulo.url_boleto,
          linhaDigitavel: titulo.linha_digitavel,
          qrcode: titulo.qrcode
        };
      });

      // Filtrar títulos por status se especificado
      if (tituloStatusFilter && tituloStatusFilter.length > 0) {
        titulos = titulos.filter((titulo) => tituloStatusFilter.includes(titulo.status));
      }

      const contratosAtivos = contratos.filter((contrato) => contrato.status === 'ativo');
      const valorContratosAtivos = contratosAtivos.reduce(
        (total, contrato) => total + (contrato.valorFinal ?? 0),
        0
      );

      const valorTotalTitulos = titulos.reduce((total, titulo) => total + titulo.valor, 0);
      const titulosEmAberto = titulos.filter((titulo) =>
        ['pendente', 'vencido', 'parcial'].includes(titulo.status)
      );
      const valorTitulosEmAberto = titulosEmAberto.reduce(
        (total, titulo) => total + (titulo.valorAberto ?? titulo.valor),
        0
      );

      const clienteFormatado: FormattedClienteData = {
        id: raw.id,
        cnpj: raw.cnpj,
        razaoSocial: raw.razao_social,
        nomeFantasia: raw.nome_fantasia,
        status: raw.ativo ? 'ativo' : 'inativo',
        cadastradoEm: formatDateISO(raw.created_at) ?? undefined,
        atualizadoEm: formatDateISO(raw.updated_at) ?? undefined,
        contatos: {
          email: raw.email,
          telefone: raw.telefone,
          whatsapp: raw.whatsapp
        },
        endereco: {
          cep: raw.cep,
          logradouro: raw.endereco,
          numero: raw.numero,
          complemento: raw.complemento,
          bairro: raw.bairro,
          cidade: raw.cidade,
          estado: raw.estado
        },
        observacoes: raw.observacoes,
        totais: {
          contratosAtivos: contratosAtivos.length,
          valorContratosAtivos,
          totalContratos: contratos.length,
          titulosTotal: titulos.length,
          titulosEmAberto: titulosEmAberto.length,
          valorTitulos: valorTotalTitulos,
          valorTitulosEmAberto
        },
        planos,
        contratos,
        titulos
      };

      return clienteFormatado;
    });

    return {
      timestamp: getCurrentTimestamp(),
      meta: {
        totalClientes,
        retornados: clientesFormatados.length,
        limite: limit,
        offset,
        hasMore: offset + clientesFormatados.length < totalClientes
      },
      data: clientesFormatados
    };
  }
}
