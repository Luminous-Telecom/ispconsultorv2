import { Cliente } from '../../../models/clientes/Cliente';
import { Titulo } from '../../../models/financeiro/Titulo';
import { Op, WhereOptions } from 'sequelize';
import { buildDateFilter } from '../../../utils/queryFilters';
import { logger } from '../../../utils/logger';
import { SortHelper } from '../../../utils/sortHelper';
import { CLIENTE_SORT_CONFIG } from '../../../config/sortConfigs';
import bcrypt from 'bcryptjs';

export interface ListClientesFilters {
  page?: number;
  limit?: number;
  search?: string;
  searchField?: string;
  ativo?: string;
  cidade?: string;
  estado?: string;
  created_at_inicio?: string;
  created_at_fim?: string;
  sortColumn?: string;
  sortDirection?: string;
  empresa_id?: number;
}

export interface ListClientesResponse {
  success: boolean;
  data: Cliente[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
  };
}

export class ClienteService {
  /**
   * Listar clientes com filtros e paginação
   */
  static async list(filters: ListClientesFilters): Promise<ListClientesResponse> {
    const { page = 1, limit = 15, search, searchField, ativo, cidade, estado, created_at_inicio, created_at_fim, sortColumn, sortDirection, empresa_id } = filters;
    const offset = (page - 1) * limit;

    const where: WhereOptions = {};

    if (empresa_id !== undefined) {
      where.empresa_id = empresa_id;
    }
    
    if (search) {
      const trimmed = String(search).trim();
      const searchPattern = `%${search}%`;
      const field = searchField?.trim();

      if (field === 'todos' || !field) {
        const orConditions: WhereOptions[] = [
          { cnpj: { [Op.like]: searchPattern } },
          { razao_social: { [Op.like]: searchPattern } },
          { nome_fantasia: { [Op.like]: searchPattern } },
          { email: { [Op.like]: searchPattern } },
          { telefone: { [Op.like]: searchPattern } },
          { whatsapp: { [Op.like]: searchPattern } },
          { endereco: { [Op.like]: searchPattern } },
          { numero: { [Op.like]: searchPattern } },
          { complemento: { [Op.like]: searchPattern } },
          { bairro: { [Op.like]: searchPattern } },
          { cidade: { [Op.like]: searchPattern } },
          { estado: { [Op.like]: searchPattern } },
        ];
        const numExact = /^\d+$/.test(trimmed) ? parseInt(trimmed, 10) : null;
        if (numExact !== null) {
          orConditions.push({ id: numExact });
        }
        if (/^ativo$/i.test(trimmed)) {
          orConditions.push({ ativo: true });
        }
        if (/^inativo$/i.test(trimmed)) {
          orConditions.push({ ativo: false });
        }
        (where as WhereOptions & { [Op.or]?: WhereOptions[] })[Op.or] = orConditions;
      } else {
        const allowedFields = ['id', 'cnpj', 'razao_social', 'nome_fantasia', 'email', 'whatsapp', 'telefone', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado'];
        if (allowedFields.includes(field)) {
          if (field === 'id') {
            const numExact = /^\d+$/.test(trimmed) ? parseInt(trimmed, 10) : null;
            if (numExact !== null) {
              where.id = numExact;
            } else {
              where.id = { [Op.lt]: 0 };
            }
          } else {
            where[field as keyof typeof where] = { [Op.like]: searchPattern };
          }
        }
      }
    }

    if (ativo !== undefined) {
      where.ativo = ativo === 'true';
    }

    if (cidade) {
      where.cidade = { [Op.like]: `%${cidade}%` };
    }

    if (estado) {
      where.estado = estado.toUpperCase();
    }

    const createdAtFilter = buildDateFilter(created_at_inicio, created_at_fim, 'created_at');
    if (createdAtFilter) {
      Object.assign(where, createdAtFilter);
    }

    // Construir ordenação - ordena TODOS os dados antes da paginação
    let order: any[] = [['id', 'DESC']]; // Padrão
    if (sortColumn && sortDirection) {
      const sortResult = SortHelper.buildOrder(
        CLIENTE_SORT_CONFIG,
        sortColumn,
        sortDirection.toUpperCase() as 'ASC' | 'DESC'
      );

      if (sortResult.isValid) {
        order = sortResult.order;
      } else {
        logger.warn('ClienteService.list - Coluna de ordenação inválida', {
          column: sortColumn,
          error: sortResult.error
        });
        // Manter ordenação padrão se coluna inválida
      }
    }

    const count = await Cliente.count({ where });

    let clientes;
    try {
      clientes = await Cliente.findAll({
        where,
        include: [
          { association: 'planos', attributes: ['id', 'nome_plano', 'valor_mensal', 'status'] },
          { association: 'titulos', attributes: ['id', 'numero_titulo', 'status', 'valor'] },
          { association: 'contratos' }
        ],
        order,
        limit,
        offset
      });
    } catch (queryError: any) {
      logger.error('ClienteService.list - Erro na query', {
        error: queryError.message,
        stack: queryError.stack,
        where: JSON.stringify(where).substring(0, 200),
        order: JSON.stringify(order).substring(0, 200)
      });
      throw queryError;
    }

    const totalPages = Math.ceil(count / limit);

    const from = count > 0 ? offset + 1 : 0;
    const to = count > 0 ? Math.min(offset + limit, count) : 0;

    return {
      success: true,
      data: clientes,
      pagination: {
        current_page: page,
        per_page: limit,
        total: count,
        last_page: totalPages,
        from,
        to
      }
    };
  }

  /**
   * Buscar cliente por ID
   */
  static async getById(id: string | number): Promise<Cliente | null> {
    return await Cliente.findByPk(id, {
      include: [
        { 
          association: 'planos',
          include: [{ association: 'clientes', attributes: ['id', 'razao_social'] }]
        },
        { 
          association: 'titulos',
          include: [
            { association: 'plano', attributes: ['id', 'nome_plano'] },
            { 
              association: 'banco', 
              attributes: ['id', 'nome', 'tipo_banco', 'client_id_producao', 'client_secret_producao'] 
            }
          ]
        },
        { association: 'contratos' }
      ]
    });
  }

  /**
   * Verificar se existe cliente com CNPJ (dentro da mesma empresa)
   */
  static async existsByCnpj(cnpj: string, excludeId?: number, empresaId?: number): Promise<boolean> {
    const where: WhereOptions = { cnpj };
    
    if (excludeId) {
      where.id = { [Op.ne]: excludeId } as unknown as number;
    }

    if (empresaId !== undefined) {
      where.empresa_id = empresaId;
    }
    
    const cliente = await Cliente.findOne({ where });
    return !!cliente;
  }

  /**
   * Criar cliente
   */
  static async create(dadosCliente: Partial<Cliente>): Promise<Cliente> {
    const dadosParaSalvar = { ...dadosCliente };
    
    // Se tiver senha da central do assinante, fazer hash
    if (dadosParaSalvar.central_assinante_senha) {
      dadosParaSalvar.central_assinante_senha = await bcrypt.hash(dadosParaSalvar.central_assinante_senha, 10);
    }
    
    return await Cliente.create(dadosParaSalvar as any);
  }

  /**
   * Atualizar cliente
   */
  static async update(id: string | number, dadosCliente: Partial<Cliente>): Promise<Cliente> {
    const cliente = await Cliente.findByPk(id);
    
    if (!cliente) {
      throw new Error('Cliente não encontrado');
    }
    
    const dadosParaSalvar = { ...dadosCliente };
    
    // Se tiver senha da central do assinante, fazer hash
    // Se a senha estiver vazia, não atualizar (manter a atual)
    if (dadosParaSalvar.central_assinante_senha !== undefined) {
      if (dadosParaSalvar.central_assinante_senha && dadosParaSalvar.central_assinante_senha.trim() !== '') {
        dadosParaSalvar.central_assinante_senha = await bcrypt.hash(dadosParaSalvar.central_assinante_senha, 10);
      } else {
        // Se estiver vazio, remover do objeto para não atualizar
        delete dadosParaSalvar.central_assinante_senha;
      }
    }
    
    await cliente.update(dadosParaSalvar);
    await cliente.reload();
    
    return cliente;
  }

  /**
   * Deletar cliente
   */
  static async delete(id: string | number): Promise<Cliente> {
    const cliente = await Cliente.findByPk(id);
    
    if (!cliente) {
      throw new Error('Cliente não encontrado');
    }
    
    const titulosCount = await cliente.countTitulos();
    
    if (titulosCount > 0) {
      throw new Error('Não é possível excluir cliente com títulos associados.');
    }
    
    await cliente.destroy();
    
    return cliente;
  }

  /**
   * Contar clientes com filtros (para dashboard)
   */
  static async count(where?: WhereOptions): Promise<number> {
    return await Cliente.count({ where });
  }

  /**
   * Buscar clientes com filtros e includes (para dashboard)
   */
  static async findAllWithFilters(where?: WhereOptions, options?: { include?: any[]; order?: any[]; limit?: number; attributes?: string[] }): Promise<Cliente[]> {
    return await Cliente.findAll({
      where,
      attributes: options?.attributes,
      include: options?.include || [],
      order: options?.order || [['created_at', 'DESC']],
      limit: options?.limit
    });
  }

  /**
   * Buscar cliente por CNPJ (aceita 14 dígitos ou 18 caracteres formatado).
   * Se empresaId for informado, filtra apenas clientes daquela empresa.
   */
  static async findByCnpj(cnpj: string, empresaId?: number): Promise<Cliente | null> {
    const digitos = cnpj.replace(/\D/g, '');
    const formatos: string[] = [cnpj.trim()];
    if (digitos.length === 14) {
      formatos.push(digitos);
      formatos.push(`${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-${digitos.slice(12)}`);
    }
    const where: WhereOptions = { cnpj: { [Op.in]: [...new Set(formatos)] } };
    if (empresaId !== undefined) {
      where.empresa_id = empresaId;
    }
    return await Cliente.findOne({
      where,
      include: [
        { association: 'titulos' },
        { association: 'planos' },
        { association: 'contratos' }
      ]
    });
  }

  /**
   * Listar clientes ativos (filtrado por empresa)
   */
  static async findAtivos(empresaId?: number): Promise<Cliente[]> {
    const where: WhereOptions = { ativo: true };
    if (empresaId !== undefined) {
      where.empresa_id = empresaId;
    }
    return await Cliente.findAll({
      where,
      order: [['razao_social', 'ASC']]
    });
  }
}

