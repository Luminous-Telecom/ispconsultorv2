import { Banco } from '../../../models/cadastros/Banco';
import { NFSeConfig } from '../../../models/nfse/NFSeConfig';
import { Op, WhereOptions } from 'sequelize';
import type { Order, Transaction } from 'sequelize';
import { sequelize } from '../../../config/database';
import { cache } from '../../../utils/cache';
import { logger } from '../../../utils/logger';
import { SortHelper } from '../../../utils/sortHelper';
import { BANCO_SORT_CONFIG } from '../../../config/sortConfigs';
import { buildPagination } from '../../../utils/pagination';
import { NFSeConfigService } from '../../nfse/NFSeConfigService';

export interface ListBancosFilters {
  search?: string;
  searchField?: string;
  status?: string;
  tipo_banco?: string;
  page?: number;
  limit?: number;
  sortColumn?: string;
  sortDirection?: string;
  empresa_id?: number;
}

export interface ListBancosResponse {
  success: boolean;
  data: Banco[];
  pagination?: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
  };
}

export class BancoService {
  private static getDefaultIncludes() {
    return [{ association: 'titulos' as const }];
  }

  static async findAsaasNFSeIntegracao(empresaId?: number | null, transaction?: Transaction): Promise<Banco | null> {
    const where: WhereOptions = {
      ativo: true,
      tipo_banco: 'asaas',
      usar_integracao_banco_nfse: true,
      api_key: { [Op.ne]: null }
    };

    if (empresaId != null) {
      (where as Record<symbol, unknown>)[Op.or] = [
        { empresa_id: empresaId },
        { empresa_id: null }
      ];
    }

    return Banco.findOne({
      where,
      order: [['id', 'ASC']],
      transaction
    });
  }

  private static prepararDadosBanco(dadosBanco: Partial<Banco>): Partial<Banco> {
    if (dadosBanco.tipo_banco && dadosBanco.tipo_banco !== 'asaas') {
      return { ...dadosBanco, usar_integracao_banco_nfse: false };
    }

    return dadosBanco;
  }

  private static async sincronizarNFSeAsaas(banco: Banco, transaction?: Transaction): Promise<void> {
    if (banco.tipo_banco !== 'asaas' || !banco.usar_integracao_banco_nfse) {
      return;
    }

    if (!banco.getDataValue('api_key')) {
      throw new Error('API Key do Asaas é obrigatória para usar a integração do banco na NFS-e.');
    }

    await NFSeConfigService.update({
      provider: 'ASAAS',
      asaas_api_key: null,
      asaas_sandbox: banco.sandbox
    } as Partial<NFSeConfig>, banco.empresa_id, { transaction });
  }

  /**
   * Buscar bancos ativos
   */
  static async findAtivos(empresaId?: number): Promise<Banco[]> {
    const cacheKey = `bancos:ativos:${empresaId || 0}`;
    const cached = cache.get(cacheKey);

    if (cached) {
      return cached as Banco[];
    }

    const where: WhereOptions = { ativo: true };
    if (empresaId !== undefined) {
      where.empresa_id = empresaId;
    }

    const bancos = await Banco.findAll({
      where,
      include: [
        { association: 'titulos' }
      ],
      order: [['nome', 'ASC']]
    });

    cache.set(cacheKey, bancos, 600000);
    return bancos;
  }

  /**
   * Listar bancos com filtros e paginação
   */
  static async list(filters: ListBancosFilters): Promise<ListBancosResponse> {
    const { search, searchField, status, tipo_banco, page = 1, limit = 15, sortColumn, sortDirection, empresa_id } = filters;
    
    const where: WhereOptions<Banco> = {};

    if (empresa_id !== undefined) {
      where.empresa_id = empresa_id;
    }
    
    if (search) {
      const searchPattern = `%${search}%`;
      const numExact = /^\d+$/.test(search) ? parseInt(search, 10) : null;
      let orConditions: WhereOptions[] = [];
      if (searchField === 'id') {
        orConditions = numExact !== null ? [{ id: numExact }] : [{ id: { [Op.lt]: 0 } }];
      } else if (searchField === 'nome' || searchField === 'descricao' || searchField === 'tipo_banco' || searchField === 'sandbox' || searchField === 'ativo') {
        orConditions = [{ [searchField]: { [Op.like]: searchPattern } }];
      } else {
        orConditions = [
          { nome: { [Op.like]: searchPattern } },
          { descricao: { [Op.like]: searchPattern } },
          { tipo_banco: { [Op.like]: searchPattern } },
          { sandbox: { [Op.like]: searchPattern } }
        ];
        if (numExact !== null) {
          orConditions.unshift({ id: numExact });
        } else {
          orConditions.unshift({ id: { [Op.like]: searchPattern } });
        }
      }
      (where as Record<symbol, unknown>)[Op.or] = orConditions;
    }
    
    if (status) {
      where.ativo = status === 'ativo';
    }
    
    if (tipo_banco) {
      where.tipo_banco = tipo_banco as 'efi' | 'asaas' | 'bancario' | 'outros';
    }

    // Construir ordenação - ordena TODOS os dados antes da paginação
    let order: Order = [['id', 'DESC']]; // Padrão
    if (sortColumn && sortDirection) {
      const sortResult = SortHelper.buildOrder(
        BANCO_SORT_CONFIG,
        sortColumn,
        sortDirection.toUpperCase() as 'ASC' | 'DESC'
      );

      if (sortResult.isValid) {
        order = sortResult.order;
      } else {
        logger.warn('BancoService.list - Coluna de ordenação inválida', {
          column: sortColumn,
          error: sortResult.error
        });
        // Manter ordenação padrão se coluna inválida
      }
    }
    
    const offset = (Number(page) - 1) * Number(limit);

    const count = await Banco.count({ where });
    
    let bancos;
    try {
      bancos = await Banco.findAll({
        where,
        order,
        limit: Number(limit),
        offset,
        include: [
          { association: 'titulos' }
        ]
      });
    } catch (queryError: unknown) {
      const errorInfo = queryError instanceof Error
        ? { message: queryError.message, stack: queryError.stack }
        : { message: 'Erro desconhecido', stack: undefined };
      logger.error('BancoService.list - Erro na query', {
        error: errorInfo.message,
        stack: errorInfo.stack,
        where: JSON.stringify(where).substring(0, 200),
        order: JSON.stringify(order).substring(0, 200)
      });
      throw queryError;
    }
    
    const limitNum = Number(limit);
    return {
      success: true,
      data: bancos,
      pagination: buildPagination(Number(page), limitNum, count),
    };
  }

  /**
   * Buscar banco por ID
   */
  static async getById(id: string | number): Promise<Banco | null> {
    return await Banco.findByPk(id, {
      include: BancoService.getDefaultIncludes(),
    });
  }

  /**
   * Buscar primeiro banco ativo
   */
  static async findFirstAtivo(): Promise<Banco | null> {
    return await Banco.findOne({
      where: { ativo: true },
      order: [['id', 'DESC']]
    });
  }

  /**
   * Verificar se existe banco com nome
   */
  static async existsByName(nome: string, excludeId?: number): Promise<boolean> {
    const where: WhereOptions<Banco> = { nome };
    
    if (excludeId) {
      where.id = { [Op.ne]: excludeId } as unknown as number;
    }
    
    const banco = await Banco.findOne({ where });
    return !!banco;
  }

  /**
   * Criar banco
   */
  static async create(dadosBanco: Partial<Banco>): Promise<Banco> {
    return await sequelize.transaction(async (transaction) => {
      const banco = await Banco.create(
        BancoService.prepararDadosBanco(dadosBanco) as Banco['_creationAttributes'],
        { transaction }
      );

      await BancoService.sincronizarNFSeAsaas(banco, transaction);
      await banco.reload({ include: BancoService.getDefaultIncludes(), transaction });

      return banco;
    });
  }

  /**
   * Atualizar banco
   */
  static async update(id: string | number, dadosBanco: Partial<Banco>): Promise<Banco> {
    const bancoAtualizado = await sequelize.transaction(async (transaction) => {
      const banco = await Banco.findByPk(id, { transaction });
    
      if (!banco) {
        throw new Error('Banco não encontrado');
      }
      
      await banco.update(BancoService.prepararDadosBanco(dadosBanco), { transaction });
      await BancoService.sincronizarNFSeAsaas(banco, transaction);
      await banco.reload({ include: BancoService.getDefaultIncludes(), transaction });

      return banco;
    });

    // Invalidar cache se status mudou
    if (dadosBanco.ativo !== undefined) {
      cache.delete('bancos:ativos');
    }
    
    return bancoAtualizado;
  }

  /**
   * Deletar banco
   */
  static async delete(id: string | number): Promise<Banco> {
    const banco = await Banco.findByPk(id);
    
    if (!banco) {
      throw new Error('Banco não encontrado');
    }
    
    const titulosCount = await banco.countTitulos();
    
    if (titulosCount > 0) {
      throw new Error('Não é possível excluir banco com títulos associados.');
    }
    
    await banco.destroy();
    
    // Invalidar cache
    cache.delete('bancos:ativos');
    
    return banco;
  }

  /**
   * Contar bancos com filtros (para dashboard)
   */
  static async count(where?: WhereOptions): Promise<number> {
    return await Banco.count({ where });
  }
}

