import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { getElasticsearchService } from '../services/elasticsearch/ElasticsearchService';
import { logger } from '../utils/logger';

export class AuditoriaController {
  /**
   * Listar logs de auditoria
   */
  static async list(req: Request, res: Response): Promise<void> {
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

      // Verificar conexão
      const isConnected = await elasticsearchService.checkConnection();
      if (!isConnected) {
        res.status(503).json({
          success: false,
          message: 'Elasticsearch não está disponível'
        });
        return;
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
        must.push({
          multi_match: {
            query: search,
            fields: ['observacoes', 'rota', 'usuario_email', 'usuario_nome'],
            type: 'phrase_prefix'
          }
        });
      }

      if (acao) {
        must.push({ term: { acao } });
      }

      if (entidade) {
        must.push({ term: { entidade } });
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
      logger.error('Erro ao buscar logs de auditoria', {
        context: 'AuditoriaController',
        action: 'list',
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
                { term: { entidade } },
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

      // Buscar todos os logs
      const result = await client.search({
        index: elasticsearchService.getIndexName(),
        body: {
          query: {
            bool: {
              must: [
                { term: { entidade } },
                { term: { entidade_id: parseInt(entidade_id as string) } }
              ]
            }
          },
          sort: [
            { timestamp: { order: 'asc' } }
          ],
          size: 1000
        }
      });

      const logs = result.hits.hits.map((hit: any) => hit._source);

      if (logs.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Nenhum log de auditoria encontrado para este registro'
        });
        return;
      }

      // Buscar dados da empresa para o cabeçalho do PDF
      const { DadosEmpresa } = await import('../models/DadosEmpresa');
      const dadosEmpresa = await DadosEmpresa.findOne();

      // Gerar HTML do PDF
      const html = AuditoriaController.generateAuditPdfHtml(logs, entidade as string, parseInt(entidade_id as string), dadosEmpresa);

      // Gerar PDF usando PDFGenerationService com Puppeteer
      const { PDFGenerationService } = await import('../services/pdf-generation/PDFGenerationService');
      const pdfBuffer = await PDFGenerationService.generateFromHtml(
        html,
        'puppeteer',
        {
          format: 'A4',
          margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
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
    entidadeId: number,
    dadosEmpresa: any
  ): string {
    // Função para escapar caracteres HTML
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

    // Função auxiliar para formatar valor
    const formatarValor = (value: unknown): string => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
      if (typeof value === 'object') return JSON.stringify(value, null, 2);
      return String(value);
    };

    // Função auxiliar para gerar HTML dos campos
    const gerarCamposHtml = (dados: any): string => {
      if (!dados || typeof dados !== 'object') return '';
      
      return Object.entries(dados)
        .filter(([key]) => !['createdAt', 'updatedAt', 'created_at', 'updated_at'].includes(key))
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
      font-size: 8pt;
      margin: 0;
      padding: 10px;
    }
    .header {
      margin-bottom: 15px;
      border-bottom: 1px solid #333;
      padding-bottom: 8px;
    }
    .header h1 {
      margin: 0;
      font-size: 11pt;
      font-weight: bold;
    }
    .header-info {
      font-size: 7pt;
      margin-top: 3px;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 7pt;
      border: 1px solid #ddd;
    }
    .data-table thead td {
      border: 1px solid #ddd;
      padding: 4px 6px;
      background-color: #f0f0f0;
      font-weight: bold;
    }
    .data-table tbody td {
      border: 1px solid #ddd;
      padding: 4px 6px;
    }
    .data-table tbody td:first-child {
      font-weight: bold;
      background-color: #f9f9f9;
      width: 30%;
    }
    .page-break {
      page-break-after: always;
    }
    h2 {
      font-size: 10pt;
      margin: 15px 0 10px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${empresaNome}</h1>
    <div class="header-info">
      ${empresaEmail ? `<div>Email: ${empresaEmail}</div>` : ''}
      ${empresaEndereco ? `<div>Endereço: ${empresaEndereco}</div>` : ''}
      ${empresaTelefone ? `<div>Telefone: ${empresaTelefone}</div>` : ''}
      <div>Data de geração: ${dataGeracao}</div>
    </div>
  </div>

  <h2>Relatórios de logs</h2>

  ${logs.map((log, index) => {
    try {
      const acaoFormatada = formatAcao(log.acao);
      const dataFormatada = formatDate(log.timestamp);
      const usuarioNome = log.usuario_nome || log.usuario_email || 'N/A';
      
      // Obter dados do log (anteriores ou novos)
      const dadosLog = log.dados_novos || log.dados_anteriores || {};
      const dadosHtml = gerarCamposHtml(dadosLog);

    return `
      <div style="margin-bottom: 0; font-size: 7pt; padding: 4px 6px; background-color: #f5f5f5; border: 1px solid #ddd; ${index > 0 ? 'margin-top: 0;' : ''}">
        <strong>Forma:</strong> Sistema | 
        <strong>Usuário:</strong> ${escapeHtml(usuarioNome)} | 
        <strong>Operação:</strong> ${escapeHtml(acaoFormatada)} | 
        <strong>Data:</strong> ${escapeHtml(dataFormatada)}
      </div>
      <table class="data-table" style="margin-bottom: 0; margin-top: 0;">
        <thead>
          <tr style="background-color: #f0f0f0;">
            <td style="font-weight: bold;">Campo</td>
            <td style="font-weight: bold;">Valor</td>
          </tr>
        </thead>
        <tbody>
          ${dadosHtml || '<tr><td colspan="2">Sem dados disponíveis</td></tr>'}
        </tbody>
      </table>
      ${index < logs.length - 1 ? '<div class="page-break"></div>' : ''}
    `;
    } catch (logError) {
      return `<div>Erro ao processar log ${index + 1}</div>`;
    }
  }).join('')}
</body>
</html>
    `;
  }
}

export default AuditoriaController;

