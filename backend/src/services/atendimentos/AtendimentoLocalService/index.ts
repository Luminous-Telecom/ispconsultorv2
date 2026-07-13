import { Op, UniqueConstraintError, WhereOptions } from 'sequelize';
import { AtendimentoLocal } from '../../../models/atendimentos/AtendimentoLocal';
import { AtendimentoMensagem } from '../../../models/atendimentos/AtendimentoMensagem';
import { Cliente } from '../../../models/clientes/Cliente';
import { Usuario } from '../../../models/cadastros/Usuario';
import { nowIxcDateTime } from '../../externos/IxcOssChamadoService/ixcHttp';
import { parseClienteId } from '../../externos/IxcOssChamadoService/ossPayload';
import type {
  AtendimentoInput,
  IxcAtendimento,
  IxcAtendimentoMensagem,
  ListAtendimentosFilters,
  ListAtendimentosResponse,
} from '../../externos/IxcAtendimentoService/types';
import { OrdemServicoCadastroService } from '../../ordens/OrdemServicoCadastroService';
import { AtendimentoDepartamentoService } from '../AtendimentoDepartamentoService';
import { AtendimentoTecnicoService } from '../AtendimentoTecnicoService';
import { clienteNomeParaOrdemServico } from '../../ordens/clienteNomeOrdemServico';
import {
  formatLocalAtendimentoProtocolo,
  localAtendimentoProtocoloYearMonthPrefix,
  parseLocalAtendimentoProtocolo,
} from '../atendimentoProtocoloLocal';

const PROTOCOLO_CREATE_MAX_RETRIES = 5;

function resolveIxcIdRef(...values: (string | number | null | undefined)[]): string {
  for (const raw of values) {
    const value = String(raw ?? '').trim();
    if (value && value !== '0') return value;
  }
  return '';
}

function parseNumericId(id: string | number): number | null {
  const numericId = parseInt(String(id).trim(), 10);
  return Number.isFinite(numericId) && numericId > 0 ? numericId : null;
}

function empresaWhere(empresaId: number | null): WhereOptions<AtendimentoLocal> {
  if (empresaId == null) return {};
  return { empresa_id: empresaId };
}

function resolveCadastroNome(mapa: Map<string, string>, referencia: string): string {
  const ref = String(referencia ?? '').trim();
  if (!ref || ref === '0') return '';
  return mapa.get(ref) ?? '';
}

async function fetchUsuarioNomes(usuarioIds: number[]): Promise<Map<number, string>> {
  const unique = [...new Set(usuarioIds.filter((id) => id > 0))];
  if (unique.length === 0) return new Map();

  const usuarios = await Usuario.findAll({
    where: { id: { [Op.in]: unique } },
    attributes: ['id', 'nome'],
  });

  return new Map(
    usuarios.map((usuario) => [usuario.id, usuario.nome?.trim() || String(usuario.id)])
  );
}

function toIxcAtendimento(record: AtendimentoLocal, clienteNome: string): IxcAtendimento {
  const hasIxc = Boolean(record.ixc_id?.trim());

  return {
    id: hasIxc ? String(record.ixc_id) : String(record.id),
    id_local: String(record.id),
    ixc_id: hasIxc ? String(record.ixc_id) : '',
    origem: hasIxc ? 'ixc' : 'ispconsultor',
    cliente_id: String(record.cliente_id),
    cliente_nome: clienteNome,
    protocolo: record.protocolo,
    id_filial: record.id_filial,
    id_estrutura: record.id_estrutura,
    id_assunto: record.id_assunto,
    id_ticket_setor: record.id_ticket_setor,
    id_responsavel_technico: record.id_responsavel_technico,
    titulo: record.titulo,
    menssagem: record.menssagem,
    prioridade: record.prioridade,
    melhor_horario_reserve: record.melhor_horario_reserve,
    data_reservada: record.data_reservada ?? '',
    su_status: record.su_status,
    tipo: record.tipo,
    data_criacao: record.data_criacao,
    ultima_atualizacao: record.ultima_atualizacao,
  };
}

async function nextProtocolo(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const prefix = localAtendimentoProtocoloYearMonthPrefix(now);

  const ultimo = await AtendimentoLocal.findOne({
    where: { protocolo: { [Op.like]: `${prefix}%` } },
    attributes: ['protocolo'],
    order: [['protocolo', 'DESC']],
  });

  let sequence = 1;
  if (ultimo?.protocolo) {
    const parsed = parseLocalAtendimentoProtocolo(ultimo.protocolo);
    if (parsed?.year === year && parsed.month === month) {
      sequence = parsed.sequence + 1;
    }
  }

  return formatLocalAtendimentoProtocolo(year, month, sequence);
}

function sortRegistros(
  registros: IxcAtendimento[],
  sortColumn: string,
  sortDirection: 'asc' | 'desc'
): IxcAtendimento[] {
  const dir = sortDirection === 'asc' ? 1 : -1;
  return [...registros].sort((a, b) => {
    const av = a[sortColumn] ?? '';
    const bv = b[sortColumn] ?? '';
    const an = Number(av);
    const bn = Number(bv);
    if (!Number.isNaN(an) && !Number.isNaN(bn) && av !== '' && bv !== '') {
      return (an - bn) * dir;
    }
    return String(av).localeCompare(String(bv), 'pt-BR', { numeric: true }) * dir;
  });
}

function applyListFilters(
  data: IxcAtendimento[],
  filters: ListAtendimentosFilters
): IxcAtendimento[] {
  const search = filters.search?.trim();
  const sortColumn = filters.sortColumn?.trim() || 'id';
  const sortDirection = filters.sortDirection === 'asc' ? 'asc' : 'desc';
  const searchField = filters.searchField?.trim() || 'titulo';
  const statusFiltro = String(filters.status ?? 'all').trim();
  const departamentoFiltro = String(filters.id_ticket_setor ?? '').trim();

  let result = data;

  if (statusFiltro && statusFiltro !== 'all') {
    result = result.filter((item) => {
      const status = String(item.su_status ?? item.status ?? '').trim();
      if (statusFiltro === 'T') {
        return status !== 'S' && status !== 'C';
      }
      return status === statusFiltro;
    });
  }

  if (departamentoFiltro && departamentoFiltro !== '0') {
    result = result.filter(
      (item) => String(item.id_ticket_setor ?? '').trim() === departamentoFiltro
    );
  }

  if (search) {
    const termo = search.toLowerCase();
    result = result.filter((item) =>
      [
        searchField,
        'id',
        'id_local',
        'ixc_id',
        'protocolo',
        'titulo',
        'menssagem',
        'cliente_nome',
        'estrutura_nome',
        'departamento_nome',
        'assunto_nome',
      ].some((campo) => String(item[campo] ?? '').toLowerCase().includes(termo))
    );
  }

  return sortRegistros(result, sortColumn, sortDirection);
}

async function mapLocalRegistros(
  registros: AtendimentoLocal[],
  empresaId: number | null
): Promise<IxcAtendimento[]> {
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

  const filialRefs = registros.map((r) => r.id_filial);
  const estruturaRefs = registros.map((r) => r.id_estrutura);
  const assuntoRefs = registros.map((r) => r.id_assunto);
  const setorRefs = registros.map((r) => r.id_ticket_setor);
  const tecnicoRefs = registros.map((r) => r.id_responsavel_technico);

  const [filiais, estruturas, assuntos, departamentos, tecnicosAtendimento, tecnicosOs] =
    await Promise.all([
    OrdemServicoCadastroService.lookupNomesPorReferencias('filial', filialRefs, empresaId),
    OrdemServicoCadastroService.lookupNomesPorReferencias('estrutura', estruturaRefs, empresaId),
    OrdemServicoCadastroService.lookupNomesPorReferencias('assunto', assuntoRefs, empresaId),
    AtendimentoDepartamentoService.lookupNomesPorReferencias(setorRefs, empresaId),
    AtendimentoTecnicoService.lookupNomesPorReferencias(tecnicoRefs, empresaId),
    OrdemServicoCadastroService.lookupNomesPorReferencias('tecnico', tecnicoRefs, empresaId),
  ]);

  return registros.map((record) => {
    const base = toIxcAtendimento(record, clienteNomes.get(record.cliente_id) ?? String(record.cliente_id));
    const responsavelNome =
      resolveCadastroNome(tecnicosAtendimento, record.id_responsavel_technico) ||
      resolveCadastroNome(tecnicosOs, record.id_responsavel_technico);
    return {
      ...base,
      filial_nome: resolveCadastroNome(filiais, record.id_filial),
      estrutura_nome: resolveCadastroNome(estruturas, record.id_estrutura),
      assunto_nome: resolveCadastroNome(assuntos, record.id_assunto),
      departamento_nome: resolveCadastroNome(departamentos, record.id_ticket_setor),
      responsavel_nome: responsavelNome,
    };
  });
}

export class AtendimentoLocalService {
  static async list(
    filters: ListAtendimentosFilters = {},
    empresaId: number | null = null
  ): Promise<ListAtendimentosResponse> {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 15;

    const where: WhereOptions<AtendimentoLocal> = { ...empresaWhere(empresaId) };
    if (filters.cliente_id) {
      (where as Record<string, unknown>).cliente_id = filters.cliente_id;
    }

    const registros = await AtendimentoLocal.findAll({
      where,
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

  static async findByIxcId(
    ixcId: string | number,
    empresaId: number | null = null
  ): Promise<AtendimentoLocal | null> {
    const normalized = String(ixcId).trim();
    if (!normalized) return null;

    return AtendimentoLocal.findOne({
      where: {
        ixc_id: normalized,
        ...empresaWhere(empresaId),
      },
    });
  }

  static async findRecord(
    id: string | number,
    empresaId: number | null = null
  ): Promise<AtendimentoLocal | null> {
    const byIxc = await this.findByIxcId(id, empresaId);
    if (byIxc) return byIxc;

    const numericId = parseNumericId(id);
    if (numericId != null) {
      return AtendimentoLocal.findOne({
        where: {
          id: numericId,
          ...empresaWhere(empresaId),
        },
      });
    }

    return null;
  }

  static async getAtendimento(
    id: string | number,
    empresaId: number | null = null
  ): Promise<IxcAtendimento | null> {
    const record = await this.findRecord(id, empresaId);
    if (!record) return null;

    const [atendimento] = await mapLocalRegistros([record], empresaId ?? record.empresa_id);
    return atendimento ?? null;
  }

  static async isAtendimentoLocal(
    id: string | number,
    empresaId: number | null = null
  ): Promise<boolean> {
    const record = await this.findRecord(id, empresaId);
    return record != null && !record.ixc_id?.trim();
  }

  static async createRecord(
    payload: AtendimentoInput,
    empresaId: number | null = null,
    usuarioId: number | null = null
  ): Promise<AtendimentoLocal> {
    const clienteId = parseClienteId(payload.cliente_id);
    if (!clienteId) {
      throw new Error('Selecione o cliente');
    }

    const menssagem = String(payload.menssagem ?? '').trim();
    if (!menssagem) {
      throw new Error('Informe a descrição');
    }

    const idEstrutura = String(payload.id_estrutura ?? '0').trim() || '0';

    const agora = nowIxcDateTime();

    for (let attempt = 0; attempt < PROTOCOLO_CREATE_MAX_RETRIES; attempt++) {
      const protocolo = await nextProtocolo();

      try {
        const record = await AtendimentoLocal.create({
          empresa_id: empresaId,
          cliente_id: clienteId,
          ixc_id: null,
          protocolo,
          id_filial: String(payload.id_filial ?? '').trim(),
          id_estrutura: idEstrutura,
          id_assunto: String(payload.id_assunto ?? '').trim(),
          id_ticket_setor: String(payload.id_ticket_setor ?? '').trim(),
          id_responsavel_technico: String(payload.id_responsavel_technico ?? '').trim(),
          titulo: String(payload.titulo ?? '').trim(),
          menssagem,
          prioridade: String(payload.prioridade ?? 'N').trim() || 'N',
          melhor_horario_reserve: String(payload.melhor_horario_reserve ?? 'Q').trim() || 'Q',
          data_reservada: String(payload.data_reservada ?? '').trim() || null,
          su_status: String(payload.su_status ?? 'N').trim() || 'N',
          tipo: String(payload.tipo ?? 'E').trim() || 'E',
          data_criacao: agora,
          ultima_atualizacao: agora,
        });

        await AtendimentoMensagem.create({
          empresa_id: empresaId,
          atendimento_id: record.id,
          mensagem: menssagem,
          data: agora,
          usuario_id: usuarioId,
          visibilidade_mensagens: 'E',
        });

        return record;
      } catch (error) {
        if (error instanceof UniqueConstraintError && attempt < PROTOCOLO_CREATE_MAX_RETRIES - 1) {
          continue;
        }
        throw error;
      }
    }

    throw new Error('Não foi possível gerar um protocolo único para o atendimento');
  }

  static async linkToIxc(
    record: AtendimentoLocal,
    ixcId: string | number,
    meta: { protocolo?: string; su_status?: string } = {}
  ): Promise<AtendimentoLocal> {
    const normalized = String(ixcId).trim();
    if (!normalized) {
      throw new Error('IXC não retornou o ID do atendimento criado');
    }

    const protocolo = String(meta.protocolo ?? record.protocolo).trim() || record.protocolo;
    const suStatus = String(meta.su_status ?? record.su_status).trim() || record.su_status;

    await record.update({
      ixc_id: normalized,
      protocolo,
      su_status: suStatus,
      ultima_atualizacao: nowIxcDateTime(),
    });

    return record;
  }

  static async syncFromIxcTicket(
    ixcId: string | number,
    ticket: Record<string, string>,
    empresaId: number | null = null,
    payload: AtendimentoInput = {}
  ): Promise<void> {
    const record = await this.findByIxcId(ixcId, empresaId);
    if (!record) return;

    await record.update({
      prioridade: String(ticket.prioridade ?? record.prioridade).trim() || record.prioridade,
      melhor_horario_reserve:
        String(ticket.melhor_horario_reserve ?? record.melhor_horario_reserve).trim() ||
        record.melhor_horario_reserve,
      data_reservada: String(ticket.data_reservada ?? record.data_reservada ?? '').trim() || null,
      menssagem: String(ticket.menssagem ?? record.menssagem).trim() || record.menssagem,
      su_status: String(ticket.su_status ?? record.su_status).trim() || record.su_status,
      titulo: String(ticket.titulo ?? record.titulo).trim(),
      id_filial: String(ticket.id_filial ?? record.id_filial).trim(),
      id_estrutura: String(ticket.id_estrutura ?? record.id_estrutura).trim() || '0',
      id_assunto: String(ticket.id_assunto ?? record.id_assunto).trim(),
      id_ticket_setor: resolveIxcIdRef(
        payload.id_ticket_setor,
        ticket.id_ticket_setor,
        record.id_ticket_setor
      ),
      id_responsavel_technico: resolveIxcIdRef(
        payload.id_responsavel_technico,
        ticket.id_responsavel_technico,
        record.id_responsavel_technico
      ),
      ultima_atualizacao: String(ticket.ultima_atualizacao ?? nowIxcDateTime()).trim(),
    });
  }

  static async update(
    id: string | number,
    payload: AtendimentoInput,
    empresaId: number | null = null
  ): Promise<{ type: 'success'; id: string }> {
    const record = await this.findRecord(id, empresaId);
    if (!record) {
      throw new Error('Atendimento não encontrado');
    }

    const updates: Partial<AtendimentoLocal> = {
      ultima_atualizacao: nowIxcDateTime(),
    };

    if (payload.prioridade !== undefined) {
      updates.prioridade = String(payload.prioridade).trim() || record.prioridade;
    }
    if (payload.melhor_horario_reserve !== undefined) {
      updates.melhor_horario_reserve =
        String(payload.melhor_horario_reserve).trim() || record.melhor_horario_reserve;
    }
    if (payload.data_reservada !== undefined) {
      const dataReservada = String(payload.data_reservada).trim();
      updates.data_reservada = dataReservada || null;
    }
    if (payload.menssagem !== undefined) {
      const menssagem = String(payload.menssagem).trim();
      if (!menssagem) throw new Error('Informe a descrição');
      updates.menssagem = menssagem;
    }
    if (payload.titulo !== undefined) {
      updates.titulo = String(payload.titulo).trim();
    }
    if (payload.id_filial !== undefined) {
      updates.id_filial = String(payload.id_filial).trim();
    }
    if (payload.id_estrutura !== undefined) {
      const idEstrutura = String(payload.id_estrutura).trim() || '0';
      const exigeEstrutura = Boolean(record.ixc_id?.trim());
      if (exigeEstrutura && idEstrutura === '0') throw new Error('Selecione a estrutura');
      updates.id_estrutura = idEstrutura;
    }
    if (payload.id_assunto !== undefined) {
      updates.id_assunto = String(payload.id_assunto).trim();
    }
    if (payload.id_ticket_setor !== undefined) {
      updates.id_ticket_setor = String(payload.id_ticket_setor).trim();
    }
    if (payload.id_responsavel_technico !== undefined) {
      updates.id_responsavel_technico = String(payload.id_responsavel_technico).trim();
    }
    if (payload.su_status !== undefined) {
      updates.su_status = String(payload.su_status).trim() || record.su_status;
    }

    await record.update(updates);
    return { type: 'success', id: String(record.id) };
  }

  static async destroyRecord(record: AtendimentoLocal): Promise<void> {
    await AtendimentoMensagem.destroy({ where: { atendimento_id: record.id } });
    await record.destroy();
  }

  static async delete(id: string | number, empresaId: number | null = null): Promise<void> {
    const record = await this.findRecord(id, empresaId);
    if (!record) {
      throw new Error('Atendimento não encontrado');
    }
    await this.destroyRecord(record);
  }

  static async listMensagensLocais(
    id: string | number,
    empresaId: number | null = null
  ): Promise<IxcAtendimentoMensagem[]> {
    const record = await this.findRecord(id, empresaId);
    if (!record) {
      throw new Error('Atendimento não encontrado');
    }

    const mensagens = await AtendimentoMensagem.findAll({
      where: { atendimento_id: record.id },
      order: [['id', 'ASC']],
    });

    const usuarioIds = [
      ...new Set(
        mensagens
          .map((item) => item.usuario_id)
          .filter((id): id is number => id != null && id > 0)
      ),
    ];
    const usuarioNomes = await fetchUsuarioNomes(usuarioIds);

    return mensagens.map((item) => ({
      id: String(item.id),
      id_ticket: String(record.ixc_id ?? record.id),
      mensagem: item.mensagem,
      data: item.data,
      operador:
        item.usuario_id != null ? usuarioNomes.get(item.usuario_id) ?? '' : '',
      visibilidade_mensagens: item.visibilidade_mensagens,
    }));
  }

  static resolveIxcTicketId(record: AtendimentoLocal | null, id: string | number): string {
    const ixcId = record?.ixc_id?.trim();
    if (ixcId) return ixcId;
    return String(id).trim();
  }
}
