import { Usuario } from '../../../models/cadastros/Usuario';
import { Op, WhereOptions } from 'sequelize';
import { sequelize } from '../../../config/database';
import * as bcrypt from 'bcryptjs';
import { logger } from '../../../utils/logger';
import { SortHelper } from '../../../utils/sortHelper';
import { USUARIO_SORT_CONFIG } from '../../../config/sortConfigs';

export interface ListUsuariosFilters {
  page?: number;
  limit?: number;
  search?: string;
  ativo?: string;
  sortColumn?: string;
  sortDirection?: string;
}

export interface ListUsuariosResponse {
  success: boolean;
  data: Usuario[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
  };
}

export class UsuarioService {
  /**
   * Listar usuários com filtros e paginação
   */
  static async list(filters: ListUsuariosFilters): Promise<ListUsuariosResponse> {
    const { page = 1, limit = 10, search = '', ativo, sortColumn, sortDirection } = filters;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;

    const whereClause: WhereOptions = {};
    
    if (search) {
      (whereClause as Record<symbol, unknown>)[Op.or] = [
        { id: { [Op.like]: `%${search}%` } },
        { nome: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { role: { [Op.like]: `%${search}%` } },
        { ativo: { [Op.like]: `%${search}%` } }
      ];
    }

    if (ativo !== undefined) {
      whereClause.ativo = ativo === 'true';
    }

    // Construir ordenação - ordena TODOS os dados antes da paginação
    let order: any[] = [['id', 'DESC']]; // Padrão
    if (sortColumn && sortDirection) {
      const sortResult = SortHelper.buildOrder(
        USUARIO_SORT_CONFIG,
        sortColumn,
        sortDirection.toUpperCase() as 'ASC' | 'DESC'
      );

      if (sortResult.isValid) {
        order = sortResult.order;
      } else {
        logger.warn('UsuarioService.list - Coluna de ordenação inválida', {
          column: sortColumn,
          error: sortResult.error
        });
        // Manter ordenação padrão se coluna inválida
      }
    }

    let count: number;
    let rows: any[];
    try {
      const result = await Usuario.findAndCountAll({
      where: whereClause,
      order,
      limit: limitNum,
      offset
      });
      count = result.count as number;
      rows = result.rows;
    } catch (queryError: any) {
      logger.error('UsuarioService.list - Erro na query', {
        error: queryError.message,
        stack: queryError.stack,
        where: JSON.stringify(whereClause).substring(0, 200),
        order: JSON.stringify(order).substring(0, 200)
      });
      throw queryError;
    }

    return {
      success: true,
      data: rows,
      pagination: {
        current_page: pageNum,
        per_page: limitNum,
        total: count,
        last_page: Math.ceil(count / limitNum),
        from: offset + 1,
        to: Math.min(offset + limitNum, count)
      }
    };
  }

  /**
   * Buscar usuário por ID
   */
  static async getById(id: string | number): Promise<Usuario | null> {
    return await Usuario.findByPk(id);
  }

  /**
   * Buscar usuário por email com senha (para autenticação)
   */
  static async findByEmailWithPassword(email: string, ativo = true): Promise<Usuario | null> {
    return await Usuario.scope('withPassword').findOne({
      where: {
        email: email.toLowerCase(),
        ativo
      }
    });
  }

  /**
   * Buscar usuário por webhook_secret (para autenticação de webhook)
   */
  static async findByWebhookSecret(secret: string): Promise<Usuario | null> {
    return await Usuario.findOne({
      where: {
        webhook_secret: secret
      }
    });
  }

  /**
   * Atualizar último login do usuário
   */
  static async updateUltimoLogin(id: number): Promise<Usuario> {
    const usuario = await Usuario.findByPk(id);
    
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }
    
    await usuario.update({
      ultimo_login: new Date()
    });
    
    return usuario;
  }

  /**
   * Verificar se existe usuário com email
   */
  static async existsByEmail(email: string, excludeId?: number): Promise<boolean> {
    const where: WhereOptions = { email };
    
    if (excludeId) {
      where.id = { [Op.ne]: excludeId } as unknown as number;
    }
    
    const usuario = await Usuario.findOne({ where });
    return !!usuario;
  }

  /**
   * Criar usuário
   */
  static async create(dadosUsuario: {
    nome: string;
    email: string;
    password: string;
    role?: 'admin' | 'user';
    ativo?: boolean;
  }): Promise<Usuario> {
    const passwordHash = await bcrypt.hash(dadosUsuario.password, 10);

    return await Usuario.create({
      nome: dadosUsuario.nome,
      email: dadosUsuario.email,
      password_hash: passwordHash,
      role: dadosUsuario.role || 'admin',
      ativo: dadosUsuario.ativo !== undefined ? dadosUsuario.ativo : true
    });
  }

  /**
   * Atualizar usuário
   */
  static async update(id: string | number, dadosUsuario: {
    nome?: string;
    email?: string;
    password?: string;
    role?: 'admin' | 'user';
    ativo?: boolean;
    webhook_secret?: string;
  }): Promise<Usuario> {
    const usuario = await Usuario.findByPk(id);
    
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }

    const updateData: Partial<Usuario> = {};
    if (dadosUsuario.nome) updateData.nome = dadosUsuario.nome;
    if (dadosUsuario.email) updateData.email = dadosUsuario.email;
    if (dadosUsuario.role) updateData.role = dadosUsuario.role;
    if (dadosUsuario.ativo !== undefined) updateData.ativo = dadosUsuario.ativo;
    if (dadosUsuario.webhook_secret) updateData.webhook_secret = dadosUsuario.webhook_secret;
    
    if (dadosUsuario.password) {
      updateData.password_hash = await bcrypt.hash(dadosUsuario.password, 10);
    }

    await usuario.update(updateData);
    await usuario.reload();
    
    return usuario;
  }

  /**
   * Deletar usuário
   */
  static async delete(id: string | number): Promise<Usuario> {
    const usuario = await Usuario.findByPk(id);
    
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }
    
    await usuario.destroy();
    
    return usuario;
  }
}

