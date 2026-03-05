import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { SaasUsuarioSuper, type SaasNivelAcesso } from '../../../models/saas/SaasUsuarioSuper';

interface ListFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}

interface CreateData {
  nome: string;
  email: string;
  senha: string;
  nivel_acesso?: SaasNivelAcesso;
  ativo?: boolean;
}

interface UpdateData {
  nome?: string;
  email?: string;
  senha?: string;
  nivel_acesso?: SaasNivelAcesso;
  ativo?: boolean;
}

export class SaasUsuarioSuperService {
  static async list(filters: ListFilters) {
    const { page = 1, limit = 20, search, sortColumn = 'id', sortDirection = 'desc' } = filters;

    const allowed = ['id', 'nome', 'email', 'nivel_acesso', 'ativo', 'ultimo_login', 'created_at'];
    const col = allowed.includes(sortColumn) ? sortColumn : 'id';
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (search) {
      where[Op.or as unknown as string] = [
        { nome: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await SaasUsuarioSuper.findAndCountAll({
      where,
      order: [[col, sortDirection.toUpperCase()]],
      limit,
      offset,
    });

    return {
      data: rows,
      pagination: { total: count as number, page, limit, totalPages: Math.ceil((count as number) / limit) },
    };
  }

  static async getById(id: number): Promise<SaasUsuarioSuper | null> {
    return SaasUsuarioSuper.findByPk(id);
  }

  static async create(data: CreateData): Promise<SaasUsuarioSuper> {
    const senha_hash = await bcrypt.hash(data.senha, 12);
    return SaasUsuarioSuper.create({
      nome: data.nome,
      email: data.email,
      senha_hash,
      nivel_acesso: data.nivel_acesso || 'admin',
      ativo: data.ativo !== undefined ? data.ativo : true,
      precisa_trocar_senha: true,
    });
  }

  static async update(id: number, data: UpdateData): Promise<void> {
    const payload: Record<string, unknown> = {};
    if (data.nome !== undefined) payload.nome = data.nome;
    if (data.email !== undefined) payload.email = data.email;
    if (data.nivel_acesso !== undefined) payload.nivel_acesso = data.nivel_acesso;
    if (data.ativo !== undefined) payload.ativo = data.ativo;
    if (data.senha) {
      payload.senha_hash = await bcrypt.hash(data.senha, 12);
    }
    await SaasUsuarioSuper.update(payload, { where: { id } });
  }

  static async delete(id: number): Promise<void> {
    await SaasUsuarioSuper.destroy({ where: { id } });
  }
}
