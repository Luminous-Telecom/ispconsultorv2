import { Op } from 'sequelize';
import { SaasServidorEmail } from '../../../models/saas/SaasServidorEmail';
import { SaasServidorWhatsapp } from '../../../models/saas/SaasServidorWhatsapp';
import { SaasBanco } from '../../../models/saas/SaasBanco';
import { SaasDadosEmpresa } from '../../../models/saas/SaasDadosEmpresa';

interface ListFilters {
  page?: number;
  limit?: number;
  search?: string;
  empresa_id?: number;
  ativo?: boolean;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}

const empresaInclude = {
  model: SaasDadosEmpresa,
  as: 'empresa',
  attributes: ['id', 'nome_empresa', 'cnpj', 'email'],
};

// ─── Servidores Email ────────────────────────────────────────────────────────

export class SaasServidorEmailService {
  static async list(filters: ListFilters) {
    const { page = 1, limit = 20, search, empresa_id, sortColumn = 'id', sortDirection = 'desc' } = filters;
    const allowed = ['id', 'nome', 'host_smtp', 'status', 'created_at'];
    const col = allowed.includes(sortColumn) ? sortColumn : 'id';
    const offset = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (empresa_id) where.empresa_id = empresa_id;
    if (search) where[Op.or as unknown as string] = [
      { nome: { [Op.like]: `%${search}%` } },
      { host_smtp: { [Op.like]: `%${search}%` } },
    ];
    const { count, rows } = await SaasServidorEmail.findAndCountAll({
      where, include: [empresaInclude], order: [[col, sortDirection.toUpperCase()]], limit, offset,
    });
    return { data: rows, pagination: { total: count as number, page, limit, totalPages: Math.ceil((count as number) / limit) } };
  }

  static async getById(id: number) { return SaasServidorEmail.findByPk(id, { include: [empresaInclude] }); }

  static async create(data: Partial<SaasServidorEmail>) {
    return SaasServidorEmail.create(data as SaasServidorEmail['_creationAttributes']);
  }

  static async update(id: number, data: Partial<SaasServidorEmail>) {
    await SaasServidorEmail.update(data, { where: { id } });
  }

  static async delete(id: number) { await SaasServidorEmail.destroy({ where: { id } }); }
}

// ─── Servidores WhatsApp ─────────────────────────────────────────────────────

export class SaasServidorWhatsappService {
  static async list(filters: ListFilters) {
    const { page = 1, limit = 20, search, empresa_id, sortColumn = 'id', sortDirection = 'desc' } = filters;
    const allowed = ['id', 'nome', 'url_api', 'status', 'created_at'];
    const col = allowed.includes(sortColumn) ? sortColumn : 'id';
    const offset = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (empresa_id) where.empresa_id = empresa_id;
    if (search) where[Op.or as unknown as string] = [
      { nome: { [Op.like]: `%${search}%` } },
      { numero: { [Op.like]: `%${search}%` } },
    ];
    const { count, rows } = await SaasServidorWhatsapp.findAndCountAll({
      where, include: [empresaInclude], order: [[col, sortDirection.toUpperCase()]], limit, offset,
    });
    return { data: rows, pagination: { total: count as number, page, limit, totalPages: Math.ceil((count as number) / limit) } };
  }

  static async getById(id: number) { return SaasServidorWhatsapp.findByPk(id, { include: [empresaInclude] }); }

  static async create(data: Partial<SaasServidorWhatsapp>) {
    return SaasServidorWhatsapp.create(data as SaasServidorWhatsapp['_creationAttributes']);
  }

  static async update(id: number, data: Partial<SaasServidorWhatsapp>) {
    await SaasServidorWhatsapp.update(data, { where: { id } });
  }

  static async delete(id: number) { await SaasServidorWhatsapp.destroy({ where: { id } }); }
}

// ─── Bancos ──────────────────────────────────────────────────────────────────

export class SaasBancoService {
  static async list(filters: ListFilters) {
    const { page = 1, limit = 20, search, ativo, sortColumn = 'id', sortDirection = 'desc' } = filters;
    const allowed = ['id', 'nome', 'banco', 'tipo_banco', 'agencia', 'conta', 'ativo', 'created_at'];
    const col = allowed.includes(sortColumn) ? sortColumn : 'id';
    const offset = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (ativo !== undefined) where.ativo = ativo;
    if (search) where[Op.or as unknown as string] = [
      { banco: { [Op.like]: `%${search}%` } },
      { nome: { [Op.like]: `%${search}%` } },
      { agencia: { [Op.like]: `%${search}%` } },
      { conta: { [Op.like]: `%${search}%` } },
    ];
    const { count, rows } = await SaasBanco.findAndCountAll({
      where, order: [[col, sortDirection.toUpperCase()]], limit, offset,
    });
    return { data: rows, pagination: { total: count as number, page, limit, totalPages: Math.ceil((count as number) / limit) } };
  }

  static async getById(id: number) { return SaasBanco.findByPk(id); }

  static async create(data: Partial<SaasBanco>) {
    return SaasBanco.create(data as SaasBanco['_creationAttributes']);
  }

  static async update(id: number, data: Partial<SaasBanco>) {
    await SaasBanco.update(data, { where: { id } });
  }

  static async delete(id: number) { await SaasBanco.destroy({ where: { id } }); }
}
