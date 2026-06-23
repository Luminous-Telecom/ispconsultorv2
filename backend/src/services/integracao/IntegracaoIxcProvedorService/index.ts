import { Op, WhereOptions } from 'sequelize';
import axios, { isAxiosError } from 'axios';
import { IntegracaoIxcProvedor } from '../../../models/integracao/IntegracaoIxcProvedor';
import { Contrato } from '../../../models/contratos/Contrato';
import { Cliente } from '../../../models/clientes/Cliente';
import { buildPagination } from '../../../utils/pagination';

function clienteDisplayName(cliente: Pick<Cliente, 'id' | 'nome_fantasia' | 'razao_social'>): string {
  const nome = (cliente.nome_fantasia || cliente.razao_social || '').trim();
  return nome || `#${cliente.id}`;
}

export interface IxcApiCredentials {
  apiUrl: string;
  apiToken: string;
}

export interface TestIntegracaoIxcResult {
  success: boolean;
  message: string;
}

export interface ListIntegracaoIxcProvedorFilters {
  search?: string;
  searchField?: string;
  ativo?: string;
  page?: number;
  limit?: number;
  sortColumn?: string;
  sortDirection?: string;
  empresa_id?: number | null;
}

export interface UpsertIntegracaoIxcProvedorInput {
  nome?: string;
  api_url?: string | null;
  api_token?: string | null;
  ativo?: boolean;
}

export class IntegracaoIxcProvedorService {
  static async list(filters: ListIntegracaoIxcProvedorFilters = {}) {
    const {
      search,
      searchField,
      ativo,
      page = 1,
      limit = 15,
      sortColumn,
      sortDirection,
      empresa_id,
    } = filters;

    const andConditions: WhereOptions<IntegracaoIxcProvedor>[] = [];

    if (empresa_id != null) {
      andConditions.push({
        [Op.or]: [{ empresa_id }, { empresa_id: null }],
      } as WhereOptions<IntegracaoIxcProvedor>);
    }

    if (search) {
      const searchPattern = `%${search}%`;
      const numExact = /^\d+$/.test(search) ? parseInt(search, 10) : null;
      let orConditions: Array<WhereOptions<IntegracaoIxcProvedor>> = [];

      if (searchField === 'id') {
        orConditions = numExact !== null
          ? [{ id: numExact } as WhereOptions<IntegracaoIxcProvedor>]
          : [{ id: { [Op.lt]: 0 } } as WhereOptions<IntegracaoIxcProvedor>];
      } else if (searchField === 'api_url') {
        orConditions = [{ api_url: { [Op.like]: searchPattern } }];
      } else {
        orConditions = [{ nome: { [Op.like]: searchPattern } }];
        if (numExact !== null) {
          orConditions.unshift({ id: numExact } as WhereOptions<IntegracaoIxcProvedor>);
        }
      }

      if (orConditions.length > 0) {
        andConditions.push({ [Op.or]: orConditions } as WhereOptions<IntegracaoIxcProvedor>);
      }
    }

    if (ativo !== undefined && ativo !== '') {
      andConditions.push({ ativo: ativo === 'ativo' });
    }

    const where: WhereOptions<IntegracaoIxcProvedor> =
      andConditions.length > 0 ? { [Op.and]: andConditions } : {};

    const sortCol = sortColumn === 'api_url' ? 'api_url' : sortColumn === 'id' ? 'id' : 'nome';
    const order: [string, string][] = [[sortCol, sortDirection?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC']];

    const offset = (Number(page) - 1) * Number(limit);
    const count = await IntegracaoIxcProvedor.count({ where });
    const data = await IntegracaoIxcProvedor.findAll({
      where,
      order,
      limit: Number(limit),
      offset,
    });

    const integracaoIds = data.map((item) => item.id);
    const clientesPorIntegracao = new Map<number, string[]>();

    if (integracaoIds.length > 0) {
      const contratos = (await Contrato.findAll({
        where: { integracao_ixc_provedor_id: { [Op.in]: integracaoIds } },
        attributes: ['integracao_ixc_provedor_id'],
        include: [
          {
            association: 'cliente',
            attributes: ['id', 'razao_social', 'nome_fantasia'],
            required: true,
          },
        ],
      })) as Array<Contrato & { cliente?: Cliente | null }>;

      for (const contrato of contratos) {
        const integracaoId = contrato.integracao_ixc_provedor_id;
        const cliente = contrato.cliente;
        if (!integracaoId || !cliente) continue;

        const nome = clienteDisplayName(cliente);
        const nomes = clientesPorIntegracao.get(integracaoId) ?? [];
        if (!nomes.includes(nome)) {
          nomes.push(nome);
        }
        clientesPorIntegracao.set(integracaoId, nomes);
      }
    }

    const enrichedData = data.map((item) => {
      const clientes = [...(clientesPorIntegracao.get(item.id) ?? [])].sort((a, b) =>
        a.localeCompare(b, 'pt-BR')
      );
      return {
        ...item.toJSON(),
        clientes_vinculados: clientes,
        clientes_label: clientes.length > 0 ? clientes.join(', ') : null,
      };
    });

    return {
      success: true,
      data: enrichedData,
      pagination: buildPagination(Number(page), Number(limit), count),
    };
  }

  static async getById(id: string | number): Promise<IntegracaoIxcProvedor | null> {
    return IntegracaoIxcProvedor.findByPk(id);
  }

  static async findAtivos(empresaId?: number | null): Promise<IntegracaoIxcProvedor[]> {
    const where: WhereOptions<IntegracaoIxcProvedor> =
      empresaId != null
        ? { ativo: true, [Op.or]: [{ empresa_id: empresaId }, { empresa_id: null }] }
        : { ativo: true };

    return IntegracaoIxcProvedor.findAll({
      where,
      order: [['nome', 'ASC']],
    });
  }

  static async create(
    empresaId: number | null,
    dados: UpsertIntegracaoIxcProvedorInput
  ): Promise<IntegracaoIxcProvedor> {
    return IntegracaoIxcProvedor.create({
      empresa_id: empresaId,
      nome: dados.nome?.trim() ?? '',
      api_url: dados.api_url?.trim() || null,
      api_token: dados.api_token?.trim() || null,
      ativo: dados.ativo ?? false,
    });
  }

  static async update(
    id: string | number,
    dados: UpsertIntegracaoIxcProvedorInput
  ): Promise<IntegracaoIxcProvedor> {
    const item = await IntegracaoIxcProvedor.findByPk(id);
    if (!item) throw new Error('Integração IXC Provedor não encontrada');

    const payload: Partial<IntegracaoIxcProvedor> = {};
    if (dados.nome !== undefined) payload.nome = dados.nome.trim();
    if (dados.api_url !== undefined) payload.api_url = dados.api_url?.trim() || null;
    if (dados.ativo !== undefined) payload.ativo = dados.ativo;

    const token = dados.api_token?.trim();
    if (token) {
      payload.api_token = token;
    }

    await item.update(payload);
    return item;
  }

  static async delete(id: string | number): Promise<void> {
    const item = await IntegracaoIxcProvedor.findByPk(id);
    if (!item) throw new Error('Integração IXC Provedor não encontrada');

    await Contrato.update(
      { integracao_ixc_provedor_id: null },
      { where: { integracao_ixc_provedor_id: item.id } }
    );

    await item.destroy();
  }

  static async getActiveCredentials(empresaId: number | null): Promise<IxcApiCredentials | null> {
    const where: WhereOptions<IntegracaoIxcProvedor> = {
      ativo: true,
      api_url: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] },
      api_token: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] },
    };

    if (empresaId != null) {
      Object.assign(where, {
        [Op.or]: [{ empresa_id: empresaId }, { empresa_id: null }],
      });
    }

    const config = await IntegracaoIxcProvedor.findOne({
      where,
      order: [['updated_at', 'DESC']],
    });

    if (!config) return null;

    const apiUrl = config.api_url?.trim();
    const apiToken = config.api_token?.trim();
    if (!apiUrl || !apiToken) return null;

    return {
      apiUrl: apiUrl.replace(/\/+$/, ''),
      apiToken,
    };
  }

  static async resolveCredentials(empresaId: number | null): Promise<IxcApiCredentials> {
    const fromDb = await IntegracaoIxcProvedorService.getActiveCredentials(empresaId);
    if (fromDb) return fromDb;

    throw new Error(
      'Integração IXC não configurada. Cadastre uma integração IXC Provedor ativa no contrato do cliente.'
    );
  }

  static async resolveCredentialsForCliente(
    clienteId: number,
    empresaId: number | null
  ): Promise<IxcApiCredentials> {
    const contrato = await IntegracaoIxcProvedorService.findContratoComIntegracao(clienteId, empresaId);

    if (!contrato?.integracao_ixc_provedor_id) {
      throw new Error(
        'Integração IXC não configurada. Cadastre uma integração IXC Provedor no contrato do cliente.'
      );
    }

    const integracao = await IntegracaoIxcProvedor.findByPk(contrato.integracao_ixc_provedor_id);
    if (!integracao) {
      throw new Error('Integração IXC Provedor vinculada ao contrato não encontrada.');
    }

    if (!integracao.ativo) {
      throw new Error('A integração IXC Provedor vinculada ao contrato está inativa.');
    }

    const apiUrl = integracao.api_url?.trim();
    const apiToken = integracao.api_token?.trim();
    if (!apiUrl || !apiToken) {
      throw new Error('Integração IXC Provedor vinculada ao contrato sem URL ou token configurados.');
    }

    return {
      apiUrl: apiUrl.replace(/\/+$/, ''),
      apiToken,
    };
  }

  static async findContratoComIntegracao(
    clienteId: number,
    empresaId: number | null
  ): Promise<Contrato | null> {
    const contratoWhere: WhereOptions<Contrato> = {
      cliente_id: clienteId,
      integracao_ixc_provedor_id: { [Op.ne]: null },
    };

    if (empresaId != null) {
      contratoWhere.empresa_id = empresaId;
    }

    return Contrato.findOne({
      where: contratoWhere,
      order: [['updated_at', 'DESC']],
    });
  }

  static async hasIntegracaoForCliente(
    clienteId: number,
    empresaId: number | null
  ): Promise<boolean> {
    const contrato = await IntegracaoIxcProvedorService.findContratoComIntegracao(clienteId, empresaId);
    if (!contrato?.integracao_ixc_provedor_id) return false;

    const integracao = await IntegracaoIxcProvedor.findByPk(contrato.integracao_ixc_provedor_id);
    if (!integracao?.ativo) return false;

    const apiUrl = integracao.api_url?.trim();
    const apiToken = integracao.api_token?.trim();
    return !!(apiUrl && apiToken);
  }

  static async assertEmpresaAccess(
    integracaoId: number,
    empresaId: number | null
  ): Promise<IntegracaoIxcProvedor | null> {
    const integracao = await IntegracaoIxcProvedor.findByPk(integracaoId);
    if (!integracao) return null;
    if (empresaId !== null && integracao.empresa_id !== null && integracao.empresa_id !== empresaId) {
      return null;
    }
    return integracao;
  }

  static async testCredentials(credentials: IxcApiCredentials): Promise<TestIntegracaoIxcResult> {
    const apiUrl = credentials.apiUrl?.trim().replace(/\/+$/, '');
    const apiToken = credentials.apiToken?.trim();

    if (!apiUrl) {
      return { success: false, message: 'Informe a URL da API do IXC.' };
    }
    if (!apiToken) {
      return { success: false, message: 'Informe o token da API do IXC.' };
    }

    try {
      const client = axios.create({
        baseURL: apiUrl,
        timeout: 30_000,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(apiToken).toString('base64')}`,
        },
      });

      await client.request({
        method: 'GET',
        url: '/filial',
        headers: { ixcsoft: 'listar' },
        data: {
          qtype: 'filial.id',
          query: '1',
          oper: '>=',
          page: '1',
          rp: '1',
          sortname: 'filial.id',
          sortorder: 'asc',
        },
      });

      return { success: true, message: 'Conexão com o IXC Provedor realizada com sucesso.' };
    } catch (error) {
      if (isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 401 || status === 403) {
          return { success: false, message: 'Token ou URL inválidos. Verifique as credenciais.' };
        }
        const data = error.response?.data;
        const apiMessage =
          typeof data === 'object' && data !== null && 'message' in data
            ? String((data as { message?: string }).message ?? '')
            : '';
        if (apiMessage) {
          return { success: false, message: apiMessage };
        }
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          return { success: false, message: 'Não foi possível conectar à URL informada.' };
        }
        return { success: false, message: error.message || 'Falha ao testar integração com o IXC.' };
      }
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao testar integração com o IXC.',
      };
    }
  }

  static async testById(
    id: number,
    empresaId: number | null,
    overrides?: { api_url?: string | null; api_token?: string | null }
  ): Promise<TestIntegracaoIxcResult> {
    const integracao = await IntegracaoIxcProvedorService.assertEmpresaAccess(id, empresaId);
    if (!integracao) {
      return { success: false, message: 'Integração IXC Provedor não encontrada' };
    }

    const apiUrl = String(overrides?.api_url ?? integracao.api_url ?? '').trim().replace(/\/+$/, '');
    const tokenOverride = overrides?.api_token?.trim();
    const apiToken = tokenOverride || integracao.api_token?.trim() || '';

    return IntegracaoIxcProvedorService.testCredentials({ apiUrl, apiToken });
  }
}
