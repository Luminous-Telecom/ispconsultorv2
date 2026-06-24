import { Op, WhereOptions } from 'sequelize';
import { OrdemServicoLocal } from '../../../models/ordens/OrdemServicoLocal';
import { OrdemServicoMensagem } from '../../../models/ordens/OrdemServicoMensagem';
import { Cliente } from '../../../models/clientes/Cliente';
import { Usuario } from '../../../models/cadastros/Usuario';
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

function parseNumericId(id: string | number): number | null {
  const numericId = parseInt(String(id).trim(), 10);
  return Number.isFinite(numericId) && numericId > 0 ? numericId : null;
}

function empresaWhere(empresaId: number | null): WhereOptions<OrdemServicoLocal> {
  if (empresaId == null) return {};
  return { empresa_id: empresaId };
}

async function fetchClienteNome(clienteId: number): Promise<string> {
  const cliente = await Cliente.findByPk(clienteId, {
    attributes: ['razao_social', 'nome_fantasia'],
  });
  if (!cliente) return '';
  return clienteNomeParaOrdemServico(cliente, clienteId);
}

function toIxcOssChamado(record: OrdemServicoLocal, clienteNome: string): IxcOssChamado {
  const isIxc = Boolean(record.ixc_id?.trim());

  return {
    id: isIxc ? String(record.ixc_id) : String(record.id),
    id_local: String(record.id),
    ixc_id: isIxc ? String(record.ixc_id) : '',
    origem: isIxc ? 'ixc' : 'backnet',
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

async function nextProtocolo(empresaId: number | null): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const prefix = localProtocoloYearMonthPrefix(now);

  const registros = await OrdemServicoLocal.findAll({
    where: {
      ...empresaWhere(empresaId),
      protocolo: { [Op.like]: `${prefix}%` },
    },
    attributes: ['protocolo'],
  });

  let maxSequence = 0;
  for (const registro of registros) {
    const parsed = parseLocalProtocolo(registro.protocolo ?? '');
    if (parsed?.year === year && parsed.month === month) {
      maxSequence = Math.max(maxSequence, parsed.sequence);
    }
  }

  return formatLocalProtocolo(year, month, maxSequence + 1);
}

function toIxcOssMensagem(
  record: OrdemServicoMensagem,
  ordemId: number,
  usuarioNomes: Map<number, string>
): IxcOssMensagem {
  const operadorNome =
    record.usuario_id != null ? usuarioNomes.get(record.usuario_id) ?? '' : '';

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

  const usuarios = await Usuario.findAll({
    where: { id: { [Op.in]: usuarioIds } },
    attributes: ['id', 'nome'],
  });

  return new Map(usuarios.map((usuario) => [usuario.id, usuario.nome?.trim() || String(usuario.id)]));
}

export async function fetchUsuarioNomeById(usuarioId: number | null): Promise<string> {
  if (!usuarioId) return '';
  const mapa = await fetchUsuarioNomes([usuarioId]);
  return mapa.get(usuarioId) ?? '';
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

  const aberturas = await OrdemServicoMensagem.findAll({
    where: {
      ordem_servico_id: { [Op.in]: ordemIds },
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
    ? await Cliente.findAll({
        where: { id: { [Op.in]: clienteIds } },
        attributes: ['id', 'razao_social', 'nome_fantasia'],
      })
    : [];
  const clienteNomes = new Map(
    clientes.map((c) => [c.id, clienteNomeParaOrdemServico(c, c.id)])
  );

  const operadorPorOrdem = await fetchOperadorAberturaPorOrdemIds(registros.map((r) => r.id));

  return enrichChamadosComCadastrosLocais(
    registros.map((record) => {
      const chamado = toIxcOssChamado(
        record,
        clienteNomes.get(record.cliente_id) ?? String(record.cliente_id)
      );
      const operadorNome = operadorPorOrdem.get(record.id);
      return operadorNome ? { ...chamado, operador_nome: operadorNome } : chamado;
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

    const registros = await OrdemServicoLocal.findAll({
      where: empresaWhere(empresaId),
      order: [['id', 'DESC']],
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

  static async listIxcVinculadas(
    filters: ListOssChamadosFilters = {},
    empresaId: number | null = null,
    usuarioId: number | null = null
  ): Promise<IxcOssChamado[]> {
    if (!usuarioId) return [];

    const aberturas = await OrdemServicoMensagem.findAll({
      where: {
        id_evento: IXC_EVENTO_ABERTURA,
        usuario_id: usuarioId,
        ...(empresaId != null ? { empresa_id: empresaId } : {}),
      },
      attributes: ['ordem_servico_id'],
    });

    const ordemIds = [...new Set(aberturas.map((item) => item.ordem_servico_id))];
    if (ordemIds.length === 0) return [];

    const registros = await OrdemServicoLocal.findAll({
      where: {
        id: { [Op.in]: ordemIds },
        ixc_id: { [Op.ne]: null },
        ...empresaWhere(empresaId),
      },
      order: [['id', 'DESC']],
    });

    return applyListFilters(await mapLocalRegistros(registros, empresaId), filters);
  }

  static async createIxcMirror(
    ixcOs: IxcOssChamado,
    payload: OssChamadoInput,
    empresaId: number | null,
    usuarioId: number | null,
    clienteId: number
  ): Promise<OrdemServicoLocal> {
    const ixcId = String(ixcOs.id ?? '').trim();
    if (!ixcId) {
      throw new Error('IXC não retornou o ID da ordem de serviço criada');
    }

    const mensagem = String(ixcOs.mensagem ?? payload.mensagem ?? '').trim();
    const dataAbertura = String(ixcOs.data_abertura ?? nowIxcDateTime()).trim() || nowIxcDateTime();

    const record = await OrdemServicoLocal.create({
      empresa_id: empresaId,
      cliente_id: clienteId,
      ixc_id: ixcId,
      prioridade: String(ixcOs.prioridade ?? payload.prioridade ?? 'N').trim() || 'N',
      melhor_horario_agenda:
        String(ixcOs.melhor_horario_agenda ?? payload.melhor_horario_agenda ?? 'Q').trim() || 'Q',
      data_agenda: String(ixcOs.data_agenda ?? payload.data_agenda ?? '').trim() || null,
      mensagem,
      status: String(ixcOs.status ?? 'A').trim() || 'A',
      protocolo: String(ixcOs.protocolo ?? '').trim() || ixcId,
      data_abertura: dataAbertura,
      id_filial: String(ixcOs.id_filial ?? payload.id_filial ?? '').trim(),
      id_estrutura: String(ixcOs.id_estrutura ?? payload.id_estrutura ?? '0').trim() || '0',
      id_assunto: String(ixcOs.id_assunto ?? payload.id_assunto ?? '').trim(),
      setor: String(ixcOs.setor ?? payload.setor ?? '').trim(),
      id_tecnico: String(ixcOs.id_tecnico ?? payload.id_tecnico ?? '').trim(),
      tipo: String(ixcOs.tipo ?? payload.tipo ?? 'E').trim() || 'E',
    });

    await OrdemServicoMensagem.create({
      empresa_id: empresaId,
      ordem_servico_id: record.id,
      id_evento: IXC_EVENTO_ABERTURA,
      mensagem,
      data: dataAbertura,
      usuario_id: usuarioId,
    });

    return record;
  }

  static async syncFromIxcOs(
    ixcId: string | number,
    ixcOs: IxcOssChamado,
    payload: OssChamadoInput = {},
    empresaId: number | null = null
  ): Promise<void> {
    const record = await this.findByIxcId(ixcId, empresaId);
    if (!record) return;

    const updates: Partial<OrdemServicoLocal> = {
      prioridade: String(ixcOs.prioridade ?? record.prioridade).trim() || record.prioridade,
      melhor_horario_agenda:
        String(ixcOs.melhor_horario_agenda ?? record.melhor_horario_agenda).trim() ||
        record.melhor_horario_agenda,
      data_agenda: String(ixcOs.data_agenda ?? record.data_agenda ?? '').trim() || null,
      mensagem: String(ixcOs.mensagem ?? record.mensagem).trim() || record.mensagem,
      status: String(ixcOs.status ?? record.status).trim() || record.status,
      protocolo: String(ixcOs.protocolo ?? record.protocolo).trim() || record.protocolo,
      data_abertura: String(ixcOs.data_abertura ?? record.data_abertura).trim() || record.data_abertura,
      id_filial: String(ixcOs.id_filial ?? payload.id_filial ?? record.id_filial).trim(),
      id_estrutura: String(ixcOs.id_estrutura ?? payload.id_estrutura ?? record.id_estrutura).trim() || '0',
      id_assunto: String(ixcOs.id_assunto ?? payload.id_assunto ?? record.id_assunto).trim(),
      setor: String(ixcOs.setor ?? payload.setor ?? record.setor).trim(),
      id_tecnico: String(ixcOs.id_tecnico ?? payload.id_tecnico ?? record.id_tecnico).trim(),
      tipo: String(ixcOs.tipo ?? payload.tipo ?? record.tipo).trim() || record.tipo,
    };

    await record.update(updates);
  }

  static async findByIxcId(
    ixcId: string | number,
    empresaId: number | null = null
  ): Promise<OrdemServicoLocal | null> {
    const normalized = String(ixcId).trim();
    if (!normalized) return null;

    return OrdemServicoLocal.findOne({
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
      const byLocalId = await OrdemServicoLocal.findOne({
        where: {
          id: numericId,
          ixc_id: { [Op.ne]: null },
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

  static async isPureBacknet(id: string | number, empresaId: number | null = null): Promise<boolean> {
    const record = await this.findRecord(id, empresaId);
    return record != null && !record.ixc_id?.trim();
  }

  static async wasOpenedByUsuario(
    id: string | number,
    usuarioId: number,
    empresaId: number | null = null
  ): Promise<boolean> {
    const record = await this.findRecord(id, empresaId);
    if (!record?.ixc_id?.trim()) return false;

    const abertura = await OrdemServicoMensagem.findOne({
      where: {
        ordem_servico_id: record.id,
        id_evento: IXC_EVENTO_ABERTURA,
      },
    });

    return abertura?.usuario_id === usuarioId;
  }

  static async getOperadorAbertura(
    id: string | number,
    empresaId: number | null = null
  ): Promise<string> {
    const record = await this.findRecord(id, empresaId);
    if (!record) return '';

    const operadorPorOrdem = await fetchOperadorAberturaPorOrdemIds([record.id]);
    return operadorPorOrdem.get(record.id) ?? '';
  }

  static async exists(id: string | number, empresaId: number | null = null): Promise<boolean> {
    return (await this.findRecord(id, empresaId)) != null;
  }

  static async create(
    payload: OssChamadoInput,
    empresaId: number | null = null,
    usuarioId: number | null = null
  ): Promise<IxcActionResponse> {
    const clienteId = parseClienteId(payload.cliente_id);
    if (!clienteId) {
      throw new Error('Selecione o cliente');
    }

    const mensagem = String(payload.mensagem ?? '').trim();
    if (!mensagem) {
      throw new Error('Informe a mensagem ou descrição');
    }

    const dataAbertura = nowIxcDateTime();
    const record = await OrdemServicoLocal.create({
      empresa_id: empresaId,
      cliente_id: clienteId,
      ixc_id: null,
      prioridade: String(payload.prioridade ?? 'N').trim() || 'N',
      melhor_horario_agenda: String(payload.melhor_horario_agenda ?? 'Q').trim() || 'Q',
      data_agenda: String(payload.data_agenda ?? '').trim() || null,
      mensagem,
      status: 'A',
      protocolo: await nextProtocolo(empresaId),
      data_abertura: dataAbertura,
      id_filial: '',
      id_estrutura: '0',
      id_assunto: '',
      setor: '',
      id_tecnico: '',
      tipo: 'E',
    });

    await OrdemServicoMensagem.create({
      empresa_id: empresaId,
      ordem_servico_id: record.id,
      id_evento: IXC_EVENTO_ABERTURA,
      mensagem,
      data: dataAbertura,
      usuario_id: usuarioId,
    });

    return {
      type: 'success',
      id: String(record.id),
      protocolo: record.protocolo,
      data_abertura: record.data_abertura,
    };
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

    const updates: Partial<OrdemServicoLocal> = {};

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

    await record.update(updates);

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
    await OrdemServicoMensagem.destroy({ where: { ordem_servico_id: record.id } });
    await record.destroy();
  }

  static async listMensagens(
    id: string | number,
    empresaId: number | null = null
  ): Promise<IxcOssMensagem[]> {
    const record = await this.findRecord(id, empresaId);
    if (!record) {
      throw new Error('Ordem de serviço não encontrada');
    }

    let mensagens = await OrdemServicoMensagem.findAll({
      where: { ordem_servico_id: record.id },
      order: [['id', 'ASC']],
    });

    if (mensagens.length === 0) {
      const abertura = await OrdemServicoMensagem.create({
        empresa_id: empresaId,
        ordem_servico_id: record.id,
        id_evento: IXC_EVENTO_ABERTURA,
        mensagem: record.mensagem,
        data: record.data_abertura,
      });
      mensagens = [abertura];
    }

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

    const registro = await OrdemServicoMensagem.create({
      empresa_id: empresaId,
      ordem_servico_id: record.id,
      id_evento: IXC_EVENTO_OBSERVACAO,
      mensagem,
      data: nowIxcDateTime(),
      usuario_id: usuarioId,
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

    await record.update({ status: 'F' });

    await OrdemServicoMensagem.create({
      empresa_id: empresaId,
      ordem_servico_id: record.id,
      id_evento: IXC_EVENTO_FINALIZAR,
      mensagem: conclusao,
      data: nowIxcDateTime(),
      usuario_id: usuarioId,
    });

    return { type: 'success', id: String(record.id) };
  }

  static async deleteMensagem(
    id: string | number,
    mensagemId: string | number,
    empresaId: number | null = null
  ): Promise<IxcActionResponse> {
    const record = await this.findRecord(id, empresaId);
    if (!record) {
      throw new Error('Ordem de serviço não encontrada');
    }

    const mensagem = await OrdemServicoMensagem.findOne({
      where: {
        id: Number(mensagemId),
        ordem_servico_id: record.id,
      },
    });

    if (!mensagem) {
      throw new Error('Mensagem não encontrada');
    }

    await mensagem.destroy();
    return { type: 'success' };
  }

  static async assertAccessible(id: string | number, empresaId: number | null = null): Promise<void> {
    if (!(await this.findRecord(id, empresaId))) {
      throw new Error('Ordem de serviço não encontrada');
    }
  }

  private static async findPureLocalRecord(
    id: string | number,
    empresaId: number | null
  ): Promise<OrdemServicoLocal | null> {
    const numericId = parseNumericId(id);
    if (numericId == null) return null;

    return OrdemServicoLocal.findOne({
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

    return OrdemServicoMensagem.count({
      where: {
        ordem_servico_id: record.id,
        id_evento: { [Op.ne]: IXC_EVENTO_ABERTURA },
      },
    });
  }

  static async syncMensagensFromIxc(
    record: OrdemServicoLocal,
    ixcMensagens: IxcOssMensagem[],
    empresaId: number | null = null
  ): Promise<{ novas: number; inseridas: IxcOssMensagem[] }> {
    const inseridas: IxcOssMensagem[] = [];

    for (const ixcMsg of ixcMensagens) {
      const ixcMsgId = String(ixcMsg.id ?? '').trim();
      const idEvento = String(ixcMsg.id_evento ?? IXC_EVENTO_OBSERVACAO).trim() || IXC_EVENTO_OBSERVACAO;
      const mensagem = String(ixcMsg.mensagem ?? '').trim();
      const data = String(ixcMsg.data ?? nowIxcDateTime()).trim() || nowIxcDateTime();
      if (!mensagem) continue;

      if (ixcMsgId) {
        const byIxc = await OrdemServicoMensagem.findOne({
          where: { ordem_servico_id: record.id, ixc_id: ixcMsgId },
        });
        if (byIxc) continue;
      }

      const dup = await OrdemServicoMensagem.findOne({
        where: {
          ordem_servico_id: record.id,
          id_evento: idEvento,
          data,
          mensagem,
        },
      });
      if (dup) continue;

      await OrdemServicoMensagem.create({
        empresa_id: empresaId ?? record.empresa_id,
        ordem_servico_id: record.id,
        id_evento: idEvento,
        mensagem,
        data,
        usuario_id: null,
        ixc_id: ixcMsgId || null,
      });
      inseridas.push(ixcMsg);
    }

    return { novas: inseridas.length, inseridas };
  }
}
