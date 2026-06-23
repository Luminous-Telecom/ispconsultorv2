import { Op, QueryTypes, WhereOptions } from 'sequelize';
import { DadosEmpresa } from '../../../models/sistema/DadosEmpresa';
import { SaasContrato } from '../../../models/saas/SaasContrato';
import { sequelize } from '../../../config/database';
import { cache } from '../../../utils/cache';
import { buildSaasPagination } from '../../../utils/pagination';

/** Campos textuais da busca "todos" / LIKE por coluna na listagem de tenants SaaS */
const TENANT_LIKE_FIELDS = [
  'cnpj', 'razao_social', 'nome_fantasia', 'email', 'telefone', 'celular',
  'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado',
] as const;

interface ListFilters {
  page?: number;
  limit?: number;
  search?: string;
  searchField?: string;
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
      searchField,
      sortColumn = 'id',
      sortDirection = 'desc',
      created_at_inicio,
      created_at_fim,
      plano_id,
    } = filters;

    const allowedColumns = [
      'id',
      'razao_social',
      'nome_fantasia',
      'cnpj',
      'email',
      'cidade',
      'estado',
      'created_at',
      'endereco',
      'numero',
      'complemento',
      'bairro',
      'telefone',
      'celular',
      'bloqueado_por_atraso',
    ];

    let orderCol = allowedColumns.includes(sortColumn ?? '') ? sortColumn! : 'id';
    let orderDir = (sortDirection ?? 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    if (sortColumn === 'whatsapp') {
      orderCol = 'celular';
    } else if (sortColumn === 'ativo') {
      orderCol = 'bloqueado_por_atraso';
      orderDir = orderDir === 'ASC' ? 'DESC' : 'ASC';
    }

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
          pagination: buildSaasPagination(page, limit, 0),
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
      const trimmed = String(search).trim();
      const searchPattern = `%${search}%`;
      const field = searchField?.trim();

      if (field === 'todos' || !field) {
        const orConditions: WhereOptions[] = TENANT_LIKE_FIELDS.map((f) => ({ [f]: { [Op.like]: searchPattern } }));
        const numExact = /^\d+$/.test(trimmed) ? parseInt(trimmed, 10) : null;
        if (numExact !== null) {
          orConditions.push({ id: numExact });
        }
        if (/^ativo$/i.test(trimmed)) {
          orConditions.push({ bloqueado_por_atraso: false });
        }
        if (/^inativo$/i.test(trimmed)) {
          orConditions.push({ bloqueado_por_atraso: true });
        }
        (where as WhereOptions & { [Op.or]?: WhereOptions[] })[Op.or] = orConditions;
      } else {
        const allowedFields = ['id', 'cnpj', 'razao_social', 'nome_fantasia', 'email', 'whatsapp', 'telefone', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado'];
        if (field && allowedFields.includes(field)) {
          if (field === 'id') {
            const numExact = /^\d+$/.test(trimmed) ? parseInt(trimmed, 10) : null;
            if (numExact !== null) {
              Object.assign(where, { id: numExact });
            } else {
              Object.assign(where, { id: { [Op.lt]: 0 } });
            }
          } else if (field === 'whatsapp') {
            Object.assign(where, {
              [Op.or]: [
                { telefone: { [Op.like]: searchPattern } },
                { celular: { [Op.like]: searchPattern } },
              ],
            });
          } else {
            Object.assign(where, { [field]: { [Op.like]: searchPattern } });
          }
        }
      }
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await DadosEmpresa.findAndCountAll({
      where,
      order: [[orderCol, orderDir]],
      limit,
      offset,
    });

    const data = rows.map(e => e.toJSON());

    return {
      data,
      pagination: buildSaasPagination(page, limit, count as number),
    };
  }

  static async getById(id: number): Promise<DadosEmpresa | null> {
    return DadosEmpresa.findByPk(id);
  }

  static async create(data: Partial<DadosEmpresa>): Promise<DadosEmpresa> {
    return DadosEmpresa.create(data as DadosEmpresa['_creationAttributes']);
  }

  static async update(id: number, data: Partial<DadosEmpresa>): Promise<DadosEmpresa> {
    const empresa = await DadosEmpresa.findByPk(id);
    if (!empresa) {
      throw new Error('Empresa (tenant) não encontrada');
    }
    const payload = { ...data };
    if (payload.responsavel_nome === '' || payload.responsavel_nome == null) {
      payload.responsavel_nome = empresa.responsavel_nome;
    }
    if (payload.responsavel_cpf === '' || payload.responsavel_cpf == null) {
      payload.responsavel_cpf = empresa.responsavel_cpf;
    }
    await empresa.update(payload);
    await empresa.reload();
    cache.delete(`dados_empresa:config:${id}`);
    cache.delete('dados_empresa:config');
    return empresa;
  }

  static async delete(id: number): Promise<void> {
    await DadosEmpresa.destroy({ where: { id } });
  }

  static async getDashboardStats() {
    const total = await DadosEmpresa.count();
    const [{ total: totalUsuarios }] = await sequelize.query<{ total: number }>(
      `SELECT COUNT(id) AS total FROM cadastros_usuarios`,
      { type: QueryTypes.SELECT }
    );
    return { total, totalUsuarios: Number(totalUsuarios) };
  }
}
