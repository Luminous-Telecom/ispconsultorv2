import { Request, Response } from 'express';
import { Op, WhereOptions } from 'sequelize';
import { Cliente } from '../models/Cliente';
import { Contrato } from '../models/Contrato';
import { Plano } from '../models/Plano';
import { Titulo } from '../models/Titulo';
import { TermoContrato } from '../models/TermoContrato';
import { logger } from '../utils/logger';

type IntegrationEvent = 'ping' | 'clients.sync';

interface IntegrationWebhookRequestBody {
  secret?: string;
  event?: IntegrationEvent;
  payload?: IntegrationClientsPayload;
}

interface IntegrationClientsPayload {
  cnpj?: string;
  includeInactive?: boolean;
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
  termos?: TermoContratoData[];
}

interface TermoContratoData {
  id: number;
  tipo_termo: string;
  assinado: 'SIM' | 'NAO';
  data_aceite: string | Date | null;
  observacoes: string | null;
  conteudo?: string;
  modeloTermo?: {
    id: number;
    nome: string | null;
    tipo_termo: string | null;
  } | null;
}

interface PlanoData {
  id: number;
  nome_plano: string;
  valor_mensal: string | number;
  status?: string;
}

interface TituloData {
  id: number;
  numero_titulo: string;
  valor: string | number;
  status: 'pendente' | 'pago' | 'vencido' | 'cancelado' | 'parcial' | 'pago_atraso';
  data_vencimento: string | Date;
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
    telefone?: string | null;
    whatsapp?: string | null;
  };
  endereco: {
    cep?: string | null;
    logradouro?: string | null;
    numero?: string | null;
    complemento?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    estado?: string | null;
  };
  observacoes?: string | null;
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
    status?: string;
  }>;
  contratos: Array<{
    id: number;
    status: 'ativo' | 'inativo' | 'suspenso';
    valorFinal: number | null;
    dataInicio?: string | null;
    dataFim?: string | null;
    observacoes?: string | null;
    plano?: {
      id: number;
      nome: string;
      valorMensal: number;
      status?: string;
    } | null;
    termos: Array<{
      id: number;
      tipo: string;
      assinado: boolean;
      dataAceite?: string | null;
      observacoes?: string | null;
      modelo?: {
        id: number;
        nome: string | null;
        tipo: string | null;
      } | null;
      conteudo?: string;
    }>;
  }>;
  titulos: Array<{
    id: number;
    numero: string;
    valor: number;
    status: TituloData['status'];
    dataVencimento: string;
    dataPagamento?: string | null;
    valorPago?: number | null;
    valorAberto?: number | null;
    descricao?: string | null;
    urlBoleto?: string | null;
    linhaDigitavel?: string | null;
    qrcode?: string | null;
  }>;
}

export class IntegrationWebhookController {
  static async handleIntegration(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as IntegrationWebhookRequestBody;
      const secret = body.secret;

      if (!IntegrationWebhookController.isSecretValid(secret)) {
        res.status(401).json({
          success: false,
          message: 'Credenciais inválidas para o webhook de integração'
        });
        return;
      }

      const event: IntegrationEvent = body.event ?? 'clients.sync';

      if (event === 'ping') {
        res.json({
          success: true,
          message: 'Integração ativa',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (event === 'clients.sync') {
        await IntegrationWebhookController.handleClientsSync(body.payload, res);
        return;
      }

      res.status(400).json({
        success: false,
        message: `Evento '${event}' não suportado`
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro no webhook de integração', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      res.status(500).json({
        success: false,
        message: 'Erro interno ao processar o webhook de integração'
      });
    }
  }

  private static isSecretValid(secret?: string): boolean {
    const expectedSecret = process.env.INTERNAL_WEBHOOK_SECRET;
    if (!expectedSecret) {
      logger.warn('Variável INTERNAL_WEBHOOK_SECRET não configurada');
      return false;
    }
    return typeof secret === 'string' && secret === expectedSecret;
  }

  private static parseLimit(limit?: number): number {
    if (!limit || Number.isNaN(limit)) {
      return 100;
    }

    const sanitized = Math.max(1, Math.min(limit, 500));
    return sanitized;
  }

  private static parseOffset(offset?: number): number {
    if (!offset || Number.isNaN(offset)) {
      return 0;
    }

    return Math.max(0, offset);
  }

  private static async handleClientsSync(payload: IntegrationClientsPayload | undefined, res: Response): Promise<void> {
    const includeInactive = payload?.includeInactive ?? false;
    const limit = IntegrationWebhookController.parseLimit(payload?.limit);
    const offset = IntegrationWebhookController.parseOffset(payload?.offset);
    const filters: WhereOptions = {};

    if (!includeInactive) {
      filters.ativo = true;
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

    const [totalClientes, clientes] = await Promise.all([
      Cliente.count({ where: filters }),
      Cliente.findAll({
        where: filters,
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
                    association: 'modeloTermo',
                    attributes: ['id', 'nome', 'tipo_termo']
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
            ]
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
        offset
      })
    ]);

    const clientesFormatados = clientes.map((cliente) => {
      const raw = cliente.toJSON() as ClienteWithAssociations;

      const planos = (raw.planos ?? []).map((plano) => ({
        id: plano.id,
        nome: plano.nome_plano,
        valorMensal: IntegrationWebhookController.parseNumber(plano.valor_mensal),
        status: plano.status
      }));

      const contratos = (raw.contratos ?? []).map((contrato) => {
        const valorFinal = IntegrationWebhookController.parseNumber(contrato.valor_final);
        const plano = contrato.plano
          ? {
              id: contrato.plano.id,
              nome: contrato.plano.nome_plano,
              valorMensal: IntegrationWebhookController.parseNumber(contrato.plano.valor_mensal),
              status: contrato.plano.status
            }
          : null;

        const termos = (contrato.termos ?? []).map((termo) => ({
          id: termo.id,
          tipo: termo.tipo_termo,
          assinado: termo.assinado === 'SIM',
          dataAceite: IntegrationWebhookController.formatDate(termo.data_aceite),
          observacoes: termo.observacoes,
          modelo: termo.modeloTermo
            ? {
                id: termo.modeloTermo.id,
                nome: termo.modeloTermo.nome,
                tipo: termo.modeloTermo.tipo_termo
              }
            : null,
          conteudo: termo.conteudo
        }));

        return {
          id: contrato.id,
          status: contrato.status,
          valorFinal,
          dataInicio: IntegrationWebhookController.formatDate(contrato.data_inicio),
          dataFim: IntegrationWebhookController.formatDate(contrato.data_fim),
          observacoes: contrato.observacoes,
          plano,
          termos
        };
      });

      const titulos = (raw.titulos ?? []).map((titulo) => {
        const valor = IntegrationWebhookController.parseNumber(titulo.valor);
        const valorPago = IntegrationWebhookController.parseNullableNumber(titulo.valor_pago);
        const valorAberto = IntegrationWebhookController.parseNullableNumber(
          titulo.valor_aberto ?? titulo.valor
        );

        return {
          id: titulo.id,
          numero: titulo.numero_titulo,
          valor,
          status: titulo.status,
          dataVencimento: IntegrationWebhookController.formatDate(titulo.data_vencimento) ?? '',
          dataPagamento: IntegrationWebhookController.formatDate(titulo.data_pagamento),
          valorPago,
          valorAberto,
          descricao: titulo.descricao,
          urlBoleto: titulo.url_boleto,
          linhaDigitavel: titulo.linha_digitavel,
          qrcode: titulo.qrcode
        };
      });

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
        cadastradoEm: IntegrationWebhookController.formatDate(raw.created_at) ?? undefined,
        atualizadoEm: IntegrationWebhookController.formatDate(raw.updated_at) ?? undefined,
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

    res.json({
      success: true,
      message: 'Dados de clientes sincronizados com sucesso',
      timestamp: new Date().toISOString(),
      meta: {
        totalClientes,
        retornados: clientesFormatados.length,
        limite: limit,
        offset,
        hasMore: offset + clientesFormatados.length < totalClientes
      },
      data: clientesFormatados
    });
  }

  private static parseNumber(value: string | number | null | undefined): number {
    if (value === null || value === undefined) {
      return 0;
    }

    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return 0;
    }

    return parsed;
  }

  private static parseNullableNumber(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return null;
    }

    return parsed;
  }

  private static formatDate(value: string | Date | null | undefined): string | null {
    if (!value) {
      return null;
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date.toISOString();
  }
}


