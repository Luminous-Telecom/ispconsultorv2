import { Cliente } from '../../../models/clientes/Cliente';
import { Titulo } from '../../../models/financeiro/Titulo';
import { Op, WhereOptions } from 'sequelize';
import { logger } from '../../../utils/logger';

export interface ListClientesFilters {
  page?: number;
  limit?: number;
  search?: string;
  searchField?: string;
  ativo?: string;
  cidade?: string;
  estado?: string;
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
    const { page = 1, limit = 15, search, searchField, ativo, cidade, estado } = filters;
    const offset = (page - 1) * limit;

    const where: WhereOptions = {};
    
    if (search) {
      const searchPattern = `%${search}%`;
      if (searchField) {
        const allowedFields = ['id', 'cnpj', 'razao_social', 'nome_fantasia', 'email', 'whatsapp', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado'];
        if (allowedFields.includes(searchField)) {
          where[searchField as keyof typeof where] = { [Op.like]: searchPattern };
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

    const count = await Cliente.count({ where });
    
    const clientes = await Cliente.findAll({
      where,
      include: [
        { association: 'planos', attributes: ['id', 'nome_plano', 'valor_mensal', 'status'] },
        { association: 'titulos', attributes: ['id', 'numero_titulo', 'status', 'valor'] },
        { association: 'contratos' }
      ],
      order: [['id', 'DESC']],
      limit,
      offset
    });

    const totalPages = Math.ceil(count / limit);

    return {
      success: true,
      data: clientes,
      pagination: {
        current_page: page,
        per_page: limit,
        total: count,
        last_page: totalPages,
        from: offset + 1,
        to: Math.min(offset + limit, count)
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
   * Verificar se existe cliente com CNPJ
   */
  static async existsByCnpj(cnpj: string, excludeId?: number): Promise<boolean> {
    const where: WhereOptions = { cnpj };
    
    if (excludeId) {
      where.id = { [Op.ne]: excludeId } as unknown as number;
    }
    
    const cliente = await Cliente.findOne({ where });
    return !!cliente;
  }

  /**
   * Criar cliente
   */
  static async create(dadosCliente: Partial<Cliente>): Promise<Cliente> {
    return await Cliente.create(dadosCliente as any);
  }

  /**
   * Atualizar cliente
   */
  static async update(id: string | number, dadosCliente: Partial<Cliente>): Promise<Cliente> {
    const cliente = await Cliente.findByPk(id);
    
    if (!cliente) {
      throw new Error('Cliente não encontrado');
    }
    
    await cliente.update(dadosCliente);
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
   * Buscar cliente por CNPJ
   */
  static async findByCnpj(cnpj: string): Promise<Cliente | null> {
    return await Cliente.findOne({
      where: { cnpj },
      include: [
        { association: 'titulos' },
        { association: 'planos' },
        { association: 'contratos' }
      ]
    });
  }

  /**
   * Listar clientes ativos
   */
  static async findAtivos(): Promise<Cliente[]> {
    return await Cliente.findAll({
      where: { ativo: true },
      order: [['razao_social', 'ASC']]
    });
  }
}

