import { Titulo } from '../../../models/financeiro/Titulo';
import { Cliente } from '../../../models/clientes/Cliente';
import { Contrato } from '../../../models/contratos/Contrato';
import { Plano } from '../../../models/cadastros/Plano';
import { Banco } from '../../../models/cadastros/Banco';
import { Op, WhereOptions, Transaction } from 'sequelize';
import { sequelize } from '../../../config/database';
import { logger } from '../../../utils/logger';
import { buildDateFilter, buildNumericSearchFilter, combineFilters } from '../../../utils/queryFilters';
import { SortHelper } from '../../../utils/sortHelper';
import { TITULO_SORT_CONFIG } from '../../../config/sortConfigs';

export interface ListTitulosFilters {
  page?: number;
  limit?: number;
  status?: string;
  cliente_id?: string | number;
  data_vencimento_inicio?: string;
  data_vencimento_fim?: string;
  search?: string;
  searchField?: string;
  sortColumn?: string;
  sortDirection?: string;
}

export interface ListTitulosResponse {
  success: boolean;
  data: Titulo[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
  };
}

export class TituloService {
  /**
   * Buscar IDs de clientes que têm títulos com status específicos
   * Usado para filtros em webhooks
   */
  static async getClienteIdsByStatus(statuses: string[]): Promise<number[]> {
    const titulos = await Titulo.findAll({
      attributes: ['cliente_id'],
      where: {
        status: { [Op.in]: statuses }
      },
      group: ['cliente_id'],
      raw: true
    });

    return titulos.map((t: { cliente_id: number }) => t.cliente_id);
  }

  /**
   * Listar títulos com filtros e paginação
   */
  static async list(filters: ListTitulosFilters): Promise<ListTitulosResponse> {
    const {
      page = 1,
      limit = 10,
      status,
      cliente_id,
      data_vencimento_inicio,
      data_vencimento_fim,
      search,
      searchField,
      sortColumn,
      sortDirection
    } = filters;



    const limitNum = Number(limit);
    const pageNum = Number(page);
    const offset = (pageNum - 1) * limitNum;

    // Construir filtros usando helpers
    const whereConditions: (WhereOptions | null)[] = [];

    // Filtro de status (suporta múltiplos: "pago,pago_atraso,parcial")
    if (status) {
      if (typeof status === 'string' && status.startsWith('!')) {
        whereConditions.push({ status: { [Op.ne]: status.substring(1) } } as WhereOptions);
      } else if (typeof status === 'string' && status.includes(',')) {
        const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
        if (statuses.length > 0) {
          whereConditions.push({ status: { [Op.in]: statuses } } as WhereOptions);
        }
      } else {
        whereConditions.push({ status } as WhereOptions);
      }
    }

    // Filtro de cliente
    if (cliente_id) {
      whereConditions.push({ cliente_id } as WhereOptions);
    }

    // Filtro de data usando helper
    whereConditions.push(buildDateFilter(data_vencimento_inicio, data_vencimento_fim, 'data_vencimento'));

    if (search && String(search).trim()) {
      const term = String(search).trim();
      const likePattern = `%${term.replace(/[%_\\]/g, '\\$&')}%`;
      const termNum = Number(term);
      const isNumericSearch = !isNaN(termNum) && term !== '';

      const field = typeof searchField === 'string' ? searchField : undefined;
      const orConditions: WhereOptions[] = [];

      const addMultiFieldSearch = () => {
        orConditions.push(
          { numero_titulo: { [Op.like]: likePattern } } as WhereOptions,
          { status: { [Op.like]: likePattern } } as WhereOptions,
          { charge_id: { [Op.like]: likePattern } } as WhereOptions,
          { nosso_numero: { [Op.like]: likePattern } } as WhereOptions,
          { '$cliente.razao_social$': { [Op.like]: likePattern } } as WhereOptions,
          { '$cliente.nome_fantasia$': { [Op.like]: likePattern } } as WhereOptions,
          { '$plano.nome_plano$': { [Op.like]: likePattern } } as WhereOptions
        );

        if (isNumericSearch) {
          orConditions.push(
            { id: termNum } as WhereOptions,
            { valor: termNum } as WhereOptions,
            { valor_pago: termNum } as WhereOptions,
            { contrato_id: termNum } as WhereOptions
          );
        }
      };

      if (field) {
        switch (field) {
          case 'id':
            if (isNumericSearch) orConditions.push({ id: termNum } as WhereOptions);
            break;
          case 'numero_titulo':
            orConditions.push({ numero_titulo: { [Op.like]: likePattern } } as WhereOptions);
            break;
          case 'status':
            orConditions.push({ status: { [Op.like]: likePattern } } as WhereOptions);
            break;
          case 'charge_id':
            orConditions.push({ charge_id: { [Op.like]: likePattern } } as WhereOptions);
            break;
          case 'nosso_numero':
            orConditions.push({ nosso_numero: { [Op.like]: likePattern } } as WhereOptions);
            break;
          case 'contrato_id':
            if (isNumericSearch) orConditions.push({ contrato_id: termNum } as WhereOptions);
            break;
          case 'valor':
            if (isNumericSearch) {
              const numericFilter = buildNumericSearchFilter(term, 'valor', 0.1);
              if (numericFilter) orConditions.push(numericFilter);
            }
            break;
          case 'valor_pago':
            if (isNumericSearch) {
              const numericFilter = buildNumericSearchFilter(term, 'valor_pago', 0.1);
              if (numericFilter) orConditions.push(numericFilter);
            }
            break;
          case 'cliente':
            orConditions.push(
              { '$cliente.razao_social$': { [Op.like]: likePattern } } as WhereOptions,
              { '$cliente.nome_fantasia$': { [Op.like]: likePattern } } as WhereOptions
            );
            break;
          case 'plano':
            orConditions.push({ '$plano.nome_plano$': { [Op.like]: likePattern } } as WhereOptions);
            break;
          default:
            addMultiFieldSearch();
            break;
        }
      } else {
        addMultiFieldSearch();
      }

      if (orConditions.length === 0) {
        whereConditions.push({ id: { [Op.eq]: -1 } } as WhereOptions);
      } else {
        whereConditions.push({ [Op.or]: orConditions } as WhereOptions);
      }
    }

    // Combinar todos os filtros
    const where = combineFilters(...whereConditions) || {};

    // Construir ordenação - ordena TODOS os dados antes da paginação
    let order: any[] = [['id', 'DESC']]; // Padrão
    if (sortColumn && sortDirection) {
      const sortResult = SortHelper.buildOrder(
        TITULO_SORT_CONFIG,
        sortColumn,
        sortDirection.toUpperCase() as 'ASC' | 'DESC'
      );

      if (sortResult.isValid) {
        order = sortResult.order;
      } else {
        logger.warn('TituloService.list - Coluna de ordenação inválida', {
          column: sortColumn,
          error: sortResult.error
        });
        // Manter ordenação padrão se coluna inválida
      }
    }

    const { NotaFiscal } = await import('../../../models/nfse/NotaFiscal');
    
    const include = [
      { model: Cliente, as: 'cliente', attributes: ['id', 'razao_social', 'nome_fantasia', 'cnpj', 'email'], required: false },
      { model: Plano, as: 'plano', attributes: ['id', 'nome_plano', 'valor_mensal'], required: false },
      { model: Banco, as: 'banco', attributes: ['id', 'nome', 'tipo_banco', 'logo', 'codigo', 'api_key', 'sandbox'], required: false },
      { model: NotaFiscal, as: 'nota_fiscal', attributes: ['id', 'numero', 'nfse_status'], required: false }
    ];

    let count: number;
    let rows: Titulo[];
    try {
      const result = await Titulo.findAndCountAll({
        where,
        include,
        order,
        limit: limitNum,
        offset,
        distinct: true,
        subQuery: false
      });
      count = result.count as number;
      rows = result.rows;
    } catch (queryError: any) {
      logger.error('TituloService.list - Erro na query', {
        error: queryError.message,
        sortColumn: filters.sortColumn,
        sortDirection: filters.sortDirection
      });
      throw queryError;
    }


    const from = count > 0 ? offset + 1 : 0;
    const to = count > 0 ? Math.min(offset + limitNum, count) : 0;

    return {
      success: true,
      data: rows,
      pagination: {
        current_page: pageNum,
        per_page: limitNum,
        total: count,
        last_page: Math.ceil(count / limitNum),
        from,
        to
      }
    };
  }

  /**
   * Buscar título por ID
   */
  static async getById(id: string | number, transaction?: Transaction): Promise<Titulo | null> {
    try {
      const { NotaFiscal } = await import('../../../models/nfse/NotaFiscal');
      
      const titulo = await Titulo.findByPk(id, {
        include: [
          { association: 'cliente', required: false },
          { 
            association: 'contrato', 
            required: false,
            include: [
              { 
                association: 'bancoBoleto', 
                required: false,
                attributes: ['id', 'nome', 'tipo_banco', 'logo', 'codigo', 'api_key', 'sandbox'] // Incluir api_key para cancelamento
              }
            ]
          },
          { association: 'plano', required: false },
          { 
            association: 'banco', 
            required: false,
            attributes: ['id', 'nome', 'tipo_banco', 'logo', 'codigo', 'api_key', 'sandbox'] // Incluir api_key para cancelamento
          },
          { association: 'nota_fiscal', required: false }
        ],
        transaction
      });

      // Se o título não tem banco_id mas tem contrato com banco, usar o banco do contrato
      if (titulo) {
        const tituloAny = titulo as any;
        if (!tituloAny.banco && tituloAny.contrato && tituloAny.contrato.bancoBoleto) {
          tituloAny.banco = tituloAny.contrato.bancoBoleto;
          tituloAny.banco_id = tituloAny.contrato.bancoBoleto.id;
        }
      }

      return titulo;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      const errorName = error instanceof Error ? error.name : 'Unknown';
      
      logger.error('Erro ao buscar título', {
        id: id,
        error: errorMessage
      });
      throw error;
    }
  }

  /**
   * Buscar títulos por IDs com includes
   */
  static async getByIds(ids: number[], status?: string[]): Promise<Titulo[]> {
    try {
      const where: any = {
        id: { [Op.in]: ids }
      };

      if (status) {
        where.status = { [Op.in]: status };
      }

      let titulos: Titulo[];
      try {
        
        titulos = await Titulo.findAll({
          where,
          include: [
            { model: Cliente, as: 'cliente', required: false },
            { model: Plano, as: 'plano', required: false },
            { 
              model: Banco,
              as: 'banco', 
              required: false,
              attributes: ['id', 'nome', 'tipo_banco', 'logo', 'codigo', 'api_key', 'sandbox'] // Incluir api_key para cancelamento
            },
            { 
              model: Contrato,
              as: 'contrato', 
              required: false,
              include: [
                { 
                  association: 'bancoBoleto', 
                  required: false,
                  attributes: ['id', 'nome', 'tipo_banco', 'logo', 'codigo', 'api_key', 'sandbox'] // Incluir api_key para cancelamento
                }
              ]
            }
          ]
        });
        
      } catch (findAllError: unknown) {
        logger.error('Erro ao executar Titulo.findAll', {
          error: findAllError instanceof Error ? findAllError.message : 'Erro desconhecido',
          ids: ids
        });
        throw findAllError;
      }

      // Se algum título não tem banco carregado, tentar carregar do banco_id ou do contrato
      for (const titulo of titulos) {
        try {
          const tituloAny = titulo as any;
          
          // Se não tem banco carregado mas tem banco_id, carregar o banco
          if (!tituloAny.banco && tituloAny.banco_id) {
            try {
              const banco = await Banco.findByPk(tituloAny.banco_id, {
                attributes: ['id', 'nome', 'tipo_banco', 'logo', 'codigo', 'api_key', 'sandbox']
              });
              if (banco) {
                tituloAny.banco = banco;
              }
            } catch (err) {
              // Ignorar erro ao carregar banco individual
            }
          }
          
          // Se ainda não tem banco mas tem contrato com banco, usar o banco do contrato
          if (!tituloAny.banco && tituloAny.contrato && tituloAny.contrato.bancoBoleto) {
            tituloAny.banco = tituloAny.contrato.bancoBoleto;
            tituloAny.banco_id = tituloAny.contrato.bancoBoleto.id;
          }
        } catch (err) {
          // Ignorar erro ao processar título individual, continuar com os outros
        }
      }

      return titulos;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      const errorName = error instanceof Error ? error.name : 'Unknown';
      const errorCause = error instanceof Error && 'cause' in error ? (error as any).cause : undefined;
      
      logger.error('Erro ao buscar títulos', {
        ids: ids,
        error: errorMessage
      });
      throw error;
    }
  }

  /**
   * Criar título
   */
  static async create(dadosTitulo: Partial<Titulo>, transaction?: Transaction): Promise<Titulo> {
    return await Titulo.create(dadosTitulo as any, { transaction });
  }

  /**
   * Atualizar título
   */
  static async update(id: string | number, dadosTitulo: Partial<Titulo>): Promise<Titulo> {
    const titulo = await Titulo.findByPk(id);
    
    if (!titulo) {
      throw new Error('Título não encontrado');
    }
    
    await titulo.update(dadosTitulo);
    await titulo.reload();
    
    return titulo;
  }

  /**
   * Deletar título
   */
  static async delete(id: string | number): Promise<Titulo> {
    const titulo = await Titulo.findByPk(id);
    
    if (!titulo) {
      throw new Error('Título não encontrado');
    }
    
    await titulo.destroy();
    
    return titulo;
  }

  /**
   * Contar títulos com filtros (para dashboard)
   */
  static async count(where?: WhereOptions): Promise<number> {
    return await Titulo.count({ where });
  }

  /**
   * Buscar títulos com filtros e includes (para dashboard)
   */
  static async findAllWithFilters(where?: WhereOptions, options?: { include?: any[]; order?: any[]; limit?: number; attributes?: string[] }): Promise<Titulo[]> {
    try {
      // Garantir que o contrato com bancoBoleto seja incluído se não estiver nos includes
      const includes = options?.include ? [...options.include] : [];
      const hasContrato = includes.some((inc: any) => {
        if (!inc) return false;
        return inc.association === 'contrato' || inc.as === 'contrato' || 
               (inc.model && (inc.model.name === 'Contrato' || (inc.model as any).tableName === 'contratos'));
      });
      
      if (!hasContrato) {
        includes.push({
          association: 'contrato',
          required: false,
          include: [
            { 
              association: 'bancoBoleto', 
              required: false,
              attributes: ['id', 'nome', 'tipo_banco', 'logo', 'codigo', 'api_key', 'sandbox'] // Incluir api_key para cancelamento
            }
          ]
        });
      } else {
        // Se já tem contrato, garantir que tem bancoBoleto
        const contratoIndex = includes.findIndex((inc: any) => {
          if (!inc) return false;
          return inc.association === 'contrato' || inc.as === 'contrato' || 
                 (inc.model && (inc.model.name === 'Contrato' || (inc.model as any).tableName === 'contratos'));
        });
        if (contratoIndex >= 0) {
          const contratoInclude = includes[contratoIndex];
          if (!contratoInclude.include) {
            contratoInclude.include = [];
          }
          const hasBancoBoleto = contratoInclude.include.some((inc: any) => 
            inc && (inc.association === 'bancoBoleto' || inc.as === 'bancoBoleto')
          );
          if (!hasBancoBoleto) {
            contratoInclude.include.push({ 
              association: 'bancoBoleto', 
              required: false,
              attributes: ['id', 'nome', 'tipo_banco', 'logo', 'codigo', 'api_key', 'sandbox'] // Incluir api_key para cancelamento
            });
          }
        }
      }
      
      const titulos = await Titulo.findAll({
        where,
        attributes: options?.attributes,
        include: includes,
        order: options?.order || [['created_at', 'DESC']],
        limit: options?.limit
      });

      // Se algum título não tem banco_id mas tem contrato com banco, usar o banco do contrato
      for (const titulo of titulos) {
        try {
          const tituloAny = titulo as any;
          if (!tituloAny.banco && tituloAny.contrato && tituloAny.contrato.bancoBoleto) {
            tituloAny.banco = tituloAny.contrato.bancoBoleto;
            tituloAny.banco_id = tituloAny.contrato.bancoBoleto.id;
          }
        } catch (err) {
          // Ignorar erros ao processar título individual
          continue;
        }
      }

      return titulos;
    } catch (error) {
      // Se houver erro, tentar sem a lógica de contrato/banco
      const includes = options?.include || [];
      return await Titulo.findAll({
        where,
        attributes: options?.attributes,
        include: includes,
        order: options?.order || [['created_at', 'DESC']],
        limit: options?.limit
      });
    }
  }
}

