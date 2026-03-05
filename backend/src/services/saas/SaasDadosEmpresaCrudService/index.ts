/**
 * CRUD para saas_dados_empresa (tabela padrão de empresas cadastradas no SaaS)
 */

import { Op, WhereOptions } from 'sequelize';
import { SaasDadosEmpresa } from '../../../models/saas/SaasDadosEmpresa';

interface ListFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}

export class SaasDadosEmpresaCrudService {
  static async list(filters: ListFilters) {
    const {
      page = 1,
      limit = 20,
      search,
      sortColumn = 'id',
      sortDirection = 'desc',
    } = filters;

    const allowedColumns = ['id', 'nome_empresa', 'cnpj', 'email', 'status', 'created_at'];
    const col = allowedColumns.includes(sortColumn) ? sortColumn : 'id';

    const where: WhereOptions = {};

    if (search) {
      Object.assign(where, {
        [Op.or]: [
          { nome_empresa: { [Op.like]: `%${search}%` } },
          { razao_social: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { cnpj: { [Op.like]: `%${search}%` } },
        ],
      });
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await SaasDadosEmpresa.findAndCountAll({
      where,
      order: [[col, sortDirection.toUpperCase()]],
      limit,
      offset,
      include: [{ association: 'plano', attributes: ['id', 'nome'] }],
    });

    const data = rows.map((e) => e.toJSON());

    return {
      data,
      pagination: {
        total: count as number,
        page,
        limit,
        totalPages: Math.ceil((count as number) / limit),
      },
    };
  }

  static async getById(id: number) {
    return SaasDadosEmpresa.findByPk(id, {
      include: [{ association: 'plano', attributes: ['id', 'nome'] }],
    });
  }

  static async create(data: Record<string, unknown>) {
    const payload = { ...data };
    if (!payload.nome_empresa && payload.razao_social) payload.nome_empresa = payload.razao_social;
    if (!payload.nome_empresa) payload.nome_empresa = (payload.email as string) || 'Empresa';
    const empresa = await SaasDadosEmpresa.create(payload as never);
    const { SaasEmpresaDefaultsService } = await import('../SaasEmpresaDefaultsService');
    await SaasEmpresaDefaultsService.createMandatoryRecords(empresa.id).catch(() => {});
    return empresa;
  }

  static async update(id: number, data: Record<string, unknown>) {
    const payload = { ...data };
    if (!payload.nome_empresa && payload.razao_social) payload.nome_empresa = payload.razao_social;
    await SaasDadosEmpresa.update(payload as never, { where: { id } });
  }

  static async delete(id: number) {
    await SaasDadosEmpresa.destroy({ where: { id } });
  }
}
