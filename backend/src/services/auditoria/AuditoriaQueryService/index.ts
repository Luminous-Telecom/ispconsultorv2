import { Op, WhereOptions } from 'sequelize';
import { Auditoria } from '../../../models/sistema/Auditoria';
import { Usuario } from '../../../models/cadastros/Usuario';
import { getElasticsearchService } from '../../elasticsearch/ElasticsearchService';

export class AuditoriaQueryService {
  /**
   * Constrói query do Elasticsearch para busca de auditoria
   */
  static buildElasticsearchQuery(params: {
    search?: string;
    acao?: string;
    entidade?: string;
    usuario_id?: number;
    dataInicio?: string;
    dataFim?: string;
  }): { must: any[] } {
    const { search, acao, entidade, usuario_id, dataInicio, dataFim } = params;
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
      must.push({ term: { usuario_id: usuario_id } });
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

    return { must };
  }

  /**
   * Constrói filtros do Sequelize para busca no banco de dados
   */
  static buildDatabaseFilters(params: {
    search?: string;
    acao?: string;
    entidade?: string;
    usuario_id?: number;
    dataInicio?: string;
    dataFim?: string;
  }): WhereOptions {
    const { search, acao, entidade, usuario_id, dataInicio, dataFim } = params;
    const where: WhereOptions = {};

    if (acao) {
      where.acao = acao;
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

    if (search) {
      (where as any)[Op.or] = [
        { observacoes: { [Op.like]: `%${search}%` } }
      ];
    }

    return where;
  }

  /**
   * Busca auditoria do Elasticsearch
   */
  static async searchFromElasticsearch(params: {
    page: number;
    limit: number;
    search?: string;
    acao?: string;
    entidade?: string;
    usuario_id?: number;
    dataInicio?: string;
    dataFim?: string;
  }): Promise<{ logs: any[]; total: number }> {
    const elasticsearchService = getElasticsearchService();
    const client = elasticsearchService.getClient();

    if (!client) {
      throw new Error('Elasticsearch client não disponível');
    }

    const { page, limit, ...queryParams } = params;
    const { must } = this.buildElasticsearchQuery(queryParams);

    const query: any = {
      index: elasticsearchService.getIndexName(),
        body: {
          query: {
            bool: {
              must: must.length > 0 ? must : [{ match_all: {} }]
            }
          },
          sort: [{ timestamp: { order: 'desc' } }],
          from: (page - 1) * limit,
          size: limit
        }
      };

      const result = await client.search(query);

      const countResult = await client.count({
        index: elasticsearchService.getIndexName(),
        body: {
          query: query.body.query
        }
      });

      const total = typeof countResult.count === 'number' ? countResult.count : (countResult.count as any).value || 0;

      const logs = result.hits.hits.map((hit: any) => ({
        id: hit._id,
        ...hit._source
      }));

      return { logs, total };
  }

  /**
   * Busca auditoria do banco de dados
   */
  static async searchFromDatabase(params: {
    page: number;
    limit: number;
    search?: string;
    acao?: string;
    entidade?: string;
    usuario_id?: number;
    dataInicio?: string;
    dataFim?: string;
  }): Promise<{ logs: any[]; total: number }> {
    const { page, limit, ...filterParams } = params;
    const where = this.buildDatabaseFilters(filterParams);

    const { count, rows } = await Auditoria.findAndCountAll({
      where,
      limit,
      offset: (page - 1) * limit,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: require('../../../models/cadastros/Usuario').Usuario,
          as: 'usuario',
          attributes: ['id', 'nome', 'email']
        }
      ]
    });

    const logs = rows.map(log => ({
      id: log.id,
      acao: log.acao,
      entidade: log.entidade,
      entidade_id: log.entidade_id,
      observacoes: log.observacoes,
      rota: (log as any).rota || null,
      usuario_id: log.usuario_id,
      usuario_nome: (log as any).usuario?.nome || null,
      usuario_email: (log as any).usuario?.email || null,
      dados_anteriores: log.dados_anteriores,
      dados_novos: log.dados_novos,
      timestamp: log.created_at
    }));

    return { logs, total: count };
  }
}
