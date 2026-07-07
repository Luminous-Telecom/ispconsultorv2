import { Op, WhereOptions } from 'sequelize';
import axios, { isAxiosError } from 'axios';
import { IntegracaoIxcProvedor } from '../../../models/integracao/IntegracaoIxcProvedor';
import { Contrato } from '../../../models/contratos/Contrato';
import { ContratoIntegracaoIxcVinculo } from '../../../models/contratos/ContratoIntegracaoIxcVinculo';
import { Cliente } from '../../../models/clientes/Cliente';
import { buildPagination } from '../../../utils/pagination';
import { runWithIntegracaoCredentials } from '../../externos/ixcApiContext';
import { IxcOssChamadoService } from '../../externos/IxcOssChamadoService';
import {
  IXC_ASSUNTO_RESOURCE,
  IXC_ESTRUTURA_RESOURCE,
  IXC_FILIAL_RESOURCE,
  IXC_FUNCIONARIOS_RESOURCE,
  IXC_SETOR_RESOURCE,
} from '../../externos/IxcOssChamadoService/constants';
import {
  IxcApiPermissionsService,
  type IxcApiPermissionsCheckResult,
  type IxcPermissionSampleResult,
} from '../IxcApiPermissionsService';
import { OrdemServicoCadastroService } from '../../ordens/OrdemServicoCadastroService';
import { clienteDisplayName } from '../../../utils/clienteDisplayName';

function clienteDisplayNameFromCliente(cliente: Pick<Cliente, 'id' | 'nome_fantasia' | 'razao_social'>): string {
  return clienteDisplayName(cliente, cliente.id);
}

export interface IxcApiCredentials {
  apiUrl: string;
  apiToken: string;
}

export interface TestIntegracaoIxcResult {
  success: boolean;
  message: string;
}

export interface SyncOrdemServicoCadastrosResult {
  message: string;
  total: number;
  detalhes: Record<string, number>;
  ordens?: {
    total: number;
    sucesso: number;
    erro: number;
    ignoradas?: number;
    desvinculadas?: number;
    importadas?: number;
  };
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
      const vinculos = (await ContratoIntegracaoIxcVinculo.findAll({
        where: { integracao_ixc_provedor_id: { [Op.in]: integracaoIds } },
        attributes: ['integracao_ixc_provedor_id'],
        include: [
          {
            association: 'contrato',
            attributes: ['id'],
            required: true,
            include: [
              {
                association: 'cliente',
                attributes: ['id', 'razao_social', 'nome_fantasia'],
                required: true,
              },
            ],
          },
        ],
      })) as Array<
        ContratoIntegracaoIxcVinculo & {
          contrato?: (Contrato & { cliente?: Cliente | null }) | null;
        }
      >;

      for (const vinculo of vinculos) {
        const integracaoId = vinculo.integracao_ixc_provedor_id;
        const cliente = vinculo.contrato?.cliente;
        if (!integracaoId || !cliente) continue;

        const nome = clienteDisplayNameFromCliente(cliente);
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

    await ContratoIntegracaoIxcVinculo.destroy({
      where: { integracao_ixc_provedor_id: item.id },
    });

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
    const integracao = await IntegracaoIxcProvedorService.findIntegracaoAtivaForCliente(
      clienteId,
      empresaId
    );

    if (!integracao) {
      throw new Error(
        'Integração IXC não configurada. Cadastre uma integração IXC Provedor no contrato do cliente.'
      );
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

  static async findIntegracaoAtivaForCliente(
    clienteId: number,
    empresaId: number | null
  ): Promise<IntegracaoIxcProvedor | null> {
    const contratoWhere: WhereOptions<Contrato> = { cliente_id: clienteId };
    if (empresaId != null) {
      contratoWhere.empresa_id = empresaId;
    }

    const vinculos = (await ContratoIntegracaoIxcVinculo.findAll({
      include: [
        {
          association: 'contrato',
          where: contratoWhere,
          required: true,
          attributes: ['id'],
        },
        {
          association: 'integracaoIxcProvedor',
          required: true,
        },
      ],
      order: [['updated_at', 'DESC']],
    })) as Array<
      ContratoIntegracaoIxcVinculo & { integracaoIxcProvedor?: IntegracaoIxcProvedor | null }
    >;

    for (const vinculo of vinculos) {
      const integracao = vinculo.integracaoIxcProvedor;
      if (!integracao?.ativo) continue;

      const apiUrl = integracao.api_url?.trim();
      const apiToken = integracao.api_token?.trim();
      if (apiUrl && apiToken) {
        return integracao;
      }
    }

    return null;
  }

  static async hasIntegracaoForCliente(
    clienteId: number,
    empresaId: number | null
  ): Promise<boolean> {
    const integracao = await IntegracaoIxcProvedorService.findIntegracaoAtivaForCliente(
      clienteId,
      empresaId
    );
    return integracao != null;
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

  static async resolveCredentialsByIntegracaoId(
    integracaoId: number,
    empresaId: number | null
  ): Promise<IxcApiCredentials> {
    const integracao = await IntegracaoIxcProvedorService.assertEmpresaAccess(integracaoId, empresaId);
    if (!integracao) {
      throw new Error('Integração IXC Provedor não encontrada');
    }

    const apiUrl = integracao.api_url?.trim().replace(/\/+$/, '');
    const apiToken = integracao.api_token?.trim();
    if (!apiUrl || !apiToken) {
      throw new Error('Integração IXC Provedor sem URL ou token configurados.');
    }

    return { apiUrl, apiToken };
  }

  static async syncOrdemServicoCadastros(
    integracaoId: number,
    empresaId: number | null
  ): Promise<SyncOrdemServicoCadastrosResult> {
    const integracao = await IntegracaoIxcProvedorService.assertEmpresaAccess(integracaoId, empresaId);
    if (!integracao) {
      throw new Error('Integração IXC Provedor não encontrada');
    }
    if (!integracao.ativo) {
      throw new Error('Ative a integração IXC Provedor antes de sincronizar.');
    }

    const apiUrl = integracao.api_url?.trim().replace(/\/+$/, '');
    const apiToken = integracao.api_token?.trim();
    if (!apiUrl || !apiToken) {
      throw new Error('Integração IXC Provedor sem URL ou token configurados.');
    }

    const cadastrosResult = await runWithIntegracaoCredentials({ apiUrl, apiToken }, async () => {
      const cadastros: Array<{
        resource: string;
        nomeCampo: string;
        label: string;
      }> = [
        { resource: IXC_FILIAL_RESOURCE, nomeCampo: 'fantasia', label: 'filiais' },
        { resource: IXC_SETOR_RESOURCE, nomeCampo: 'setor', label: 'setores' },
        { resource: IXC_FUNCIONARIOS_RESOURCE, nomeCampo: 'funcionario', label: 'colaboradores' },
        { resource: IXC_ASSUNTO_RESOURCE, nomeCampo: 'assunto', label: 'assuntos' },
        { resource: IXC_ESTRUTURA_RESOURCE, nomeCampo: 'descricao', label: 'estruturas' },
      ];

      let total = 0;
      const detalhes: Record<string, number> = {};

      for (const cadastro of cadastros) {
        const tipo = OrdemServicoCadastroService.resolveTipoByIxcResource(cadastro.resource)!;
        const itens = await IxcOssChamadoService.fetchCadastrosForSync(
          cadastro.resource,
          cadastro.nomeCampo
        );
        await OrdemServicoCadastroService.syncIxcItens(tipo, empresaId, integracaoId, itens);

        if (
          cadastro.resource === IXC_SETOR_RESOURCE ||
          cadastro.resource === IXC_ASSUNTO_RESOURCE ||
          cadastro.resource === IXC_FUNCIONARIOS_RESOURCE
        ) {
          await OrdemServicoCadastroService.pruneIxcCadastros(
            tipo,
            empresaId,
            integracaoId,
            new Set(itens.map((item) => String(item.id)))
          );
        }

        detalhes[cadastro.label] = itens.length;
        total += itens.length;
      }

      return {
        total,
        detalhes,
      };
    });

    const { IxcOsSchedulerRoutineService } = await import('../../ordens/IxcOsSchedulerRoutineService');
    const ordensResult = await IxcOsSchedulerRoutineService.syncIntegracao(integracao, 'manual');

    let message = 'Sincronização concluída.';
    if (ordensResult.erro > 0) {
      message = `Sincronização concluída com ${ordensResult.erro} erro(s).`;
    } else if (ordensResult.sucesso > 0) {
      message = `Sincronização concluída: ${ordensResult.sucesso} ordens atualizadas.`;
    }

    return {
      total: cadastrosResult.total,
      detalhes: cadastrosResult.detalhes,
      ordens: {
        total: ordensResult.total,
        sucesso: ordensResult.sucesso,
        erro: ordensResult.erro,
        ignoradas: ordensResult.ignoradas,
        desvinculadas: ordensResult.desvinculadas,
        importadas: ordensResult.importadas,
      },
      message,
    };
  }

  static async checkApiPermissions(
    integracaoId: number,
    empresaId: number | null
  ): Promise<IxcApiPermissionsCheckResult> {
    const integracao = await IntegracaoIxcProvedorService.assertEmpresaAccess(integracaoId, empresaId);
    if (!integracao) {
      throw new Error('Integração IXC Provedor não encontrada');
    }

    const apiUrl = integracao.api_url?.trim().replace(/\/+$/, '');
    const apiToken = integracao.api_token?.trim();
    if (!apiUrl || !apiToken) {
      throw new Error('Integração IXC Provedor sem URL ou token configurados.');
    }

    return runWithIntegracaoCredentials({ apiUrl, apiToken }, () => IxcApiPermissionsService.checkAll());
  }

  static async checkApiPermissionsDados(
    integracaoId: number,
    resourceId: string,
    empresaId: number | null
  ): Promise<IxcPermissionSampleResult> {
    const integracao = await IntegracaoIxcProvedorService.assertEmpresaAccess(integracaoId, empresaId);
    if (!integracao) {
      throw new Error('Integração IXC Provedor não encontrada');
    }

    const apiUrl = integracao.api_url?.trim().replace(/\/+$/, '');
    const apiToken = integracao.api_token?.trim();
    if (!apiUrl || !apiToken) {
      throw new Error('Integração IXC Provedor sem URL ou token configurados.');
    }

    return runWithIntegracaoCredentials({ apiUrl, apiToken }, () =>
      IxcApiPermissionsService.fetchSample(resourceId)
    );
  }
}
