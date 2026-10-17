import { Prisma } from '@prisma/client';
import type { ordens_servico, ordens_servico_mensagens } from '@prisma/client';
import { prisma } from '../../../db/prisma';

type OrdemServicoLocal = ordens_servico;
type OrdemServicoMensagem = ordens_servico_mensagens;

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

async function updateOrdem(
  record: OrdemServicoLocal,
  data: Prisma.ordens_servicoUpdateInput
): Promise<OrdemServicoLocal> {
  const updated = await prisma.ordens_servico.update({
    where: { id: record.id },
    data: { ...data, updated_at: new Date() },
  });
  Object.assign(record, updated);
  return updated;
}
import { nowIxcDateTime } from '../../externos/IxcOssChamadoService/ixcHttp';
import {
  IXC_EVENTO_ABERTURA,
  IXC_EVENTO_FINALIZAR,
  IXC_EVENTO_OBSERVACAO,
  OSS_EVENTO_LABELS,
} from '../../externos/IxcOssChamadoService/constants';
import type {
  IxcActionResponse,
  IxcOssChamado,
  IxcOssMensagem,
  ListOssChamadosFilters,
  ListOssChamadosResponse,
  OssChamadoInput,
} from '../../externos/IxcOssChamadoService/types';
import { parseClienteId } from '../../externos/IxcOssChamadoService/ossPayload';
import { sortRegistros } from '../../externos/IxcOssChamadoService/ossData';
import { OrdemServicoCadastroService } from '../OrdemServicoCadastroService';
import {
  formatLocalProtocolo,
  localProtocoloYearMonthPrefix,
  parseLocalProtocolo,
} from '../ordemServicoProtocolo';
import { clienteNomeParaOrdemServico } from '../clienteNomeOrdemServico';
import {
  isOrdemServicoFinalizada,
  MSG_OS_FINALIZADA,
} from '../ordemServicoExclusao';
import { extractOperadorFromMensagem } from '../ordemServicoMensagemFormat';

function parseNumericId(id: string | number): number | null {
  const numericId = parseInt(String(id).trim(), 10);
  return Number.isFinite(numericId) && numericId > 0 ? numericId : null;
}

function empresaWhere(empresaId: number | null): Prisma.ordens_servicoWhereInput {
  if (empresaId == null) return {};
  return { empresa_id: empresaId };
}

function toIxcOssChamado(record: OrdemServicoLocal, clienteNome: string): IxcOssChamado {
  const isIxc = Boolean(record.ixc_id?.trim());

  return {
    id: isIxc ? String(record.ixc_id) : String(record.id),
    id_local: String(record.id),
    ixc_id: isIxc ? String(record.ixc_id) : '',
    origem: isIxc ? 'ixc' : 'ispconsultor',
    cliente_id: String(record.cliente_id),
    cliente_nome: clienteNome,
    prioridade: record.prioridade,
    melhor_horario_agenda: record.melhor_horario_agenda,
    data_agenda: record.data_agenda ?? '',
    mensagem: record.mensagem,
    status: record.status,
    protocolo: record.protocolo,
    data_abertura: record.data_abertura,
    id_filial: record.id_filial,
    id_estrutura: record.id_estrutura,
    id_assunto: record.id_assunto,
    setor: record.setor,
    id_tecnico: record.id_tecnico,
    tipo: record.tipo,
  };
}

const PROTOCOLO_CREATE_MAX_RETRIES = 5;

async function nextProtocolo(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const prefix = localProtocoloYearMonthPrefix(now);

  const ultimo = await prisma.ordens_servico.findFirst({
    where: { protocolo: { startsWith: prefix } },
    select: { protocolo: true },
    orderBy: { protocolo: 'desc' },
  });

  let sequence = 1;
  if (ultimo?.protocolo) {
    const parsed = parseLocalProtocolo(ultimo.protocolo);
    if (parsed?.year === year && parsed.month === month) {
      sequence = parsed.sequence + 1;
    }
  }

  return formatLocalProtocolo(year, month, sequence);
}

function toIxcOssMensagem(
  record: OrdemServicoMensagem,
  ordemId: number,
  usuarioNomes: Map<number, string>
): IxcOssMensagem {
  let operadorNome =
    record.usuario_id != null ? usuarioNomes.get(record.usuario_id) ?? '' : '';
  if (!operadorNome) {
    operadorNome = extractOperadorFromMensagem(record.mensagem).operador;
  }

  return {
    id: String(record.id),
    id_chamado: String(ordemId),
    id_evento: record.id_evento,
    id_operador: record.usuario_id != null ? String(record.usuario_id) : '',
    mensagem: record.mensagem,
    data: record.data,
    evento_nome: OSS_EVENTO_LABELS[record.id_evento] ?? `Evento ${record.id_evento}`,
    operador_nome: operadorNome,
  };
}

async function fetchUsuarioNomes(usuarioIds: number[]): Promise<Map<number, string>> {
  if (usuarioIds.length === 0) return new Map();

  const usuarios = await prisma.cadastros_usuarios.findMany({
    where: { id: { in: usuarioIds } },
    select: { id: true, nome: true },
  });

  return new Map(usuarios.map((usuario) => [usuario.id, usuario.nome?.trim() || String(usuario.id)]));
}

export async function fetchUsuarioNomeById(usuarioId: number | null): Promise<string> {
  if (!usuarioId) return '';
  const mapa = await fetchUsuarioNomes([usuarioId]);
  return mapa.get(usuarioId) ?? '';
}

async function resolveUsuarioIdByNome(
  nome: string,
  empresaId: number | null
): Promise<number | null> {
  const trimmed = nome.trim();
  if (!trimmed) return null;

  const where: Prisma.cadastros_usuariosWhereInput = { nome: trimmed };
  if (empresaId != null && empresaId > 0) {
    where.empresa_id = empresaId;
  }

  const usuario = await prisma.cadastros_usuarios.findFirst({
    where,
    select: { id: true },
  });
  return usuario?.id ?? null;
}

async function mapMensagensComOperador(
  mensagens: OrdemServicoMensagem[],
  ordemId: number
): Promise<IxcOssMensagem[]> {
  const usuarioIds = [
    ...new Set(
      mensagens
        .map((item) => item.usuario_id)
        .filter((id): id is number => id != null && id > 0)
    ),
  ];
  const usuarioNomes = await fetchUsuarioNomes(usuarioIds);
  return mensagens.map((item) => toIxcOssMensagem(item, ordemId, usuarioNomes));
}

async function fetchOperadorAberturaPorOrdemIds(
  ordemIds: number[]
): Promise<Map<number, string>> {
  if (ordemIds.length === 0) return new Map();

  const aberturas = await prisma.ordens_servico_mensagens.findMany({
    where: {
      ordem_servico_id: { in: ordemIds },
      id_evento: IXC_EVENTO_ABERTURA,
    },
  });

  const usuarioIds = [
    ...new Set(
      aberturas
        .map((item) => item.usuario_id)
        .filter((id): id is number => id != null && id > 0)
    ),
  ];
  const usuarioNomes = await fetchUsuarioNomes(usuarioIds);

  const mapa = new Map<number, string>();
  for (const abertura of aberturas) {
    if (abertura.usuario_id == null) continue;
    const nome = usuarioNomes.get(abertura.usuario_id) ?? '';
    if (nome) mapa.set(abertura.ordem_servico_id, nome);
  }
  return mapa;
}

async function fetchMensagemRespostaPorOrdemIds(
  ordemIds: number[]
): Promise<Map<number, string>> {
  if (ordemIds.length === 0) return new Map();

  const finalizacoes = await prisma.ordens_servico_mensagens.findMany({
    where: {
      ordem_servico_id: { in: ordemIds },
      id_evento: IXC_EVENTO_FINALIZAR,
    },
    orderBy: { id: 'desc' },
  });

  const mapa = new Map<number, string>();
  for (const finalizacao of finalizacoes) {
    if (mapa.has(finalizacao.ordem_servico_id)) continue;
    const texto = String(finalizacao.mensagem ?? '').trim();
    if (texto) mapa.set(finalizacao.ordem_servico_id, texto);
  }
  return mapa;
}

function withMensagemResposta(
  chamado: IxcOssChamado,
  ordemLocalId: number,
  respostaPorOrdem: Map<number, string>
): IxcOssChamado {
  const existente = String(chamado.mensagem_resposta ?? '').trim();
  if (existente) return chamado;

  const resposta = respostaPorOrdem.get(ordemLocalId);
  return resposta ? { ...chamado, mensagem_resposta: resposta } : chamado;
}

function applyListFilters(
  data: IxcOssChamado[],
  filters: ListOssChamadosFilters
): IxcOssChamado[] {
  const search = filters.search?.trim();
  const sortColumn = filters.sortColumn?.trim() || 'id';
  const sortDirection = filters.sortDirection === 'asc' ? 'asc' : 'desc';
  const searchField = filters.searchField?.trim() || 'cliente_nome';

  let result = data;
  if (search) {
    const termo = search.toLowerCase();
    result = result.filter((item) =>
      [
        searchField,
        'mensagem',
        'protocolo',
        'cliente_nome',
        'operador_nome',
        'estrutura_nome',
        'filial_nome',
        'assunto_nome',
        'setor_nome',
        'tecnico_nome',
      ].some((campo) => String(item[campo] ?? '').toLowerCase().includes(termo))
    );
  }

  return sortRegistros(result, sortColumn, sortDirection);
}

function resolveCadastroNome(mapa: Map<string, string>, referencia: string): string {
  const ref = String(referencia ?? '').trim();
  if (!ref || ref === '0') return '';
  return mapa.get(ref) ?? '';
}

async function enrichChamadosComCadastrosLocais(
  chamados: IxcOssChamado[],
  registros: OrdemServicoLocal[],
  empresaId: number | null
): Promise<IxcOssChamado[]> {
  if (chamados.length === 0) return [];

  const filialRefs = registros.map((r) => r.id_filial);
  const estruturaRefs = registros.map((r) => r.id_estrutura);
  const assuntoRefs = registros.map((r) => r.id_assunto);
  const setorRefs = registros.map((r) => r.setor);
  const tecnicoRefs = registros.map((r) => r.id_tecnico);

  const [filiais, estruturas, assuntos, setores, tecnicos] = await Promise.all([
    OrdemServicoCadastroService.lookupNomesPorReferencias('filial', filialRefs, empresaId),
    OrdemServicoCadastroService.lookupNomesPorReferencias('estrutura', estruturaRefs, empresaId),
    OrdemServicoCadastroService.lookupNomesPorReferencias('assunto', assuntoRefs, empresaId),
    OrdemServicoCadastroService.lookupNomesPorReferencias('setor', setorRefs, empresaId),
    OrdemServicoCadastroService.lookupNomesPorReferencias('tecnico', tecnicoRefs, empresaId),
  ]);

  return chamados.map((chamado, index) => {
    const record = registros[index];
    if (!record) return chamado;

    return {
      ...chamado,
      filial_nome: resolveCadastroNome(filiais, record.id_filial),
      estrutura_nome: resolveCadastroNome(estruturas, record.id_estrutura),
      assunto_nome: resolveCadastroNome(assuntos, record.id_assunto),
      setor_nome: resolveCadastroNome(setores, record.setor),
      tecnico_nome: resolveCadastroNome(tecnicos, record.id_tecnico),
    };
  });
}

async function mapLocalRegistros(
  registros: OrdemServicoLocal[],
  empresaId: number | null = null
): Promise<IxcOssChamado[]> {
  if (registros.length === 0) return [];

  const clienteIds = [...new Set(registros.map((r) => r.cliente_id))];
  const clientes = clienteIds.length
    ? await prisma.clientes.findMany({
        where: { id: { in: clienteIds } },
        select: { id: true, razao_social: true, nome_fantasia: true },
      })
    : [];
  const clienteNomes = new Map(
    clientes.map((c) => [c.id, clienteNomeParaOrdemServico(c, c.id)])
  );

  const ordemIds = registros.map((r) => r.id);
  const [operadorPorOrdem, respostaPorOrdem] = await Promise.all([
    fetchOperadorAberturaPorOrdemIds(ordemIds),
    fetchMensagemRespostaPorOrdemIds(ordemIds),
  ]);

  return enrichChamadosComCadastrosLocais(
    registros.map((record) => {
      const chamado = toIxcOssChamado(
        record,
        clienteNomes.get(record.cliente_id) ?? String(record.cliente_id)
      );
      const operadorNome = operadorPorOrdem.get(record.id);
      const comOperador = operadorNome ? { ...chamado, operador_nome: operadorNome } : chamado;
      return withMensagemResposta(comOperador, record.id, respostaPorOrdem);
    }),
    registros,
    empresaId
  );
}

export class OrdemServicoLocalService {
  static async list(
    filters: ListOssChamadosFilters = {},
    empresaId: number | null = null
  ): Promise<ListOssChamadosResponse> {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 15;

    const registros = await prisma.ordens_servico.findMany({
      where: empresaWhere(empresaId),
      orderBy: { id: 'desc' },
    });

    const data = applyListFilters(await mapLocalRegistros(registros, empresaId), filters);

    const total = data.length;
    const lastPage = Math.max(1, Math.ceil(total / limit) || 1);
    const offset = (page - 1) * limit;
    const pagina = data.slice(offset, offset + limit);

    return {
      data: pagina,
      pagination: {
        current_page: page,
        per_page: limit,
        total,
        last_page: lastPage,
        from: total > 0 ? offset + 1 : 0,
        to: Math.min(offset + limit, total),
      },
    };
  }

  /** OS (locais e/ou já sincronizadas com IXC) vinculadas a este atendimento local. */
  static async listByAtendimentoId(
    atendimentoId: number,
    empresaId: number | null = null
  ): Promise<IxcOssChamado[]> {
    const registros = await prisma.ordens_servico.findMany({
      where: {
        atendimento_id: atendimentoId,
        ...empresaWhere(empresaId),
      },
      orderBy: { id: 'desc' },
    });

    return mapLocalRegistros(registros, empresaId);
  }

  static async createIxcMirror(
    ixcOs: IxcOssChamado,
    payload: OssChamadoInput,
    empresaId: number | null,
    usuarioId: number | null,
    clienteId: number
  ): Promise<OrdemServicoLocal> {
    const record = await this.createRecord(
      {
        ...payload,
        cliente_id: clienteId,
        mensagem:
          String(ixcOs.mensagem ?? payload.mensagem ?? '').trim() || 'OS importada do IXC',
        prioridade: ixcOs.prioridade ?? payload.prioridade,
        melhor_horario_agenda: ixcOs.melhor_horario_agenda ?? payload.melhor_horario_agenda,
        data_agenda: ixcOs.data_agenda ?? payload.data_agenda,
        id_filial: ixcOs.id_filial ?? payload.id_filial,
        id_estrutura: ixcOs.id_estrutura ?? payload.id_estrutura,
        id_assunto: ixcOs.id_assunto ?? payload.id_assunto,
        setor: ixcOs.setor ?? payload.setor,
        id_tecnico: ixcOs.id_tecnico ?? payload.id_tecnico,
        tipo: ixcOs.tipo ?? payload.tipo,
      },
      empresaId,
      usuarioId,
      false
    );

    const linked = await this.linkToIxc(record, ixcOs.id, {
      data_abertura: ixcOs.data_abertura,
    });
    const status = String(ixcOs.status ?? '').trim();
    if (status && status !== linked.status) {
      await updateOrdem(linked, { status });
    }
    return linked;
  }

  static async syncFromIxcOs(
    ixcId: string | number,
    ixcOs: IxcOssChamado,
    payload: OssChamadoInput = {},
    empresaId: number | null = null
  ): Promise<void> {
    const record = await this.findByIxcId(ixcId, empresaId);
    if (!record) return;

    const updates: Prisma.ordens_servicoUpdateInput = {
      prioridade: String(ixcOs.prioridade ?? record.prioridade).trim() || record.prioridade,
      melhor_horario_agenda:
        String(ixcOs.melhor_horario_agenda ?? record.melhor_horario_agenda).trim() ||
        record.melhor_horario_agenda,
      data_agenda: String(ixcOs.data_agenda ?? record.data_agenda ?? '').trim() || null,
      mensagem: String(ixcOs.mensagem ?? record.mensagem).trim() || record.mensagem,
      status: String(ixcOs.status ?? record.status).trim() || record.status,
      data_abertura: String(ixcOs.data_abertura ?? record.data_abertura).trim() || record.data_abertura,
      id_filial: String(ixcOs.id_filial ?? payload.id_filial ?? record.id_filial).trim(),
      id_estrutura: String(ixcOs.id_estrutura ?? payload.id_estrutura ?? record.id_estrutura).trim() || '0',
      id_assunto: String(ixcOs.id_assunto ?? payload.id_assunto ?? record.id_assunto).trim(),
      setor: String(ixcOs.setor ?? payload.setor ?? record.setor).trim(),
      id_tecnico: String(ixcOs.id_tecnico ?? payload.id_tecnico ?? record.id_tecnico).trim(),
      tipo: String(ixcOs.tipo ?? payload.tipo ?? record.tipo).trim() || record.tipo,
    };

    await updateOrdem(record, updates);
  }

  static async findByIxcId(
    ixcId: string | number,
    empresaId: number | null = null
  ): Promise<OrdemServicoLocal | null> {
    const normalized = String(ixcId).trim();
    if (!normalized) return null;

    return prisma.ordens_servico.findFirst({
      where: {
        ixc_id: normalized,
        ...empresaWhere(empresaId),
      },
    });
  }

  static async findRecord(
    id: string | number,
    empresaId: number | null = null
  ): Promise<OrdemServicoLocal | null> {
    const byIxc = await this.findByIxcId(id, empresaId);
    if (byIxc) return byIxc;

    const numericId = parseNumericId(id);
    if (numericId != null) {
      const byLocalId = await prisma.ordens_servico.findFirst({
        where: {
          id: numericId,
          ixc_id: { not: null },
          ...empresaWhere(empresaId),
        },
      });
      if (byLocalId) return byLocalId;
    }

    return this.findPureLocalRecord(id, empresaId);
  }

  static async getChamado(
    id: string | number,
    empresaId: number | null = null
  ): Promise<IxcOssChamado | null> {
    const record = await this.findRecord(id, empresaId);
    if (!record) return null;

    const [chamado] = await mapLocalRegistros([record], empresaId ?? record.empresa_id);
    return chamado ?? null;
  }

  static async isOrdemServicoLocal(id: string | number, empresaId: number | null = null): Promise<boolean> {
    const record = await this.findRecord(id, empresaId);
    return record != null && !record.ixc_id?.trim();
  }

  static async createRecord(
    payload: OssChamadoInput,
    empresaId: number | null = null,
    usuarioId: number | null = null,
    criarMensagemAbertura = true
  ): Promise<OrdemServicoLocal> {
    const clienteId = parseClienteId(payload.cliente_id);
    if (!clienteId) {
      throw new Error('Selecione o cliente');
    }

    const mensagem = String(payload.mensagem ?? '').trim();
    if (!mensagem) {
      throw new Error('Informe a mensagem ou descrição');
    }

    const dataAbertura = nowIxcDateTime();

    const atendimentoId = parseNumericId(payload.atendimento_id ?? '');
    const atendimentoIxcId =
      String(payload.atendimento_ixc_id ?? payload.id_ticket ?? '').trim() || null;
    const integracaoIxcProvedorId = parseNumericId(payload.integracao_ixc_provedor_id ?? '');

    for (let attempt = 0; attempt < PROTOCOLO_CREATE_MAX_RETRIES; attempt++) {
      const protocolo = await nextProtocolo();

      try {
        const record = await prisma.ordens_servico.create({ data: {
          empresa_id: empresaId,
          cliente_id: clienteId,
          ixc_id: null,
          prioridade: String(payload.prioridade ?? 'N').trim() || 'N',
          melhor_horario_agenda: String(payload.melhor_horario_agenda ?? 'Q').trim() || 'Q',
          data_agenda: String(payload.data_agenda ?? '').trim() || null,
          mensagem,
          status: 'A',
          protocolo,
          data_abertura: dataAbertura,
          id_filial: String(payload.id_filial ?? '').trim(),
          id_estrutura: String(payload.id_estrutura ?? '0').trim() || '0',
          id_assunto: String(payload.id_assunto ?? '').trim(),
          setor: String(payload.setor ?? '').trim(),
          id_tecnico: String(payload.id_tecnico ?? '').trim(),
          tipo: String(payload.tipo ?? 'E').trim() || 'E',
          atendimento_id: atendimentoId,
          atendimento_ixc_id: atendimentoIxcId,
          integracao_ixc_provedor_id: integracaoIxcProvedorId,
          },
        });

        if (criarMensagemAbertura) {
          await prisma.ordens_servico_mensagens.create({ data: {
            empresa_id: empresaId,
            ordem_servico_id: record.id,
            id_evento: IXC_EVENTO_ABERTURA,
            mensagem,
            data: dataAbertura,
            usuario_id: usuarioId,
          } });
        }

        return record;
      } catch (error) {
        if (isUniqueConstraintError(error) && attempt < PROTOCOLO_CREATE_MAX_RETRIES - 1) {
          continue;
        }
        throw error;
      }
    }

    throw new Error('Não foi possível gerar um protocolo único para a ordem de serviço');
  }

  static async linkToIxc(
    record: OrdemServicoLocal,
    ixcId: string | number,
    meta: { data_abertura?: string } = {}
  ): Promise<OrdemServicoLocal> {
    const normalized = String(ixcId).trim();
    if (!normalized) {
      throw new Error('IXC não retornou o ID da ordem de serviço criada');
    }

    const dataAbertura = String(meta.data_abertura ?? record.data_abertura).trim() || record.data_abertura;

    await updateOrdem(record, {
      ixc_id: normalized,
      data_abertura: dataAbertura,
    });

    return record;
  }

  static async update(
    id: string | number,
    payload: OssChamadoInput,
    empresaId: number | null = null
  ): Promise<IxcActionResponse> {
    const record = await this.findRecord(id, empresaId);
    if (!record) {
      throw new Error('Ordem de serviço não encontrada');
    }

    const updates: Prisma.ordens_servicoUpdateInput = {};

    if (payload.prioridade !== undefined) {
      updates.prioridade = String(payload.prioridade).trim() || record.prioridade;
    }
    if (payload.melhor_horario_agenda !== undefined) {
      updates.melhor_horario_agenda =
        String(payload.melhor_horario_agenda).trim() || record.melhor_horario_agenda;
    }
    if (payload.data_agenda !== undefined) {
      const dataAgenda = String(payload.data_agenda).trim();
      updates.data_agenda = dataAgenda || null;
    }
    if (payload.mensagem !== undefined) {
      const mensagem = String(payload.mensagem).trim();
      if (!mensagem) {
        throw new Error('Informe a mensagem ou descrição');
      }
      updates.mensagem = mensagem;
    }
    if (payload.status !== undefined) {
      updates.status = String(payload.status).trim() || record.status;
    }
    if (payload.id_filial !== undefined) {
      updates.id_filial = String(payload.id_filial).trim();
    }
    if (payload.id_estrutura !== undefined) {
      updates.id_estrutura = String(payload.id_estrutura).trim() || '0';
    }
    if (payload.id_assunto !== undefined) {
      updates.id_assunto = String(payload.id_assunto).trim();
    }
    if (payload.setor !== undefined) {
      updates.setor = String(payload.setor).trim();
    }
    if (payload.id_tecnico !== undefined) {
      updates.id_tecnico = String(payload.id_tecnico).trim();
    }
    if (payload.tipo !== undefined) {
      updates.tipo = String(payload.tipo).trim() || record.tipo;
    }

    await updateOrdem(record, updates);

    return { type: 'success', id: String(record.id) };
  }

  static async delete(id: string | number, empresaId: number | null = null): Promise<IxcActionResponse> {
    const record = await this.findRecord(id, empresaId);
    if (!record) {
      throw new Error('Ordem de serviço não encontrada');
    }

    if (isOrdemServicoFinalizada(record.status)) {
      throw new Error(MSG_OS_FINALIZADA);
    }

    await this.destroyRecord(record);
    return { type: 'success' };
  }

  static async destroyRecord(record: OrdemServicoLocal): Promise<void> {
    await prisma.ordens_servico_mensagens.deleteMany({ where: { ordem_servico_id: record.id } });
    await prisma.ordens_servico.delete({ where: { id: record.id } });
  }

  static async listMensagens(
    id: string | number,
    empresaId: number | null = null
  ): Promise<IxcOssMensagem[]> {
    const record = await this.findRecord(id, empresaId);
    if (!record) {
      throw new Error('Ordem de serviço não encontrada');
    }

    const mensagens = await prisma.ordens_servico_mensagens.findMany({
      where: { ordem_servico_id: record.id },
      orderBy: { id: 'asc' },
    });

    return mapMensagensComOperador(mensagens, record.id);
  }

  static async registrarMensagem(
    id: string | number,
    payload: OssChamadoInput,
    empresaId: number | null = null,
    usuarioId: number | null = null
  ): Promise<IxcActionResponse> {
    const record = await this.findRecord(id, empresaId);
    if (!record) {
      throw new Error('Ordem de serviço não encontrada');
    }

    const mensagem = String(payload.mensagem ?? '').trim();
    if (!mensagem) {
      throw new Error('Mensagem é obrigatória');
    }

    const registro = await prisma.ordens_servico_mensagens.create({
      data: {
      empresa_id: empresaId,
      ordem_servico_id: record.id,
      id_evento: IXC_EVENTO_OBSERVACAO,
      mensagem,
      data: nowIxcDateTime(),
      usuario_id: usuarioId,
      },
    });

    return { type: 'success', id: String(registro.id) };
  }

  static async finalizar(
    id: string | number,
    payload: OssChamadoInput,
    empresaId: number | null = null,
    usuarioId: number | null = null
  ): Promise<IxcActionResponse> {
    const record = await this.findRecord(id, empresaId);
    if (!record) {
      throw new Error('Ordem de serviço não encontrada');
    }

    const conclusao = String(payload.mensagem_resposta ?? payload.mensagem ?? '').trim();
    if (!conclusao) {
      throw new Error('Resposta é obrigatória');
    }

    await updateOrdem(record, { status: 'F' });

    await prisma.ordens_servico_mensagens.create({
      data: {
      empresa_id: empresaId,
      ordem_servico_id: record.id,
      id_evento: IXC_EVENTO_FINALIZAR,
      mensagem: conclusao,
      data: nowIxcDateTime(),
      usuario_id: usuarioId,
      },
    });

    return { type: 'success', id: String(record.id) };
  }

  private static async findPureLocalRecord(
    id: string | number,
    empresaId: number | null
  ): Promise<OrdemServicoLocal | null> {
    const numericId = parseNumericId(id);
    if (numericId == null) return null;

    return prisma.ordens_servico.findFirst({
      where: {
        id: numericId,
        ixc_id: null,
        ...empresaWhere(empresaId),
      },
    });
  }

  static async countMensagensExtras(
    id: string | number,
    empresaId: number | null = null
  ): Promise<number> {
    const record = await this.findRecord(id, empresaId);
    if (!record) return 0;

    return prisma.ordens_servico_mensagens.count({
      where: {
        ordem_servico_id: record.id,
        id_evento: { not: IXC_EVENTO_ABERTURA },
      },
    });
  }

  static async syncMensagensFromIxc(
    record: OrdemServicoLocal,
    ixcMensagens: IxcOssMensagem[],
    empresaId: number | null = null,
    usuarioId: number | null = null
  ): Promise<{ novas: number; inseridas: IxcOssMensagem[] }> {
    const inseridas: IxcOssMensagem[] = [];
    const empresaRef = empresaId ?? record.empresa_id;

    for (const ixcMsg of ixcMensagens) {
      const ixcMsgId = String(ixcMsg.id ?? '').trim();
      const idEvento = String(ixcMsg.id_evento ?? IXC_EVENTO_OBSERVACAO).trim() || IXC_EVENTO_OBSERVACAO;
      const mensagem = String(ixcMsg.mensagem ?? '').trim();
      const data = String(ixcMsg.data ?? nowIxcDateTime()).trim() || nowIxcDateTime();
      if (!mensagem) continue;

      if (ixcMsgId) {
        const byIxc = await prisma.ordens_servico_mensagens.findFirst({
          where: { ordem_servico_id: record.id, ixc_id: ixcMsgId },
        });
        if (byIxc) continue;
      }

      let resolvedUsuarioId = usuarioId;
      if (resolvedUsuarioId == null) {
        const { operador } = extractOperadorFromMensagem(mensagem);
        if (operador) {
          resolvedUsuarioId = await resolveUsuarioIdByNome(operador, empresaRef);
        }
      }

      await prisma.ordens_servico_mensagens.create({
        data: {
        empresa_id: empresaRef,
        ordem_servico_id: record.id,
        id_evento: idEvento,
        mensagem,
        data,
        usuario_id: resolvedUsuarioId,
        ixc_id: ixcMsgId || null,
        },
      });
      inseridas.push(ixcMsg);
    }

    return { novas: inseridas.length, inseridas };
  }
}
