import { Request, Response } from 'express';
import { Op, WhereOptions } from 'sequelize';
import { Cliente } from '../models/Cliente';
import { Contrato } from '../models/Contrato';
import { Plano } from '../models/Plano';
import { Titulo } from '../models/Titulo';
import { TermoContrato } from '../models/TermoContrato';
import { Banco } from '../models/Banco';
import { Usuario } from '../models/Usuario';
import { TituloPDFController } from './titulos/TituloPDFController';
import { TituloComRelacoes } from './titulos/types';
import { logger } from '../utils/logger';
import crypto from 'crypto';

// Armazenamento temporário de PDFs em memória
interface PdfCacheEntry {
  buffer: Buffer;
  filename: string;
  expiresAt: number;
}

const pdfCache = new Map<string, PdfCacheEntry>();

// Limpar PDFs expirados a cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [token, entry] of pdfCache.entries()) {
    if (entry.expiresAt < now) {
      pdfCache.delete(token);
    }
  }
}, 5 * 60 * 1000);

type IntegrationEvent = 'ping' | 'clients.sync' | 'titulo.get';

interface IntegrationWebhookRequestBody {
  secret?: string;
  event?: IntegrationEvent;
  payload?: IntegrationClientsPayload | IntegrationTituloPayload;
}

interface IntegrationClientsPayload {
  cnpj?: string;
  includeInactive?: boolean; // Deprecated: usar clienteStatus
  clienteStatus?: 'ativo' | 'inativo' | 'all';
  tituloStatus?: string[]; // Array de status: 'pendente', 'pago', 'vencido', 'cancelado', 'parcial', 'pago_atraso' ou valores especiais: 'aberto', 'atraso'
  contratoStatus?: string[]; // Array de status: 'ativo', 'inativo', 'suspenso' ou valor especial: 'atrasado'
  limit?: number;
  offset?: number;
  updatedAfter?: string;
}

interface IntegrationTituloPayload {
  tituloId?: number;
  numeroTitulo?: string;
  fields?: string[]; // Campos específicos a retornar (ex: ['qrcode', 'linha_digitavel'])
  format?: 'json' | 'pdf'; // Formato de retorno: 'json' (padrão) ou 'pdf' (base64)
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
  modeloDocumento?: {
    id: number;
    nome: string | null;
    tipo: string | null;
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
  /**
   * Servir PDF temporário por token
   */
  static async servePdf(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;

      if (!token) {
        res.status(400).json({
          success: false,
          message: 'Token não fornecido'
        });
        return;
      }

      const entry = pdfCache.get(token);

      if (!entry) {
        res.status(404).json({
          success: false,
          message: 'PDF não encontrado ou expirado'
        });
        return;
      }

      // Verificar se expirou
      if (entry.expiresAt < Date.now()) {
        pdfCache.delete(token);
        res.status(404).json({
          success: false,
          message: 'PDF expirado'
        });
        return;
      }

      // Servir o PDF (inline para abrir no navegador)
      // Remover TODOS os headers de proteção que bloqueiam a exibição do PDF
      const headers = res.getHeaders();
      const headersToRemove = Object.keys(headers).filter(key => {
        const lowerKey = key.toLowerCase();
        return lowerKey.includes('frame') || 
               lowerKey.includes('csp') ||
               lowerKey.includes('content-security') ||
               lowerKey.includes('cross-origin-embedder') ||
               lowerKey.includes('cross-origin-opener') ||
               lowerKey.includes('cross-origin-resource');
      });
      
      // Remover headers restritivos
      headersToRemove.forEach(header => {
        try {
          res.removeHeader(header);
        } catch (e) {
          // Ignorar se header não existir
        }
      });
      
      // Limpar headers específicos conhecidos (case-insensitive)
      const knownRestrictiveHeaders = [
        'X-Frame-Options', 'x-frame-options',
        'Content-Security-Policy', 'content-security-policy',
        'Cross-Origin-Embedder-Policy', 'cross-origin-embedder-policy',
        'Cross-Origin-Opener-Policy', 'cross-origin-opener-policy',
        'Cross-Origin-Resource-Policy', 'cross-origin-resource-policy'
      ];
      
      knownRestrictiveHeaders.forEach(header => {
        try {
          res.removeHeader(header);
        } catch (e) {
          // Ignorar
        }
      });
      
      // Definir headers permitindo exibição do PDF
      // Usar writeHead para garantir que os headers sejam definidos corretamente
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${entry.filename}"`,
        'Content-Length': entry.buffer.length.toString(),
        'X-Content-Type-Options': 'nosniff'
        // NÃO incluir X-Frame-Options para permitir exibição em qualquer contexto
      });
      
      res.end(entry.buffer);

      // Remover após servir (opcional - pode manter por um tempo)
      // pdfCache.delete(token);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao servir PDF temporário', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      res.status(500).json({
        success: false,
        message: 'Erro interno ao servir PDF'
      });
    }
  }

  static async handleIntegration(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as IntegrationWebhookRequestBody;
      const secret = body.secret;

      if (!(await IntegrationWebhookController.isSecretValid(secret))) {
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
        await IntegrationWebhookController.handleClientsSync(body.payload as IntegrationClientsPayload, res);
        return;
      }

      if (event === 'titulo.get') {
        await IntegrationWebhookController.handleTituloGet(body.payload as IntegrationTituloPayload, req, res);
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

  private static async isSecretValid(secret?: string): Promise<boolean> {
    if (!secret || typeof secret !== 'string') {
      return false;
    }

    // Buscar usuário pelo webhook_secret
    const usuario = await Usuario.findOne({
      where: {
        webhook_secret: secret
      }
    });

    if (usuario && usuario.webhook_secret === secret) {
      return true;
    }

    // Se não encontrou usuário, rejeitar
    return false;
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

  /**
   * Expande valores especiais de filtro de status de títulos para status reais
   * 'aberto' -> ['pendente', 'vencido', 'parcial']
   * 'atraso' -> ['vencido']
   * Status diretos são mantidos como estão
   */
  private static expandTituloStatusFilters(statusFilters: string[]): string[] {
    const expanded: string[] = [];
    const validStatuses = ['pendente', 'pago', 'vencido', 'cancelado', 'parcial', 'pago_atraso'];

    for (const filter of statusFilters) {
      const normalized = filter.toLowerCase().trim();

      if (normalized === 'aberto') {
        // Títulos em aberto: pendente, vencido, parcial
        expanded.push('pendente', 'vencido', 'parcial');
      } else if (normalized === 'atraso') {
        // Títulos em atraso: vencido
        expanded.push('vencido');
      } else if (validStatuses.includes(normalized)) {
        // Status válido direto
        expanded.push(normalized);
      }
    }

    // Remover duplicatas
    return [...new Set(expanded)];
  }

  /**
   * Expande valores especiais de filtro de status de contratos para status reais
   * 'atrasado' -> filtra contratos com data_fim no passado
   * Status diretos são mantidos como estão
   */
  private static expandContratoStatusFilters(statusFilters: string[]): {
    statuses: string[];
    includeAtrasados: boolean;
  } {
    const expanded: string[] = [];
    const validStatuses = ['ativo', 'inativo', 'suspenso'];
    let includeAtrasados = false;

    for (const filter of statusFilters) {
      const normalized = filter.toLowerCase().trim();

      if (normalized === 'atrasado') {
        // Contratos atrasados: serão filtrados por data_fim
        includeAtrasados = true;
      } else if (validStatuses.includes(normalized)) {
        // Status válido direto
        expanded.push(normalized);
      }
    }

    return {
      statuses: [...new Set(expanded)],
      includeAtrasados
    };
  }

  private static async handleClientsSync(payload: IntegrationClientsPayload | undefined, res: Response): Promise<void> {
    try {
      const limit = IntegrationWebhookController.parseLimit(payload?.limit);
      const offset = IntegrationWebhookController.parseOffset(payload?.offset);
      const filters: WhereOptions = {};

    // Processar filtro de status de cliente
    const clienteStatus = payload?.clienteStatus ?? (payload?.includeInactive ? 'all' : 'ativo');
    if (clienteStatus === 'ativo') {
      filters.ativo = true;
    } else if (clienteStatus === 'inativo') {
      filters.ativo = false;
    }
    // Se 'all', não aplicar filtro de ativo

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
      contratoStatusFilter = IntegrationWebhookController.expandContratoStatusFilters(payload.contratoStatus);
      
      // Se há filtro de contratos, buscar apenas clientes que têm contratos com esses status
      const contratoWhere: WhereOptions = {};
      const hoje = new Date();
      hoje.setHours(23, 59, 59, 999);
      
      // Se há tanto status quanto atrasados, usar OR para combinar
      if (contratoStatusFilter.statuses.length > 0 && contratoStatusFilter.includeAtrasados) {
        (contratoWhere as Record<symbol, unknown>)[Op.or] = [
          { status: { [Op.in]: contratoStatusFilter.statuses } },
          { data_fim: { [Op.lt]: hoje } }
        ];
      } else if (contratoStatusFilter.statuses.length > 0) {
        // Apenas status
        contratoWhere.status = { [Op.in]: contratoStatusFilter.statuses };
      } else if (contratoStatusFilter.includeAtrasados) {
        // Apenas atrasados
        contratoWhere.data_fim = { [Op.lt]: hoje };
      }
      
      // Se há filtros de contratos, buscar clientes que têm contratos com esses critérios
      if (Object.keys(contratoWhere).length > 0) {
        const clientesComContratos = await Contrato.findAll({
          attributes: ['cliente_id'],
          where: contratoWhere,
          group: ['cliente_id'],
          raw: true
        });

        const clienteIds = clientesComContratos.map((c: { cliente_id: number }) => c.cliente_id);
        
        if (clienteIds.length === 0) {
          // Nenhum cliente tem contratos com esses critérios, retornar vazio
          res.json({
            success: true,
            message: 'Dados de clientes sincronizados com sucesso',
            timestamp: new Date().toISOString(),
            meta: {
              totalClientes: 0,
              retornados: 0,
              limite: limit,
              offset,
              hasMore: false
            },
            data: []
          });
          return;
        }

        // Combinar com filtro de títulos se existir
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
      tituloStatusFilter = IntegrationWebhookController.expandTituloStatusFilters(payload.tituloStatus);
      
      // Se há filtro de títulos, buscar apenas clientes que têm títulos com esses status
      const clientesComTitulos = await Titulo.findAll({
        attributes: ['cliente_id'],
        where: {
          status: { [Op.in]: tituloStatusFilter }
        },
        group: ['cliente_id'],
        raw: true
      });

      const clienteIds = clientesComTitulos.map((t: { cliente_id: number }) => t.cliente_id);
      
      if (clienteIds.length === 0) {
        // Nenhum cliente tem títulos com esses status, retornar vazio
        res.json({
          success: true,
          message: 'Dados de clientes sincronizados com sucesso',
          timestamp: new Date().toISOString(),
          meta: {
            totalClientes: 0,
            retornados: 0,
            limite: limit,
            offset,
            hasMore: false
          },
          data: []
        });
        return;
      }

      // Combinar com filtro de contratos se existir
      if (filters.id && Array.isArray((filters.id as { [Op.in]: number[] })[Op.in])) {
        const existingIds = (filters.id as { [Op.in]: number[] })[Op.in];
        filters.id = { [Op.in]: existingIds.filter((id: number) => clienteIds.includes(id)) };
      } else {
        filters.id = { [Op.in]: clienteIds };
      }
    }

    logger.info('Buscando clientes com filtros', { filters: JSON.stringify(filters) });
    
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
            ...(contratoStatusFilter && (contratoStatusFilter.statuses.length > 0 || contratoStatusFilter.includeAtrasados)
              ? (() => {
                  const contratoWhere: WhereOptions = {};
                  const hoje = new Date();
                  hoje.setHours(23, 59, 59, 999);
                  
                  // Se há tanto status quanto atrasados, usar OR para combinar
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
        offset
      })
    ]);

    logger.info('Clientes encontrados', { total: totalClientes, retornados: clientes.length });

    const clientesFormatados = clientes.map((cliente) => {
      const raw = cliente.toJSON() as unknown as ClienteWithAssociations;

      const planos = (raw.planos ?? []).map((plano) => ({
        id: plano.id,
        nome: plano.nome_plano,
        valorMensal: IntegrationWebhookController.parseNumber(plano.valor_mensal),
        status: plano.status
      }));

      let contratos = (raw.contratos ?? []).map((contrato) => {
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
          modelo: termo.modeloDocumento
            ? {
                id: termo.modeloDocumento.id,
                nome: termo.modeloDocumento.nome,
                tipo: termo.modeloDocumento.tipo
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

      // Filtrar contratos por status se especificado
      if (contratoStatusFilter) {
        contratos = contratos.filter((contrato) => {
          let matchesStatus = false;
          let matchesAtrasado = false;
          
          // Verificar status
          if (contratoStatusFilter.statuses.length > 0) {
            matchesStatus = contratoStatusFilter.statuses.includes(contrato.status);
          } else {
            matchesStatus = true; // Se não há filtro de status, aceita qualquer status
          }
          
          // Verificar se está atrasado (data_fim no passado)
          if (contratoStatusFilter.includeAtrasados) {
            if (contrato.dataFim) {
              const dataFim = new Date(contrato.dataFim);
              const hoje = new Date();
              hoje.setHours(23, 59, 59, 999);
              matchesAtrasado = dataFim < hoje;
            }
          } else {
            matchesAtrasado = true; // Se não há filtro de atrasado, aceita qualquer data
          }
          
          // Se há tanto status quanto atrasados, usar OR (qualquer um dos dois)
          if (contratoStatusFilter.statuses.length > 0 && contratoStatusFilter.includeAtrasados) {
            return matchesStatus || matchesAtrasado;
          }
          
          // Se há apenas um dos filtros, ambos devem ser true
          return matchesStatus && matchesAtrasado;
        });
      }

      let titulos = (raw.titulos ?? []).map((titulo) => {
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao processar clients.sync', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        payload: JSON.stringify(payload)
      });

      res.status(500).json({
        success: false,
        message: 'Erro interno ao processar sincronização de clientes',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
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

  private static async handleTituloGet(payload: IntegrationTituloPayload | undefined, req: Request, res: Response): Promise<void> {
    try {
      if (!payload?.tituloId && !payload?.numeroTitulo) {
        res.status(400).json({
          success: false,
          message: 'É necessário informar tituloId ou numeroTitulo'
        });
        return;
      }

      const where: WhereOptions = {};
      if (payload.tituloId) {
        where.id = payload.tituloId;
      } else if (payload.numeroTitulo) {
        where.numero_titulo = payload.numeroTitulo;
      }

      const format = payload.format || 'json';

      // Se for PDF, buscar com todos os relacionamentos necessários
      if (format === 'pdf') {
        const titulo = await Titulo.findOne({
          where,
          include: [
            { model: Cliente, as: 'cliente' },
            { model: Plano, as: 'plano' },
            { 
              model: Banco, 
              as: 'banco',
              attributes: [
                'id', 'nome', 'codigo', 'tipo_banco', 'client_id_producao', 'client_secret_producao', 'sandbox',
                'url_retorno', 'percentual_multa', 'percentual_juros', 'instrucao_linha_1', 'instrucao_linha_2', 'instrucao_linha_3', 
                'instrucao_linha_4', 'instrucao_linha_5', 'logo'
              ]
            }
          ]
        });

        if (!titulo) {
          res.status(404).json({
            success: false,
            message: 'Título não encontrado'
          });
          return;
        }


        const pdfBase64 = await TituloPDFController.gerarPdfBase64(titulo as TituloComRelacoes);

        if (!pdfBase64) {
          res.status(500).json({
            success: false,
            message: 'Erro ao gerar PDF do boleto'
          });
          return;
        }

        // Converter base64 para Buffer
        const pdfBuffer = Buffer.from(pdfBase64, 'base64');
        
        // Gerar token único
        const token = crypto.randomBytes(32).toString('hex');
        const filename = `boleto-${titulo.numero_titulo}.pdf`;
        
        // Armazenar em cache (expira em 1 hora)
        const expiresAt = Date.now() + (60 * 60 * 1000);
        pdfCache.set(token, {
          buffer: pdfBuffer,
          filename,
          expiresAt
        });

        // Construir URL do PDF baseada no request atual
        // Usar BASE_URL do .env se disponível, senão construir a partir do request
        let baseUrl = process.env.BASE_URL;
        if (!baseUrl) {
          // Construir URL a partir do request (protocol + host)
          const protocol = req.protocol || 'http';
          const host = req.get('host') || '';
          baseUrl = `${protocol}://${host}`;
        }
        const pdfUrl = `${baseUrl}/webhook/integration/pdf/${token}`;

        res.json({
          success: true,
          message: 'PDF do boleto gerado com sucesso',
          timestamp: new Date().toISOString(),
          data: {
            id: titulo.id,
            numero_titulo: titulo.numero_titulo,
            pdf_url: pdfUrl,
            filename,
            expires_at: new Date(expiresAt).toISOString()
          }
        });
        return;
      }

      // Formato JSON (padrão)
      const titulo = await Titulo.findOne({
        where,
        attributes: [
          'id',
          'numero_titulo',
          'valor',
          'status',
          'data_vencimento',
          'qrcode',
          'linha_digitavel',
          'codigo_barras',
          'url_boleto'
        ]
      });

      if (!titulo) {
        res.status(404).json({
          success: false,
          message: 'Título não encontrado'
        });
        return;
      }

      const tituloData = titulo.toJSON();

      // Se fields foi especificado, retornar apenas esses campos
      if (payload.fields && Array.isArray(payload.fields) && payload.fields.length > 0) {
        const filteredData: Record<string, unknown> = {
          id: tituloData.id,
          numero_titulo: tituloData.numero_titulo
        };

        for (const field of payload.fields) {
          const normalizedField = field.toLowerCase().trim();
          if (normalizedField === 'qrcode' || normalizedField === 'qrcode_pix') {
            filteredData.qrcode = tituloData.qrcode;
          } else if (normalizedField === 'linha_digitavel' || normalizedField === 'linha_digitável') {
            filteredData.linha_digitavel = tituloData.linha_digitavel;
          } else if (normalizedField === 'codigo_barras' || normalizedField === 'código_barras') {
            filteredData.codigo_barras = tituloData.codigo_barras;
          } else if (normalizedField === 'url_boleto') {
            filteredData.url_boleto = tituloData.url_boleto;
          } else if (normalizedField === 'valor') {
            filteredData.valor = tituloData.valor;
          } else if (normalizedField === 'status') {
            filteredData.status = tituloData.status;
          } else if (normalizedField === 'data_vencimento') {
            filteredData.data_vencimento = IntegrationWebhookController.formatDate(tituloData.data_vencimento as string | Date | null | undefined);
          }
        }

        res.json({
          success: true,
          message: 'Título encontrado',
          timestamp: new Date().toISOString(),
          data: filteredData
        });
      } else {
        // Retornar todos os campos disponíveis
        res.json({
          success: true,
          message: 'Título encontrado',
          timestamp: new Date().toISOString(),
          data: {
            id: tituloData.id,
            numero_titulo: tituloData.numero_titulo,
            valor: IntegrationWebhookController.parseNumber(tituloData.valor as string | number | null | undefined),
            status: tituloData.status,
            data_vencimento: IntegrationWebhookController.formatDate(tituloData.data_vencimento as string | Date | null | undefined),
            qrcode: tituloData.qrcode,
            linha_digitavel: tituloData.linha_digitavel,
            codigo_barras: tituloData.codigo_barras,
            url_boleto: tituloData.url_boleto
          }
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao buscar título no webhook', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      res.status(500).json({
        success: false,
        message: 'Erro interno ao buscar título'
      });
    }
  }
}


