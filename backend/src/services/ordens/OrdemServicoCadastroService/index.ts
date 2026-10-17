import { prisma } from '../../../db/prisma';
import {
  IXC_ASSUNTO_RESOURCE,
  IXC_ESTRUTURA_RESOURCE,
  IXC_FILIAL_RESOURCE,
  IXC_FUNCIONARIOS_RESOURCE,
  IXC_SETOR_RESOURCE,
} from '../../externos/IxcOssChamadoService/constants';
import type { LookupItem } from '../../externos/IxcOssChamadoService/types';

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

type CadastroRow = {
  id: number;
  nome: string;
  ixc_id: string | null;
  ixc: boolean;
  integracao_ixc_provedor_id: number | null;
  empresa_id: number | null;
};

type CadastroWhere = {
  integracao_ixc_provedor_id?: number;
  ixc_id?: string | { in: string[] };
  ixc?: boolean;
  empresa_id?: number;
  nome?: { contains: string };
  id?: { in: number[] };
  OR?: CadastroWhere[];
};

type CadastroDelegate = {
  findFirst(args: { where: CadastroWhere }): Promise<CadastroRow | null>;
  findMany(args: {
    where: CadastroWhere;
    orderBy?: { nome: 'asc' | 'desc' };
    select?: { ixc_id?: boolean; id?: boolean; nome?: boolean };
  }): Promise<CadastroRow[]>;
  create(args: { data: Record<string, unknown> }): Promise<CadastroRow>;
  update(args: { where: { id: number }; data: Record<string, unknown> }): Promise<CadastroRow>;
  delete(args: { where: { id: number } }): Promise<CadastroRow>;
};

const DELEGATE: Record<OrdemServicoCadastroTipo, CadastroDelegate> = {
  filial: prisma.ordens_servico_filiais as unknown as CadastroDelegate,
  setor: prisma.ordens_servico_setores as unknown as CadastroDelegate,
  tecnico: prisma.ordens_servico_tecnicos as unknown as CadastroDelegate,
  assunto: prisma.ordens_servico_assuntos as unknown as CadastroDelegate,
  estrutura: prisma.ordens_servico_estruturas as unknown as CadastroDelegate,
};

function empresaWhere(empresaId: number | null): CadastroWhere {
  if (empresaId == null) return {};
  return { empresa_id: empresaId };
}

function toLookupItem(record: CadastroRow): LookupItem {
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

    const model = DELEGATE[tipo];

    for (const item of itens) {
      const ixcId = String(item.id).trim();
      const nome = String(item.nome ?? '').trim();
      if (!ixcId || !nome) continue;

      const existente = await model.findFirst({
        where: {
          integracao_ixc_provedor_id: integracaoIxcProvedorId,
          ixc_id: ixcId,
        },
      });

      if (existente) {
        await model.update({
          where: { id: existente.id },
          data: { nome, ixc: true, updated_at: new Date() },
        });
        continue;
      }

      await model.create({
        data: {
          empresa_id: empresaId,
          integracao_ixc_provedor_id: integracaoIxcProvedorId,
          nome,
          ixc_id: ixcId,
          ixc: true,
        },
      });
    }
  }

  static async pruneIxcCadastros(
    tipo: OrdemServicoCadastroTipo,
    empresaId: number | null,
    integracaoIxcProvedorId: number,
    allowedIxcIds: Set<string>
  ): Promise<void> {
    const model = DELEGATE[tipo];
    const registros = await model.findMany({
      where: {
        integracao_ixc_provedor_id: integracaoIxcProvedorId,
        ixc: true,
        ...empresaWhere(empresaId),
      },
    });

    for (const registro of registros) {
      const ixcId = String(registro.ixc_id ?? '').trim();
      if (ixcId && !allowedIxcIds.has(ixcId)) {
        await model.delete({ where: { id: registro.id } });
      }
    }
  }

  static async listIxcIdsForIntegracao(
    tipo: OrdemServicoCadastroTipo,
    integracaoIxcProvedorId: number,
    empresaId: number | null
  ): Promise<string[]> {
    const model = DELEGATE[tipo];
    const registros = await model.findMany({
      where: {
        integracao_ixc_provedor_id: integracaoIxcProvedorId,
        ixc: true,
        ...empresaWhere(empresaId),
      },
      select: { ixc_id: true },
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
    const model = DELEGATE[tipo];
    const termo = search?.trim();

    const registros = await model.findMany({
      where: {
        ixc: false,
        ...empresaWhere(empresaId),
        ...(termo ? { nome: { contains: termo } } : {}),
      },
      orderBy: { nome: 'asc' },
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

    const model = DELEGATE[tipo];
    const numericIds = refs
      .map((ref) => parseInt(ref, 10))
      .filter((id) => Number.isFinite(id) && id > 0);

    const registros = await model.findMany({
      where: {
        OR: [
          { ixc_id: { in: refs } },
          ...(numericIds.length > 0 ? [{ id: { in: numericIds } }] : []),
        ],
        ...empresaWhere(empresaId),
      },
      select: { id: true, ixc_id: true, nome: true },
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
