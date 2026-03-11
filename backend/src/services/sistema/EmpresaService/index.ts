import { DadosEmpresa } from '../../../models/sistema/DadosEmpresa';
import { Usuario } from '../../../models/cadastros/Usuario';
import { Op, WhereOptions } from 'sequelize';

export interface ListEmpresasFilters {
  page?: number;
  limit?: number;
  search?: string;
}

export interface ListEmpresasResponse {
  success: boolean;
  data: DadosEmpresa[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
  };
}

export interface CreateEmpresaData {
  razao_social: string;
  nome_fantasia?: string;
  cnpj: string;
  email: string;
  telefone?: string;
  celular?: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  responsavel_nome: string;
  responsavel_cpf?: string;
  responsavel_cargo?: string;
}

export class EmpresaService {
  static async list(filters: ListEmpresasFilters = {}): Promise<ListEmpresasResponse> {
    const { page = 1, limit = 15, search } = filters;
    const offset = (page - 1) * limit;

    const where: WhereOptions = {};

    if (search) {
      (where as Record<symbol, unknown>)[Op.or] = [
        { razao_social: { [Op.like]: `%${search}%` } },
        { nome_fantasia: { [Op.like]: `%${search}%` } },
        { cnpj: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await DadosEmpresa.findAndCountAll({
      where,
      order: [['id', 'DESC']],
      limit,
      offset,
    });

    return {
      success: true,
      data: rows,
      pagination: {
        current_page: page,
        per_page: limit,
        total: count as number,
        last_page: Math.ceil((count as number) / limit),
        from: count > 0 ? offset + 1 : 0,
        to: count > 0 ? Math.min(offset + limit, count as number) : 0,
      },
    };
  }

  static async getById(id: number): Promise<DadosEmpresa | null> {
    return DadosEmpresa.findByPk(id);
  }

  static async create(dados: CreateEmpresaData): Promise<DadosEmpresa> {
    return DadosEmpresa.create({
      ...dados,
      responsavel_cpf: dados.responsavel_cpf ?? '',
      inscricao_estadual: null,
      inscricao_municipal: null,
      responsavel_assinatura: null,
      logo: null,
      site: null,
    });
  }

  static async update(id: number, dados: Partial<CreateEmpresaData>): Promise<DadosEmpresa> {
    const empresa = await DadosEmpresa.findByPk(id);
    if (!empresa) throw new Error('Empresa não encontrada');
    const payload = { ...dados };
    if (Object.prototype.hasOwnProperty.call(dados, 'responsavel_cpf')) {
      payload.responsavel_cpf = dados.responsavel_cpf ?? '';
    }
    await empresa.update(payload as Parameters<DadosEmpresa['update']>[0]);
    await empresa.reload();
    return empresa;
  }

  static async delete(id: number): Promise<void> {
    const empresa = await DadosEmpresa.findByPk(id);
    if (!empresa) throw new Error('Empresa não encontrada');

    const totalUsuarios = await Usuario.count({ where: { empresa_id: id } });
    if (totalUsuarios > 0) {
      throw new Error(`Não é possível excluir empresa com ${totalUsuarios} usuário(s) vinculado(s)`);
    }

    await empresa.destroy();
  }

  static async existsByCnpj(cnpj: string, excludeId?: number): Promise<boolean> {
    const where: WhereOptions = { cnpj };
    if (excludeId) {
      where.id = { [Op.ne]: excludeId } as unknown as number;
    }
    const empresa = await DadosEmpresa.findOne({ where });
    return !!empresa;
  }
}
