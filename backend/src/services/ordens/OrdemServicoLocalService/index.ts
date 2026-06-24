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
import {
  formatLocalProtocolo,
  localProtocoloYearMonthPrefix,
  parseLocalProtocolo,
} from '../ordemServicoProtocolo';

function parseNumericId(id: string | number): number | null {
  const raw = String(id).trim();
  const normalized = /^L\d+$/.test(raw) ? raw.slice(1) : raw;
  const numericId = parseInt(normalized, 10);
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
  return cliente.nome_fantasia?.trim() || cliente.razao_social?.trim() || String(clienteId);
}

function toIxcOssChamado(record: OrdemServicoLocal, clienteNome: string): IxcOssChamado {
  return {
    id: String(record.id),
    origem: 'backnet',
    cliente_id: String(record.cliente_id),
    cliente_nome: clienteNome,
    prioridade: record.prioridade,
    melhor_horario_agenda: record.melhor_horario_agenda,
    data_agenda: record.data_agenda ?? '',
    mensagem: record.mensagem,
    status: record.status,
    protocolo: record.protocolo,
    data_abertura: record.data_abertura,
    id_filial: '',
    id_estrutura: '0',
    id_assunto: '',
    setor: '',
    id_tecnico: '',
    tipo: 'E',
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

export class OrdemServicoLocalService {
  static async list(
    filters: ListOssChamadosFilters = {},
    empresaId: number | null = null
  ): Promise<ListOssChamadosResponse> {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 15;
    const search = filters.search?.trim();
    const sortColumn = filters.sortColumn?.trim() || 'id';
    const sortDirection = filters.sortDirection === 'asc' ? 'asc' : 'desc';
    const searchField = filters.searchField?.trim() || 'cliente_nome';

    const registros = await OrdemServicoLocal.findAll({
      where: empresaWhere(empresaId),
      order: [['id', 'DESC']],
    });

    const clienteIds = [...new Set(registros.map((r) => r.cliente_id))];
    const clientes = clienteIds.length
      ? await Cliente.findAll({
          where: { id: { [Op.in]: clienteIds } },
          attributes: ['id', 'razao_social', 'nome_fantasia'],
        })
      : [];
    const clienteNomes = new Map(
      clientes.map((c) => [c.id, c.nome_fantasia?.trim() || c.razao_social?.trim() || String(c.id)])
    );

    let data = registros.map((record) =>
      toIxcOssChamado(record, clienteNomes.get(record.cliente_id) ?? String(record.cliente_id))
    );

    if (search) {
      const termo = search.toLowerCase();
      data = data.filter((item) =>
        [searchField, 'mensagem', 'protocolo', 'cliente_nome'].some((campo) =>
          String(item[campo] ?? '').toLowerCase().includes(termo)
        )
      );
    }

    data = sortRegistros(data, sortColumn, sortDirection);

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

  static async getById(
    id: string | number,
    empresaId: number | null = null
  ): Promise<IxcOssChamado | null> {
    const record = await this.findRecord(id, empresaId);
    if (!record) return null;
    const clienteNome = await fetchClienteNome(record.cliente_id);
    return toIxcOssChamado(record, clienteNome);
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
      prioridade: String(payload.prioridade ?? 'N').trim() || 'N',
      melhor_horario_agenda: String(payload.melhor_horario_agenda ?? 'Q').trim() || 'Q',
      data_agenda: String(payload.data_agenda ?? '').trim() || null,
      mensagem,
      status: 'A',
      protocolo: await nextProtocolo(empresaId),
      data_abertura: dataAbertura,
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

    await record.update(updates);

    return { type: 'success', id: String(record.id) };
  }

  static async delete(id: string | number, empresaId: number | null = null): Promise<IxcActionResponse> {
    const record = await this.findRecord(id, empresaId);
    if (!record) {
      throw new Error('Ordem de serviço não encontrada');
    }

    await record.destroy();
    return { type: 'success' };
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

    if (mensagem.id_evento === IXC_EVENTO_ABERTURA) {
      throw new Error('Não é possível excluir a mensagem de abertura');
    }

    await mensagem.destroy();
    return { type: 'success' };
  }

  static async exists(id: string | number, empresaId: number | null = null): Promise<boolean> {
    return (await this.findRecord(id, empresaId)) != null;
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

  static async assertAccessible(id: string | number, empresaId: number | null = null): Promise<void> {
    const record = await this.findRecord(id, empresaId);
    if (!record) {
      throw new Error('Ordem de serviço não encontrada');
    }
  }

  private static async findRecord(
    id: string | number,
    empresaId: number | null
  ): Promise<OrdemServicoLocal | null> {
    const numericId = parseNumericId(id);
    if (numericId == null) return null;

    return OrdemServicoLocal.findOne({
      where: {
        id: numericId,
        ...empresaWhere(empresaId),
      },
    });
  }
}
