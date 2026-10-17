import type { Prisma, integracao_ixc_provedor } from '@prisma/client';
import axios, { isAxiosError } from 'axios';
import { prisma } from '../../../db/prisma';
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
import { AtendimentoDepartamentoService } from '../../atendimentos/AtendimentoDepartamentoService';
import { AtendimentoTecnicoService } from '../../atendimentos/AtendimentoTecnicoService';
import { IXC_DEPARTAMENTO_RESOURCE } from '../../externos/IxcAtendimentoService/constants';
import { fetchFuncionariosForAtendimentoSync } from '../../externos/IxcAtendimentoService/atendimentoTecnicoContext';
import { clienteDisplayName } from '../../../utils/clienteDisplayName';

function clienteDisplayNameFromCliente(cliente: { id: number; nome_fantasia?: string | null; razao_social?: string | null }): string {
  return clienteDisplayName(cliente, cliente.id);
}

function contratoDisplayLabel(
  contrato: { id: number; cadastros_planos?: { nome_plano?: string | null } | null }
): string {
  const planoNome = contrato.cadastros_planos?.nome_plano?.trim();
  return planoNome || `Contrato #${contrato.id}`;
}

const credenciaisPreenchidas: Prisma.integracao_ixc_provedorWhereInput[] = [
  { NOT: { api_url: null } },
  { NOT: { api_url: '' } },
  { NOT: { api_token: null } },
  { NOT: { api_token: '' } },
];

function empresaOuGlobal(empresaId: number): Prisma.integracao_ixc_provedorWhereInput {
  return { OR: [{ empresa_id: empresaId }, { empresa_id: null }] };
}

async function resolveContratosVinculadosPorIntegracao(
  integracaoIds: number[]
): Promise<Map<number, Array<{ id: number; label: string }>>> {
  const contratosPorIntegracao = new Map<number, Array<{ id: number; label: string }>>();
  if (integracaoIds.length === 0) return contratosPorIntegracao;

  const vinculos = await prisma.contratos_integracao_ixc_vinculos.findMany({
    where: { integracao_ixc_provedor_id: { in: integracaoIds } },
    select: {
      integracao_ixc_provedor_id: true,
      contrato_id: true,
      contratos: {
        select: {
          id: true,
          cadastros_planos: { select: { id: true, nome_plano: true } },
        },
      },
    },
    orderBy: { contrato_id: 'asc' },
  });

  for (const vinculo of vinculos) {
    const integracaoId = vinculo.integracao_ixc_provedor_id;
    const contrato = vinculo.contratos;
    if (!integracaoId || !contrato) continue;

    const label = contratoDisplayLabel(contrato);
    const items = contratosPorIntegracao.get(integracaoId) ?? [];
    if (!items.some((item) => item.id === contrato.id)) {
      items.push({ id: contrato.id, label });
    }
    contratosPorIntegracao.set(integracaoId, items);
  }

  return contratosPorIntegracao;
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
  cliente_id: number;
  contrato_id: number;
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

    const andConditions: Prisma.integracao_ixc_provedorWhereInput[] = [];

    if (empresa_id != null) {
      andConditions.push(empresaOuGlobal(empresa_id));
    }

    if (search) {
      const numExact = /^\d+$/.test(search) ? parseInt(search, 10) : null;
      let orConditions: Prisma.integracao_ixc_provedorWhereInput[] = [];

      if (searchField === 'id') {
        orConditions = numExact !== null ? [{ id: numExact }] : [{ id: { lt: 0 } }];
      } else if (searchField === 'api_url') {
        orConditions = [{ api_url: { contains: search } }];
      } else {
        orConditions = [{ nome: { contains: search } }];
        if (numExact !== null) {
          orConditions.unshift({ id: numExact });
        }
      }

      if (orConditions.length > 0) {
        andConditions.push({ OR: orConditions });
      }
    }

    if (ativo !== undefined && ativo !== '') {
      andConditions.push({ ativo: ativo === 'ativo' });
    }

    const where: Prisma.integracao_ixc_provedorWhereInput =
      andConditions.length > 0 ? { AND: andConditions } : {};

    const sortCol = sortColumn === 'api_url' ? 'api_url' : sortColumn === 'id' ? 'id' : 'nome';
    const direction = sortDirection?.toUpperCase() === 'DESC' ? 'desc' : 'asc';

    const offset = (Number(page) - 1) * Number(limit);
    const [count, data] = await Promise.all([
      prisma.integracao_ixc_provedor.count({ where }),
      prisma.integracao_ixc_provedor.findMany({
        where,
        orderBy: { [sortCol]: direction },
        take: Number(limit),
        skip: offset,
        include: {
          clientes: { select: { id: true, razao_social: true, nome_fantasia: true } },
        },
      }),
    ]);

    const integracaoIds = data.map((item) => item.id);
    const contratosPorIntegracao = await resolveContratosVinculadosPorIntegracao(integracaoIds);

    const enrichedData = data.map((item) => {
      const clienteDireto = item.clientes ? clienteDisplayNameFromCliente(item.clientes) : null;
      const contratos = [...(contratosPorIntegracao.get(item.id) ?? [])].sort((a, b) =>
        a.label.localeCompare(b.label, 'pt-BR', { numeric: true })
      );

      return {
        ...item,
        cliente_id: item.cliente_id,
        cliente_nome: clienteDireto,
        contrato_id: contratos[0]?.id ?? null,
        contrato_nome: contratos[0]?.label ?? null,
        contratos_vinculados: contratos.map((c) => c.label),
        contratos_label: contratos.length > 0 ? contratos.map((c) => c.label).join(', ') : null,
      };
    });

    return {
      success: true,
      data: enrichedData,
      pagination: buildPagination(Number(page), Number(limit), count),
    };
  }

  static async getById(id: string | number): Promise<integracao_ixc_provedor | null> {
    return prisma.integracao_ixc_provedor.findUnique({ where: { id: Number(id) } });
  }

  /** Detalhe enriquecido com cliente e contratos vinculados. */
  static async getByIdEnriched(id: string | number): Promise<Record<string, unknown> | null> {
    const item = await prisma.integracao_ixc_provedor.findUnique({
      where: { id: Number(id) },
      include: {
        clientes: { select: { id: true, razao_social: true, nome_fantasia: true } },
      },
    });
    if (!item) return null;

    const clienteDireto = item.clientes ? clienteDisplayNameFromCliente(item.clientes) : null;
    const contratosPorIntegracao = await resolveContratosVinculadosPorIntegracao([item.id]);
    const contratos = [...(contratosPorIntegracao.get(item.id) ?? [])].sort((a, b) =>
      a.label.localeCompare(b.label, 'pt-BR', { numeric: true })
    );

    return {
      ...item,
      cliente_id: item.cliente_id,
      cliente_nome: clienteDireto,
      contrato_id: contratos[0]?.id ?? null,
      contrato_nome: contratos[0]?.label ?? null,
      contratos_vinculados: contratos.map((c) => c.label),
      contratos_label: contratos.length > 0 ? contratos.map((c) => c.label).join(', ') : null,
    };
  }

  static async findAtivos(empresaId?: number | null): Promise<integracao_ixc_provedor[]> {
    const where: Prisma.integracao_ixc_provedorWhereInput =
      empresaId != null
        ? { ativo: true, ...empresaOuGlobal(empresaId) }
        : { ativo: true };

    return prisma.integracao_ixc_provedor.findMany({
      where,
      orderBy: { nome: 'asc' },
    });
  }

  static async create(
    empresaId: number | null,
    dados: UpsertIntegracaoIxcProvedorInput
  ): Promise<integracao_ixc_provedor> {
    const item = await prisma.integracao_ixc_provedor.create({
      data: {
        empresa_id: empresaId,
        cliente_id: dados.cliente_id,
        nome: dados.nome?.trim() ?? '',
        api_url: dados.api_url?.trim() || null,
        api_token: dados.api_token?.trim() || null,
        ativo: dados.ativo ?? false,
      },
    });

    await IntegracaoIxcProvedorService.ensureContratoVinculo(
      item.id,
      dados.contrato_id,
      empresaId
    );

    return item;
  }

  static async update(
    id: string | number,
    dados: UpsertIntegracaoIxcProvedorInput
  ): Promise<integracao_ixc_provedor> {
    const item = await prisma.integracao_ixc_provedor.findUnique({ where: { id: Number(id) } });
    if (!item) throw new Error('Integração IXC Provedor não encontrada');

    const payload: Prisma.integracao_ixc_provedorUncheckedUpdateInput = {
      cliente_id: dados.cliente_id,
    };
    if (dados.nome !== undefined) payload.nome = dados.nome.trim();
    if (dados.api_url !== undefined) payload.api_url = dados.api_url?.trim() || null;
    if (dados.ativo !== undefined) payload.ativo = dados.ativo;

    const token = dados.api_token?.trim();
    if (token) {
      payload.api_token = token;
    }

    const updated = await prisma.integracao_ixc_provedor.update({
      where: { id: item.id },
      data: { ...payload, updated_at: new Date() },
    });
    await IntegracaoIxcProvedorService.ensureContratoVinculo(
      item.id,
      dados.contrato_id,
      item.empresa_id
    );
    return updated;
  }

  /** Garante o vínculo contrato ↔ integração (sem remover outros vínculos). */
  static async ensureContratoVinculo(
    integracaoId: number,
    contratoId: number,
    empresaId: number | null
  ): Promise<void> {
    const contrato = await prisma.contratos.findUnique({ where: { id: Number(contratoId) } });
    if (!contrato) {
      throw new Error('Contrato não encontrado');
    }

    const existing = await prisma.contratos_integracao_ixc_vinculos.findFirst({
      where: {
        contrato_id: contratoId,
        integracao_ixc_provedor_id: integracaoId,
      },
    });
    if (existing) return;

    await prisma.contratos_integracao_ixc_vinculos.create({
      data: {
        empresa_id: contrato.empresa_id ?? empresaId,
        contrato_id: contratoId,
        integracao_ixc_provedor_id: integracaoId,
      },
    });
  }

  static async delete(id: string | number): Promise<void> {
    const item = await prisma.integracao_ixc_provedor.findUnique({ where: { id: Number(id) } });
    if (!item) throw new Error('Integração IXC Provedor não encontrada');

    await prisma.contratos_integracao_ixc_vinculos.deleteMany({
      where: { integracao_ixc_provedor_id: item.id },
    });

    await prisma.integracao_ixc_provedor.delete({ where: { id: item.id } });
  }

  static async getActiveCredentials(empresaId: number | null): Promise<IxcApiCredentials | null> {
    const where: Prisma.integracao_ixc_provedorWhereInput = {
      ativo: true,
      AND: credenciaisPreenchidas,
    };

    if (empresaId != null) {
      where.AND = [...credenciaisPreenchidas, empresaOuGlobal(empresaId)];
    }

    const config = await prisma.integracao_ixc_provedor.findFirst({
      where,
      orderBy: { updated_at: 'desc' },
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

  static getEnvCredentials(): IxcApiCredentials | null {
    const apiUrl = process.env.IXC_API_URL?.trim();
    const apiToken = process.env.IXC_API_TOKEN?.trim();
    if (!apiUrl || !apiToken) return null;
    return {
      apiUrl: apiUrl.replace(/\/+$/, ''),
      apiToken,
    };
  }

  static async resolveCredentials(empresaId: number | null): Promise<IxcApiCredentials> {
    const fromDb = await IntegracaoIxcProvedorService.getActiveCredentials(empresaId);
    if (fromDb) return fromDb;

    const fromEnv = IntegracaoIxcProvedorService.getEnvCredentials();
    if (fromEnv) return fromEnv;

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

    if (integracao) {
      const apiUrl = integracao.api_url?.trim();
      const apiToken = integracao.api_token?.trim();
      if (apiUrl && apiToken) {
        return {
          apiUrl: apiUrl.replace(/\/+$/, ''),
          apiToken,
        };
      }
    }

    const fromEnv = IntegracaoIxcProvedorService.getEnvCredentials();
    if (fromEnv) return fromEnv;

    throw new Error(
      'Integração IXC não configurada. Cadastre uma integração IXC Provedor no contrato do cliente.'
    );
  }

  static async findIntegracaoAtivaForCliente(
    clienteId: number,
    empresaId: number | null
  ): Promise<integracao_ixc_provedor | null> {
    const direta = await prisma.integracao_ixc_provedor.findFirst({
      where:
        empresaId != null
          ? {
              AND: [
                { cliente_id: clienteId, ativo: true },
                empresaOuGlobal(empresaId),
              ],
            }
          : { cliente_id: clienteId, ativo: true },
      orderBy: { updated_at: 'desc' },
    });
    if (direta?.api_url?.trim() && direta.api_token?.trim()) {
      return direta;
    }

    const contratoWhere: Prisma.contratosWhereInput = { cliente_id: clienteId };
    if (empresaId != null) {
      contratoWhere.empresa_id = empresaId;
    }

    const vinculos = await prisma.contratos_integracao_ixc_vinculos.findMany({
      where: { contratos: contratoWhere },
      include: { integracao_ixc_provedor: true },
      orderBy: { updated_at: 'desc' },
    });

    for (const vinculo of vinculos) {
      const integracao = vinculo.integracao_ixc_provedor;
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
    if (integracao != null) return true;
    return IntegracaoIxcProvedorService.getEnvCredentials() != null;
  }

  static async assertEmpresaAccess(
    integracaoId: number,
    empresaId: number | null
  ): Promise<integracao_ixc_provedor | null> {
    const integracao = await prisma.integracao_ixc_provedor.findUnique({
      where: { id: integracaoId },
    });
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
        {
          resource: IXC_DEPARTAMENTO_RESOURCE,
          nomeCampo: 'setor',
          label: 'departamentos_atendimento',
        },
      ];

      let total = 0;
      const detalhes: Record<string, number> = {};

      for (const cadastro of cadastros) {
        const itens = await IxcOssChamadoService.fetchCadastrosForSync(
          cadastro.resource,
          cadastro.nomeCampo
        );

        if (cadastro.resource === IXC_DEPARTAMENTO_RESOURCE) {
          await AtendimentoDepartamentoService.syncIxcItens(empresaId, integracaoId, itens);
          await AtendimentoDepartamentoService.pruneIxcCadastros(
            empresaId,
            integracaoId,
            new Set(itens.map((item) => String(item.id)))
          );
        } else {
          const tipo = OrdemServicoCadastroService.resolveTipoByIxcResource(cadastro.resource)!;
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
        }

        detalhes[cadastro.label] = itens.length;
        total += itens.length;
      }

      const tecnicosAtendimento = await fetchFuncionariosForAtendimentoSync('funcionario');
      await AtendimentoTecnicoService.syncIxcItens(empresaId, integracaoId, tecnicosAtendimento);
      await AtendimentoTecnicoService.pruneIxcCadastros(
        empresaId,
        integracaoId,
        new Set(tecnicosAtendimento.map((item) => String(item.id)))
      );
      detalhes.tecnicos_atendimento = tecnicosAtendimento.length;
      total += tecnicosAtendimento.length;

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
