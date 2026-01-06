import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../../types/auth';
import { getElasticsearchService } from '../../../services/elasticsearch/ElasticsearchService';
import { logger } from '../../../utils/logger';
import { Auditoria } from '../../../models/sistema/Auditoria';
import { Usuario } from '../../../models/cadastros/Usuario';
import { Op, WhereOptions } from 'sequelize';
import { converterLogoParaBase64 } from '../../titulos/TituloHelpers';

export class AuditoriaController {
  /**
   * Listar logs de auditoria
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const elasticsearchService = getElasticsearchService();
      const client = elasticsearchService.getClient();

      if (!client) {
        // Fallback: buscar do banco de dados
        return await AuditoriaController.listFromDatabase(req, res);
      }

      // Verificar conexão
      const isConnected = await elasticsearchService.checkConnection();
      if (!isConnected) {
        // Fallback: buscar do banco de dados
        return await AuditoriaController.listFromDatabase(req, res);
      }

      // Parâmetros de paginação e filtros
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 15;
      const search = req.query.search as string;
      const acao = req.query.acao as string;
      const entidade = req.query.entidade as string;
      const usuario_id = req.query.usuario_id ? parseInt(req.query.usuario_id as string) : undefined;
      const dataInicio = req.query.data_inicio as string;
      const dataFim = req.query.data_fim as string;

      // Construir query do Elasticsearch
      const must: any[] = [];

      if (search) {
        const isRoute = search.startsWith('/api/');
        const isEmail = search.includes('@');
        const isEntity = /^[A-Z][a-zA-Z]*$/.test(search.trim()) && search.trim().length > 2 && !search.includes(' ');
        
        if (isRoute) {
          must.push({
            bool: {
              should: [
                { match_phrase: { rota: { query: search } } },
                { wildcard: { rota: { value: `*${search.toLowerCase()}*` } } }
              ],
              minimum_should_match: 1
            }
          });
        } else if (isEmail) {
          must.push({
            bool: {
              should: [
                { match_phrase: { usuario_email: { query: search } } },
                { wildcard: { usuario_email: { value: `*${search.toLowerCase()}*` } } }
              ],
              minimum_should_match: 1
            }
          });
        } else if (isEntity) {
          must.push({
            bool: {
              should: [
                { term: { entidade: search } },
                { match_phrase: { entidade: { query: search } } }
              ],
              minimum_should_match: 1
            }
          });
        } else {
          must.push({
            multi_match: {
              query: search,
              fields: ['observacoes', 'rota', 'usuario_email', 'usuario_nome'],
              type: 'best_fields',
              operator: 'or'
            }
          });
        }
      }

      if (acao) {
        must.push({ term: { acao: acao } });
      }

      if (entidade) {
        must.push({ term: { entidade: entidade } });
      }

      if (usuario_id) {
        must.push({ term: { usuario_id } });
      }

      if (dataInicio || dataFim) {
        const range: any = {};
        if (dataInicio) {
          range.gte = dataInicio;
        }
        if (dataFim) {
          range.lte = dataFim;
        }
        must.push({ range: { timestamp: range } });
      }

      const query: any = {
        index: elasticsearchService.getIndexName(),
        body: {
          query: {
            bool: {
              must: must.length > 0 ? must : [{ match_all: {} }]
            }
          },
          sort: [
            { timestamp: { order: 'desc' } }
          ],
          from: (page - 1) * limit,
          size: limit
        }
      };

      // Executar busca
      const result = await client.search(query);

      // Contar total
      const countResult = await client.count({
        index: elasticsearchService.getIndexName(),
        body: {
          query: query.body.query
        }
      });

      const total = typeof countResult.count === 'number' ? countResult.count : (countResult.count as any).value || 0;

      const hits = result.hits.hits.map((hit: any) => ({
        id: hit._id,
        ...hit._source
      }));

      res.json({
        success: true,
        data: hits,
        pagination: {
          current_page: page,
          last_page: Math.ceil(total / limit),
          per_page: limit,
          total,
          from: (page - 1) * limit + 1,
          to: Math.min(page * limit, total)
        }
      });
    } catch (error) {
      // Tentar fallback para banco de dados sem logar erro (é esperado que possa falhar)
      try {
        return await AuditoriaController.listFromDatabase(req, res);
      } catch (fallbackError) {
        logger.error('Erro ao buscar logs de auditoria (Elasticsearch e banco de dados falharam)', {
          context: 'AuditoriaController',
          action: 'list',
          elasticsearchError: error instanceof Error ? error.message : 'Erro desconhecido',
          databaseError: fallbackError instanceof Error ? fallbackError.message : 'Erro desconhecido'
        });

        res.status(500).json({
          success: false,
          message: 'Erro ao buscar logs de auditoria',
          error: fallbackError instanceof Error ? fallbackError.message : 'Erro desconhecido'
        });
      }
    }
  }

  /**
   * Listar logs de auditoria do banco de dados (fallback quando Elasticsearch não está disponível)
   */
  static async listFromDatabase(req: Request, res: Response): Promise<void> {
    try {
      // Parâmetros de paginação e filtros
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 15;
      const search = req.query.search as string;
      const acao = req.query.acao as string;
      const entidade = req.query.entidade as string;
      const usuario_id = req.query.usuario_id ? parseInt(req.query.usuario_id as string) : undefined;
      const dataInicio = req.query.data_inicio as string;
      const dataFim = req.query.data_fim as string;

      const offset = (page - 1) * limit;

      // Construir condições WHERE
      const where: WhereOptions = {};

      if (acao) {
        where.acao = acao as any;
      }

      if (entidade) {
        where.entidade = entidade;
      }

      if (usuario_id) {
        where.usuario_id = usuario_id;
      }

      if (dataInicio || dataFim) {
        where.created_at = {};
        if (dataInicio) {
          where.created_at[Op.gte] = new Date(dataInicio);
        }
        if (dataFim) {
          where.created_at[Op.lte] = new Date(dataFim);
        }
      }

      // Buscar logs com usuário incluído
      const { count, rows } = await Auditoria.findAndCountAll({
        where,
        include: [{
          model: Usuario,
          as: 'usuario',
          required: false,
          attributes: ['id', 'nome', 'email']
        }],
        order: [['created_at', 'DESC']],
        limit,
        offset
      });

      // Filtrar por busca se fornecido
      let filteredRows = rows;
      if (search) {
        const searchLower = search.toLowerCase();
        const isRoute = search.startsWith('/api/');
        const isEmail = search.includes('@');
        const isEntity = /^[A-Z][a-zA-Z]*$/.test(search.trim()) && search.trim().length > 2 && !search.includes(' ');

        filteredRows = rows.filter((log: any) => {
          if (isRoute) {
            const dadosAnterioresStr = JSON.stringify(log.dados_anteriores || {}).toLowerCase();
            const dadosNovosStr = JSON.stringify(log.dados_novos || {}).toLowerCase();
            return dadosAnterioresStr.includes(searchLower) || dadosNovosStr.includes(searchLower);
          }
          
          if (isEmail) {
            const usuarioEmail = log.usuario?.email?.toLowerCase() || '';
            return usuarioEmail.includes(searchLower);
          }
          
          if (isEntity) {
            const entidadeNome = log.entidade?.toLowerCase() || '';
            return entidadeNome === searchLower;
          }

          const observacoes = log.observacoes?.toLowerCase() || '';
          const entidadeNome = log.entidade?.toLowerCase() || '';
          const usuarioNome = log.usuario?.nome?.toLowerCase() || '';
          const usuarioEmail = log.usuario?.email?.toLowerCase() || '';
          const ipAddress = log.ip_address?.toLowerCase() || '';
          
          return observacoes.includes(searchLower) ||
                 entidadeNome.includes(searchLower) ||
                 usuarioNome.includes(searchLower) ||
                 usuarioEmail.includes(searchLower) ||
                 ipAddress.includes(searchLower);
        });
      }

      // Mapear para formato esperado pelo frontend
      const logs = filteredRows.map((log: any) => ({
        id: log.id.toString(),
        usuario_id: log.usuario_id,
        usuario_nome: log.usuario?.nome || null,
        usuario_email: log.usuario?.email || null,
        acao: log.acao,
        entidade: log.entidade,
        entidade_id: log.entidade_id,
        dados_anteriores: log.dados_anteriores,
        dados_novos: log.dados_novos,
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        rota: null,
        metodo_http: null,
        observacoes: log.observacoes,
        timestamp: log.created_at.toISOString()
      }));

      const total = search ? filteredRows.length : count;

      res.json({
        success: true,
        data: logs,
        pagination: {
          current_page: page,
          last_page: Math.ceil(total / limit),
          per_page: limit,
          total,
          from: total > 0 ? (page - 1) * limit + 1 : 0,
          to: Math.min(page * limit, total)
        }
      });
    } catch (error) {
      logger.error('Erro ao buscar logs de auditoria do banco de dados', {
        context: 'AuditoriaController',
        action: 'listFromDatabase',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      });

      res.status(500).json({
        success: false,
        message: 'Erro ao buscar logs de auditoria',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Buscar log específico por ID
   */
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const elasticsearchService = getElasticsearchService();
      const client = elasticsearchService.getClient();

      if (!client) {
        res.status(503).json({
          success: false,
          message: 'Elasticsearch não está configurado'
        });
        return;
      }

      const result = await client.get({
        index: elasticsearchService.getIndexName(),
        id
      });

      res.json({
        success: true,
        data: {
          id: result._id,
          ...(result._source as Record<string, unknown>)
        }
      });
    } catch (error: any) {
      if (error.statusCode === 404) {
        res.status(404).json({
          success: false,
          message: 'Log de auditoria não encontrado'
        });
        return;
      }

      logger.error('Erro ao buscar log de auditoria', {
        context: 'AuditoriaController',
        action: 'getById',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });

      res.status(500).json({
        success: false,
        message: 'Erro ao buscar log de auditoria',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Obter estatísticas de auditoria
   */
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const elasticsearchService = getElasticsearchService();
      const client = elasticsearchService.getClient();

      if (!client) {
        res.status(503).json({
          success: false,
          message: 'Elasticsearch não está configurado'
        });
        return;
      }

      // Agregações para estatísticas
      const result = await client.search({
        index: elasticsearchService.getIndexName(),
        body: {
          size: 0,
          aggs: {
            acoes: {
              terms: { field: 'acao', size: 10 }
            },
            entidades: {
              terms: { field: 'entidade', size: 10 }
            },
            usuarios: {
              terms: { field: 'usuario_id', size: 10 }
            }
          }
        }
      });

      const total = typeof result.hits.total === 'number' 
        ? result.hits.total 
        : (result.hits.total as any)?.value || 0;

      // Fazer cast das agregações para o tipo correto
      const acoesAgg = result.aggregations?.acoes as any;
      const entidadesAgg = result.aggregations?.entidades as any;
      const usuariosAgg = result.aggregations?.usuarios as any;

      res.json({
        success: true,
        data: {
          total,
          acoes: acoesAgg?.buckets || [],
          entidades: entidadesAgg?.buckets || [],
          usuarios: usuariosAgg?.buckets || []
        }
      });
    } catch (error) {
      logger.error('Erro ao buscar estatísticas de auditoria', {
        context: 'AuditoriaController',
        action: 'getStats',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });

      res.status(500).json({
        success: false,
        message: 'Erro ao buscar estatísticas de auditoria',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Buscar logs de auditoria por entidade e entidade_id
   */
  static async getByEntity(req: Request, res: Response): Promise<void> {
    try {
      const { entidade, entidade_id } = req.query;
      
      if (!entidade || !entidade_id) {
        res.status(400).json({
          success: false,
          message: 'Parâmetros entidade e entidade_id são obrigatórios'
        });
        return;
      }

      const elasticsearchService = getElasticsearchService();
      const client = elasticsearchService.getClient();

      if (!client) {
        res.status(503).json({
          success: false,
          message: 'Elasticsearch não está configurado'
        });
        return;
      }

      const isConnected = await elasticsearchService.checkConnection();
      if (!isConnected) {
        res.status(503).json({
          success: false,
          message: 'Elasticsearch não está disponível'
        });
        return;
      }

      // Buscar todos os logs da entidade específica, ordenados por timestamp
      const result = await client.search({
        index: elasticsearchService.getIndexName(),
        body: {
          query: {
            bool: {
              must: [
                { term: { entidade: entidade as string } },
                { term: { entidade_id: parseInt(entidade_id as string) } }
              ]
            }
          },
          sort: [
            { timestamp: { order: 'asc' } }
          ],
          size: 1000 // Limite alto para pegar todos os logs
        }
      });

      const hits = result.hits.hits.map((hit: any) => ({
        id: hit._id,
        ...hit._source
      }));

      res.json({
        success: true,
        data: hits
      });
    } catch (error) {
      logger.error('Erro ao buscar logs de auditoria por entidade', {
        context: 'AuditoriaController',
        action: 'getByEntity',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      });

      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao buscar logs de auditoria'
      });
    }
  }

  /**
   * Gerar PDF de auditoria para uma entidade específica
   */
  static async generatePdf(req: Request, res: Response): Promise<void> {
    const { entidade, entidade_id } = req.query;
    
    try {
      if (!entidade || !entidade_id) {
        res.status(400).json({
          success: false,
          message: 'Parâmetros entidade e entidade_id são obrigatórios'
        });
        return;
      }

      const elasticsearchService = getElasticsearchService();
      const client = elasticsearchService.getClient();

      if (!client) {
        res.status(503).json({
          success: false,
          message: 'Elasticsearch não está configurado'
        });
        return;
      }

      const isConnected = await elasticsearchService.checkConnection();
      if (!isConnected) {
        res.status(503).json({
          success: false,
          message: 'Elasticsearch não está disponível'
        });
        return;
      }

      const result = await client.search({
        index: elasticsearchService.getIndexName(),
        body: {
          query: {
            bool: {
              must: [
                { term: { entidade: entidade as string } },
                { term: { entidade_id: parseInt(entidade_id as string) } }
              ]
            }
          },
          sort: [
            { timestamp: { order: 'desc' } }
          ],
          size: 200
        }
      });

      const logs = [...result.hits.hits].reverse().map((hit: any) => hit._source);

      if (logs.length === 0) {
        logger.warn('Nenhum log encontrado', {
          context: 'AuditoriaController',
          action: 'generatePdf',
          entidade: entidade as string,
          entidade_id: entidade_id as string
        });
        res.status(404).json({
          success: false,
          message: 'Nenhum log de auditoria encontrado para este registro'
        });
        return;
      }

      const { DadosEmpresa } = await import('../../../models/sistema/DadosEmpresa');
      const dadosEmpresa = await DadosEmpresa.findOne();

      const html = AuditoriaController.generateAuditPdfHtml(logs, entidade as string, dadosEmpresa);
      const { PDFGenerationService } = await import('../../../services/pdf-generation/PDFGenerationService');
      const pdfBuffer = await PDFGenerationService.generateFromHtml(
        html,
        'html-pdf-node',
        {
          format: 'A4',
          margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' },
          printBackground: true
        }
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="auditoria-${entidade}-${entidade_id}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      logger.error('Erro ao gerar PDF de auditoria', {
        context: 'AuditoriaController',
        action: 'generatePdf',
        error: errorMessage,
        entidade: entidade as string,
        entidade_id: entidade_id as string
      });

      res.status(500).json({
        success: false,
        message: `Erro ao gerar PDF de auditoria: ${errorMessage}`
      });
    }
  }

  /**
   * Gera HTML do PDF de auditoria
   */
  private static generateAuditPdfHtml(
    logs: any[],
    entidade: string,
    dadosEmpresa: any
  ): string {
    const escapeHtml = (text: unknown): string => {
      if (text === null || text === undefined) {
        return '';
      }
      const str = String(text);
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    const formatDate = (date: string) => {
      try {
        return new Date(date).toLocaleString('pt-BR');
      } catch {
        return date;
      }
    };

    const formatAcao = (acao: string) => {
      const acoes: Record<string, string> = {
        create: 'Criou',
        update: 'Editou',
        delete: 'Excluiu',
        login: 'Login',
        logout: 'Logout'
      };
      return acoes[acao] || acao;
    };

    const formatarValor = (value: unknown): string => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
      return typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
    };

    const camposExcluir = [
      'createdAt', 'updatedAt', 'created_at', 'updated_at',
      'content', 'html', 'body', 'texto', 'text',
      'descricao_completa', 'observacoes', 'observacoes_completas'
    ];
    
    const gerarCamposHtml = (dados: any): string => {
      if (!dados || typeof dados !== 'object') return '';
      
      return Object.entries(dados)
        .filter(([key]) => !camposExcluir.includes(key))
        .map(([key, value]) => `
          <tr>
            <td>${escapeHtml(key)}</td>
            <td>${escapeHtml(formatarValor(value))}</td>
          </tr>
        `).join('');
    };

    const empresaNome = escapeHtml(dadosEmpresa?.razao_social || dadosEmpresa?.nome_fantasia || 'Empresa');
    const empresaEmail = escapeHtml(dadosEmpresa?.email || '');
    const empresaEndereco = dadosEmpresa?.endereco ? 
      escapeHtml(`${dadosEmpresa.endereco}${dadosEmpresa.numero ? ', ' + dadosEmpresa.numero : ''} - ${dadosEmpresa.cidade || ''} - ${dadosEmpresa.estado || ''} - ${dadosEmpresa.cep || ''}`) : '';
    const empresaTelefone = escapeHtml(dadosEmpresa?.telefone || '');
    const empresaLogo = dadosEmpresa?.logo ? converterLogoParaBase64(dadosEmpresa.logo) : null;
    const dataGeracao = new Date().toLocaleString('pt-BR');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Relatórios de logs</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 10pt !important;
      margin: 0;
      padding: 10px;
      text-size-adjust: none !important;
      -webkit-text-size-adjust: none !important;
      -moz-text-size-adjust: none !important;
    }
    .audit-item {
      margin-bottom: 10px;
    }
    .header {
      margin-bottom: 15px;
      border-bottom: 1px solid #333;
      padding-bottom: 8px;
      display: flex;
      align-items: flex-start;
      gap: 15px;
    }
    .header-logo {
      flex-shrink: 0;
      max-width: 120px;
      max-height: 80px;
    }
    .header-logo img {
      max-width: 100%;
      max-height: 80px;
      object-fit: contain;
    }
    .header-content {
      flex: 1;
    }
    .header h1 {
      margin: 0;
      font-size: 11pt;
      font-weight: bold;
    }
    .header-info {
      font-size: 8pt;
      margin-top: 3px;
    }
    .data-table {
      width: 100%;
      table-layout: auto;
      border-collapse: collapse;
      border: 1px solid #666;
      font-size: 8pt !important;
    }
    .data-table thead {
      display: table-row-group;
    }
    .data-table td {
      padding: 5px 8px;
      font-size: 8pt !important;
      text-size-adjust: none !important;
      -webkit-text-size-adjust: none !important;
      -moz-text-size-adjust: none !important;
    }
    .data-table thead td {
      border: 1px solid #666;
      background-color: #555;
      color: #fff;
      font-weight: bold;
    }
    .data-table tbody td {
      border: 1px solid #ddd;
      word-wrap: break-word;
      word-break: break-word;
      overflow-wrap: break-word;
      white-space: normal;
    }
    .data-table td:first-child {
      width: 1%;
      white-space: nowrap;
      font-weight: bold;
    }
    .data-table td:last-child {
      width: auto;
    }
    .data-table tbody td:first-child {
      background-color: #f9f9f9;
    }
    .data-table tbody td:last-child {
      word-wrap: break-word;
      word-break: break-word;
      overflow-wrap: break-word;
      white-space: normal;
    }
    h2 {
      font-size: 12pt;
      margin: 15px 0 10px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    ${empresaLogo ? `
      <div class="header-logo">
        <img src="${empresaLogo}" alt="Logo" />
      </div>
    ` : ''}
    <div class="header-content">
      <h1>${empresaNome}</h1>
      <div class="header-info">
        ${empresaEmail ? `<div>Email: ${empresaEmail}</div>` : ''}
        ${empresaEndereco ? `<div>Endereço: ${empresaEndereco}</div>` : ''}
        ${empresaTelefone ? `<div>Telefone: ${empresaTelefone}</div>` : ''}
        <div>Data de geração: ${dataGeracao}</div>
      </div>
    </div>
  </div>

  <h2>Relatórios de logs</h2>

  ${logs.map((log, index) => {
    try {
      const acaoFormatada = formatAcao(log.acao);
      const dataFormatada = formatDate(log.timestamp);
      const usuarioNome = log.usuario_nome || log.usuario_email || 'N/A';
      const dadosLog = log.dados_novos || log.dados_anteriores || {};
      const dadosHtml = gerarCamposHtml(dadosLog);
      const marginTop = index > 0 ? 'margin-top: 10px;' : '';

      return `
        <div class="audit-item" style="${marginTop}">
          <table class="data-table">
            <thead>
              <tr>
                <td colspan="2" style="font-weight: normal;">
                  <strong>Forma:</strong> Sistema | 
                  <strong>Usuário:</strong> ${escapeHtml(usuarioNome)} | 
                  <strong>Operação:</strong> ${escapeHtml(acaoFormatada)} | 
                  <strong>Data:</strong> ${escapeHtml(dataFormatada)}
                </td>
              </tr>
              <tr>
                <td style="border-top: 1px solid #666;">Campo</td>
                <td style="border-top: 1px solid #666;">Valor</td>
              </tr>
            </thead>
            <tbody>
              ${dadosHtml || '<tr><td colspan="2">Sem dados disponíveis</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    } catch {
      return `<div>Erro ao processar log ${index + 1}</div>`;
    }
  }).join('')}
</body>
</html>
    `;
  }
}

export default AuditoriaController;

