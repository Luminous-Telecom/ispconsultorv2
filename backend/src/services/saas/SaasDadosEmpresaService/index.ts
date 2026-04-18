import { Op, QueryTypes, WhereOptions } from 'sequelize';
import { DadosEmpresa } from '../../../models/sistema/DadosEmpresa';
import { SaasContrato } from '../../../models/saas/SaasContrato';
import { sequelize } from '../../../config/database';

interface ListFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  created_at_inicio?: string;
  created_at_fim?: string;
  /** Empresas com contrato SaaS ativo neste plano (mesma regra do gráfico "clientes por plano") */
  plano_id?: number;
}

export class SaasDadosEmpresaService {
  static async list(filters: ListFilters) {
    const {
      page = 1,
      limit = 20,
      search,
      sortColumn = 'id',
      sortDirection = 'desc',
      created_at_inicio,
      created_at_fim,
      plano_id,
    } = filters;

    const allowedColumns = ['id', 'razao_social', 'nome_fantasia', 'cnpj', 'email', 'cidade', 'estado', 'created_at'];
    const col = allowedColumns.includes(sortColumn) ? sortColumn : 'id';

    const where: WhereOptions = {};

    if (plano_id !== undefined && plano_id !== null && !Number.isNaN(plano_id)) {
      const contratosRows = await SaasContrato.findAll({
        attributes: ['empresa_id'],
        where: { status: 'ativo', plano_id },
        raw: true,
      });
      const idsPlano = [...new Set(contratosRows.map((r) => r.empresa_id))];
      if (idsPlano.length === 0) {
        return {
          data: [],
          pagination: {
            total: 0,
            page,
            limit,
            totalPages: 0,
          },
        };
      }
      where.id = { [Op.in]: idsPlano };
    }

    if (created_at_inicio || created_at_fim) {
      where.created_at = {
        ...(created_at_inicio && { [Op.gte]: created_at_inicio }),
        ...(created_at_fim && { [Op.lte]: created_at_fim }),
      };
    }

    if (search) {
      Object.assign(where, {
        [Op.or]: [
          { razao_social: { [Op.like]: `%${search}%` } },
          { nome_fantasia: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { cnpj: { [Op.like]: `%${search}%` } },
        ],
      });
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await DadosEmpresa.findAndCountAll({
      where,
      order: [[col, sortDirection.toUpperCase()]],
      limit,
      offset,
    });

    // Contar usuários por empresa
    const empresaIds = rows.map(e => e.id);
    const countMap: Record<number, number> = {};
    if (empresaIds.length > 0) {
      const counts = await sequelize.query<{ empresa_id: number; total: string }>(
        `SELECT empresa_id, COUNT(id) AS total FROM adm_usuarios WHERE empresa_id IN (:ids) GROUP BY empresa_id`,
        { replacements: { ids: empresaIds }, type: QueryTypes.SELECT }
      );
      for (const row of counts) {
        countMap[row.empresa_id] = parseInt(row.total, 10);
      }
    }

    const data = rows.map(e => ({
      ...e.toJSON(),
      total_usuarios: countMap[e.id] || 0,
    }));

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

  static async getById(id: number): Promise<DadosEmpresa | null> {
    return DadosEmpresa.findByPk(id);
  }

  static async create(data: Partial<DadosEmpresa>): Promise<DadosEmpresa> {
    return DadosEmpresa.create(data as DadosEmpresa['_creationAttributes']);
  }

  static async update(id: number, data: Partial<DadosEmpresa>): Promise<void> {
    await DadosEmpresa.update(data, { where: { id } });
  }

  static async delete(id: number): Promise<void> {
    await DadosEmpresa.destroy({ where: { id } });
  }

  static async getDashboardStats() {
    const total = await DadosEmpresa.count();
    const [{ total: totalUsuarios }] = await sequelize.query<{ total: number }>(
      `SELECT COUNT(id) AS total FROM adm_usuarios`,
      { type: QueryTypes.SELECT }
    );
    return { total, totalUsuarios: Number(totalUsuarios) };
  }
}
