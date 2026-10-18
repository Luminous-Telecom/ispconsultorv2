import type { Prisma, documentos_modelo } from '@prisma/client';
import { Prisma as PrismaNs } from '@prisma/client';
import { prisma } from '../../../db/prisma';

export interface ListModeloDocumentoFilters {
  tipo?: string;
  ativo?: boolean;
  empresa_id?: number | null;
}

const UPDATABLE_FIELDS = [
  'nome',
  'tipo',
  'conteudo',
  'conteudo_adesao',
  'conteudo_permanencia',
  'conteudo_recibo',
  'conteudo_carta',
  'descricao',
  'ativo',
  'tamanho_maximo',
  'tipos_permitidos',
  'retencao_dias',
  'auto_backup',
  'criptografia',
  'empresa_id',
] as const satisfies ReadonlyArray<keyof documentos_modelo>;

type UpdatableField = (typeof UPDATABLE_FIELDS)[number];

const UPDATE_MAX_ATTEMPTS = 4;

function whereEmpresaOuGlobal(empresaId: number): Prisma.documentos_modeloWhereInput {
  return { OR: [{ empresa_id: empresaId }, { empresa_id: null }] };
}

function pickUpdateData(dados: Partial<documentos_modelo>): Prisma.documentos_modeloUpdateInput {
  const data: Prisma.documentos_modeloUpdateInput = {};
  for (const field of UPDATABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(dados, field) && dados[field as UpdatableField] !== undefined) {
      (data as Record<string, unknown>)[field] = dados[field as UpdatableField];
    }
  }
  data.updated_at = new Date();
  return data;
}

/** MariaDB/MySQL 1020: update concorrente na mesma linha (ex.: várias abas em paralelo). */
function isMysqlRecordChangedError(error: unknown): boolean {
  const text = error instanceof Error ? error.message : String(error ?? '');
  return text.includes('Record has changed since last read') || text.includes('code: 1020');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class ModeloDocumentoService {
  /**
   * Listar modelos de documento (filtra por empresa_id quando informado)
   */
  static async list(filters: ListModeloDocumentoFilters = {}): Promise<{ success: boolean; data: documentos_modelo[] }> {
    const { tipo, ativo, empresa_id } = filters;
    const where: Prisma.documentos_modeloWhereInput = {};
    if (tipo) {
      where.tipo = tipo as documentos_modelo['tipo'];
    }
    if (ativo !== undefined) {
      where.ativo = ativo;
    }
    if (typeof empresa_id === 'number') {
      Object.assign(where, whereEmpresaOuGlobal(empresa_id));
    }

    const documentos = await prisma.documentos_modelo.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    return {
      success: true,
      data: documentos,
    };
  }

  /**
   * Buscar modelos por tipo (filtra por empresa_id quando informado)
   */
  static async getByType(tipo: string, ativo = true, empresaId?: number | null): Promise<documentos_modelo[]> {
    const where: Prisma.documentos_modeloWhereInput = {
      tipo: tipo as documentos_modelo['tipo'],
      ativo,
      ...(typeof empresaId === 'number' ? whereEmpresaOuGlobal(empresaId) : {}),
    };
    return prisma.documentos_modelo.findMany({
      where,
      orderBy: { nome: 'asc' },
    });
  }

  /**
   * Buscar modelo padrão por tipo (filtra por empresa_id quando informado)
   */
  static async getDefaultByType(tipo: string, empresaId?: number | null): Promise<documentos_modelo | null> {
    const where: Prisma.documentos_modeloWhereInput = {
      tipo: tipo as documentos_modelo['tipo'],
      ativo: true,
      ...(typeof empresaId === 'number' ? whereEmpresaOuGlobal(empresaId) : {}),
    };
    return prisma.documentos_modelo.findFirst({
      where,
      orderBy: { created_at: 'asc' },
    });
  }

  /**
   * Listar tipos disponíveis (filtra por empresa_id quando informado)
   */
  static async getTypes(empresaId?: number | null): Promise<string[]> {
    const where: Prisma.documentos_modeloWhereInput = {
      ativo: true,
      ...(typeof empresaId === 'number' ? whereEmpresaOuGlobal(empresaId) : {}),
    };
    const tipos = await prisma.documentos_modelo.findMany({
      where,
      distinct: ['tipo'],
      select: { tipo: true },
      orderBy: { tipo: 'asc' },
    });

    return tipos.map((doc) => doc.tipo);
  }

  /**
   * Modelo de contrato com aba Recibos preenchida (única fonte do PDF de recibo).
   * Prioriza o modelo vinculado ao contrato; senão, o primeiro contrato ativo da empresa.
   */
  static async resolveModeloReciboContrato(params: {
    empresaId?: number | null;
    modeloDocumentoId?: number | null;
  }): Promise<documentos_modelo | null> {
    const { empresaId, modeloDocumentoId } = params;

    const temRecibo = (modelo: documentos_modelo): boolean =>
      Boolean(modelo.conteudo_recibo?.trim());

    if (modeloDocumentoId) {
      const vinculado = await this.getById(modeloDocumentoId);
      if (vinculado?.tipo === 'contrato' && vinculado.ativo && temRecibo(vinculado)) {
        return vinculado;
      }
    }

    const modelosContrato = await this.getByType('contrato', true, empresaId);
    return modelosContrato.find(temRecibo) ?? null;
  }

  /**
   * Buscar modelo por ID
   */
  static async getById(id: string | number): Promise<documentos_modelo | null> {
    return prisma.documentos_modelo.findUnique({
      where: { id: Number(id) },
    });
  }

  /**
   * Criar modelo de documento
   */
  static async create(dados: Partial<documentos_modelo>): Promise<documentos_modelo> {
    return prisma.documentos_modelo.create({
      data: dados as Prisma.documentos_modeloCreateInput,
    });
  }

  /**
   * Atualizar modelo de documento (um UPDATE; retry em concorrência MySQL 1020).
   */
  static async update(id: string | number, dados: Partial<documentos_modelo>): Promise<documentos_modelo> {
    const numericId = Number(id);
    const data = pickUpdateData(dados);

    for (let attempt = 1; attempt <= UPDATE_MAX_ATTEMPTS; attempt += 1) {
      try {
        return await prisma.documentos_modelo.update({
          where: { id: numericId },
          data,
        });
      } catch (error) {
        if (
          error instanceof PrismaNs.PrismaClientKnownRequestError &&
          error.code === 'P2025'
        ) {
          throw new Error('Modelo de documento não encontrado');
        }
        if (isMysqlRecordChangedError(error) && attempt < UPDATE_MAX_ATTEMPTS) {
          await sleep(40 * attempt);
          continue;
        }
        throw error;
      }
    }

    throw new Error('Modelo de documento não encontrado');
  }

  /**
   * Deletar modelo de documento
   */
  static async delete(id: string | number): Promise<documentos_modelo> {
    const numericId = Number(id);
    try {
      return await prisma.documentos_modelo.delete({ where: { id: numericId } });
    } catch (error) {
      if (
        error instanceof PrismaNs.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new Error('Modelo de documento não encontrado');
      }
      throw error;
    }
  }
}
