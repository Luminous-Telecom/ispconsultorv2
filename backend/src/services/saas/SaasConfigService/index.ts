import { Op } from 'sequelize';
import type { Transaction } from 'sequelize';
import { sequelize } from '../../../config/database';
import { SaasServidorEmail } from '../../../models/saas/SaasServidorEmail';
import { SaasServidorWhatsapp } from '../../../models/saas/SaasServidorWhatsapp';
import { SaasBanco } from '../../../models/saas/SaasBanco';
import { SaasNFSeConfig } from '../../../models/saas/SaasNFSeConfig';
import { SaasNFSeConfigService } from '../SaasNFSeConfigService';
import { buildSaasPagination } from '../../../utils/pagination';

interface ListFilters {
  page?: number;
  limit?: number;
  search?: string;
  searchField?: string;
  empresa_id?: number;
  ativo?: boolean;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}

// ─── Servidores Email ────────────────────────────────────────────────────────

export class SaasServidorEmailService {
  static async list(filters: ListFilters) {
    const { page = 1, limit = 20, search, searchField, sortColumn = 'id', sortDirection = 'desc' } = filters;
    const allowed = ['id', 'nome', 'host_smtp', 'status', 'created_at'];
    const col = allowed.includes(sortColumn) ? sortColumn : 'id';
    const offset = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (search) {
      const searchCols = ['nome', 'host_smtp', 'id', 'status'];
      const field = searchField && searchCols.includes(searchField) ? searchField : null;
      if (field) {
        if (field === 'id') {
          const n = parseInt(search, 10);
          if (!Number.isNaN(n)) where[field] = n;
        } else {
          (where as Record<string, { [Op.like]: string }>)[field] = { [Op.like]: `%${search}%` };
        }
      } else {
        where[Op.or as unknown as string] = [
          { nome: { [Op.like]: `%${search}%` } },
          { host_smtp: { [Op.like]: `%${search}%` } },
        ];
      }
    }
    const { count, rows } = await SaasServidorEmail.findAndCountAll({
      where, order: [[col, sortDirection.toUpperCase()]], limit, offset,
    });
    return { data: rows, pagination: buildSaasPagination(page, limit, count as number) };
  }

  static async getById(id: number) { return SaasServidorEmail.findByPk(id); }

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
    const { page = 1, limit = 20, search, searchField, sortColumn = 'id', sortDirection = 'desc' } = filters;
    const allowed = ['id', 'nome', 'url_api', 'status', 'created_at'];
    const col = allowed.includes(sortColumn) ? sortColumn : 'id';
    const offset = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (search) {
      const searchCols = ['nome', 'numero', 'id', 'status'];
      const field = searchField && searchCols.includes(searchField) ? searchField : null;
      if (field) {
        if (field === 'id') {
          const n = parseInt(search, 10);
          if (!Number.isNaN(n)) where[field] = n;
        } else {
          (where as Record<string, { [Op.like]: string }>)[field] = { [Op.like]: `%${search}%` };
        }
      } else {
        where[Op.or as unknown as string] = [
          { nome: { [Op.like]: `%${search}%` } },
          { numero: { [Op.like]: `%${search}%` } },
        ];
      }
    }
    const { count, rows } = await SaasServidorWhatsapp.findAndCountAll({
      where, order: [[col, sortDirection.toUpperCase()]], limit, offset,
    });
    return { data: rows, pagination: buildSaasPagination(page, limit, count as number) };
  }

  static async getById(id: number) { return SaasServidorWhatsapp.findByPk(id); }

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
  static async findAsaasNFSeIntegracao(transaction?: Transaction): Promise<SaasBanco | null> {
    return SaasBanco.findOne({
      where: {
        ativo: true,
        tipo_banco: 'asaas',
        usar_integracao_banco_nfse: true,
        api_key: { [Op.ne]: null }
      },
      order: [['id', 'ASC']],
      transaction
    });
  }

  private static prepararDadosBanco(data: Partial<SaasBanco>): Partial<SaasBanco> {
    if (data.tipo_banco && data.tipo_banco !== 'asaas') {
      return { ...data, usar_integracao_banco_nfse: false };
    }

    return data;
  }

  private static async sincronizarNFSeAsaas(banco: SaasBanco, transaction?: Transaction): Promise<void> {
    if (banco.tipo_banco !== 'asaas' || !banco.usar_integracao_banco_nfse) {
      return;
    }

    if (!banco.getDataValue('api_key')) {
      throw new Error('API Key do Asaas é obrigatória para usar a integração do banco na NFS-e.');
    }

    await SaasNFSeConfigService.update(
      {
        provider: 'ASAAS',
        asaas_api_key: null,
        asaas_sandbox: banco.sandbox
      } as Partial<SaasNFSeConfig>,
      null,
      { transaction }
    );
  }

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
    return { data: rows, pagination: buildSaasPagination(page, limit, count as number) };
  }

  static async getById(id: number) { return SaasBanco.findByPk(id); }

  static async create(data: Partial<SaasBanco>) {
    return sequelize.transaction(async (transaction) => {
      const banco = await SaasBanco.create(
        SaasBancoService.prepararDadosBanco(data) as SaasBanco['_creationAttributes'],
        { transaction }
      );
      await SaasBancoService.sincronizarNFSeAsaas(banco, transaction);
      return banco;
    });
  }

  static async update(id: number, data: Partial<SaasBanco>) {
    await sequelize.transaction(async (transaction) => {
      const banco = await SaasBanco.findByPk(id, { transaction });
      if (!banco) {
        throw new Error('Banco não encontrado');
      }

      await banco.update(SaasBancoService.prepararDadosBanco(data), { transaction });
      await SaasBancoService.sincronizarNFSeAsaas(banco, transaction);
    });
  }

  static async delete(id: number) { await SaasBanco.destroy({ where: { id } }); }
}
