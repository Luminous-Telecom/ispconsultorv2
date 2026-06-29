import { Op, WhereOptions } from 'sequelize';
import {
  IXC_ASSUNTO_RESOURCE,
  IXC_ESTRUTURA_RESOURCE,
  IXC_FILIAL_RESOURCE,
  IXC_FUNCIONARIOS_RESOURCE,
  IXC_SETOR_RESOURCE,
} from '../../externos/IxcOssChamadoService/constants';
import type { LookupItem } from '../../externos/IxcOssChamadoService/types';
import {
  OrdemServicoAssunto,
  OrdemServicoCadastroModel,
  OrdemServicoEstrutura,
  OrdemServicoFilial,
  OrdemServicoSetor,
  OrdemServicoTecnico,
} from '../../../models/ordens/ordemServicoCadastros';

export type OrdemServicoCadastroTipo =
  | 'filial'
  | 'setor'
  | 'tecnico'
  | 'assunto'
  | 'estrutura';

const CADASTRO_POR_IXC_RESOURCE: Record<string, OrdemServicoCadastroTipo> = {
  [IXC_FILIAL_RESOURCE]: 'filial',
  [IXC_SETOR_RESOURCE]: 'setor',
  [IXC_FUNCIONARIOS_RESOURCE]: 'tecnico',
  [IXC_ASSUNTO_RESOURCE]: 'assunto',
  [IXC_ESTRUTURA_RESOURCE]: 'estrutura',
};

const MODEL_POR_TIPO: Record<OrdemServicoCadastroTipo, typeof OrdemServicoCadastroModel> = {
  filial: OrdemServicoFilial,
  setor: OrdemServicoSetor,
  tecnico: OrdemServicoTecnico,
  assunto: OrdemServicoAssunto,
  estrutura: OrdemServicoEstrutura,
};

function empresaWhere(empresaId: number | null): WhereOptions<OrdemServicoCadastroModel> {
  if (empresaId == null) return {};
  return { empresa_id: empresaId };
}

function toLookupItem(record: OrdemServicoCadastroModel): LookupItem {
  return {
    id: record.ixc ? String(record.ixc_id ?? record.id) : String(record.id),
    nome: record.nome,
    ixc: record.ixc,
    id_local: String(record.id),
    ixc_id: record.ixc_id ?? '',
    integracao_ixc_provedor_id: record.integracao_ixc_provedor_id ?? undefined,
  };
}

export class OrdemServicoCadastroService {
  static resolveTipoByIxcResource(resource: string): OrdemServicoCadastroTipo | null {
    return CADASTRO_POR_IXC_RESOURCE[resource] ?? null;
  }

  static async syncIxcItens(
    tipo: OrdemServicoCadastroTipo,
    empresaId: number | null,
    integracaoIxcProvedorId: number,
    itens: LookupItem[]
  ): Promise<void> {
    if (itens.length === 0) return;

    const Model = MODEL_POR_TIPO[tipo];

    for (const item of itens) {
      const ixcId = String(item.id).trim();
      const nome = String(item.nome ?? '').trim();
      if (!ixcId || !nome) continue;

      const existente = await Model.findOne({
        where: {
          integracao_ixc_provedor_id: integracaoIxcProvedorId,
          ixc_id: ixcId,
        },
      });

      if (existente) {
        await existente.update({ nome, ixc: true });
        continue;
      }

      await Model.create({
        empresa_id: empresaId,
        integracao_ixc_provedor_id: integracaoIxcProvedorId,
        nome,
        ixc_id: ixcId,
        ixc: true,
      });
    }
  }

  static async pruneIxcCadastros(
    tipo: OrdemServicoCadastroTipo,
    empresaId: number | null,
    integracaoIxcProvedorId: number,
    allowedIxcIds: Set<string>
  ): Promise<void> {
    const Model = MODEL_POR_TIPO[tipo];
    const registros = await Model.findAll({
      where: {
        integracao_ixc_provedor_id: integracaoIxcProvedorId,
        ixc: true,
        ...empresaWhere(empresaId),
      },
    });

    for (const registro of registros) {
      const ixcId = String(registro.ixc_id ?? '').trim();
      if (ixcId && !allowedIxcIds.has(ixcId)) {
        await registro.destroy();
      }
    }
  }

  static async listIxcIdsForIntegracao(
    tipo: OrdemServicoCadastroTipo,
    integracaoIxcProvedorId: number,
    empresaId: number | null
  ): Promise<string[]> {
    const Model = MODEL_POR_TIPO[tipo];
    const registros = await Model.findAll({
      where: {
        integracao_ixc_provedor_id: integracaoIxcProvedorId,
        ixc: true,
        ...empresaWhere(empresaId),
      },
      attributes: ['ixc_id'],
    });

    return registros
      .map((registro) => String(registro.ixc_id ?? '').trim())
      .filter((ixcId) => ixcId.length > 0);
  }

  static async listLocais(
    tipo: OrdemServicoCadastroTipo,
    empresaId: number | null,
    search?: string
  ): Promise<LookupItem[]> {
    const Model = MODEL_POR_TIPO[tipo];
    const termo = search?.trim();

    const registros = await Model.findAll({
      where: {
        ixc: false,
        ...empresaWhere(empresaId),
        ...(termo ? { nome: { [Op.like]: `%${termo}%` } } : {}),
      },
      order: [['nome', 'ASC']],
    });

    return registros.map(toLookupItem);
  }

  static async lookupNomesPorReferencias(
    tipo: OrdemServicoCadastroTipo,
    referencias: string[],
    empresaId: number | null
  ): Promise<Map<string, string>> {
    const refs = [...new Set(referencias.map((ref) => String(ref).trim()).filter((ref) => ref && ref !== '0'))];
    if (refs.length === 0) return new Map();

    const Model = MODEL_POR_TIPO[tipo];
    const numericIds = refs
      .map((ref) => parseInt(ref, 10))
      .filter((id) => Number.isFinite(id) && id > 0);

    const registros = await Model.findAll({
      where: {
        [Op.or]: [
          { ixc_id: { [Op.in]: refs } },
          ...(numericIds.length > 0 ? [{ id: { [Op.in]: numericIds } }] : []),
        ],
        ...empresaWhere(empresaId),
      },
      attributes: ['id', 'ixc_id', 'nome'],
    });

    const mapa = new Map<string, string>();
    for (const registro of registros) {
      const nome = registro.nome?.trim() || '';
      if (!nome) continue;

      mapa.set(String(registro.id), nome);

      const ixcId = registro.ixc_id?.trim();
      if (ixcId) {
        mapa.set(ixcId, nome);
      }
    }

    return mapa;
  }
}
