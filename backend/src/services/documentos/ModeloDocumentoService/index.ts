import type { Prisma, documentos_modelo } from '@prisma/client';
import { prisma } from '../../../db/prisma';

export interface ListModeloDocumentoFilters {
  tipo?: string;
  ativo?: boolean;
  empresa_id?: number | null;
}

function whereEmpresaOuGlobal(empresaId: number): Prisma.documentos_modeloWhereInput {
  return { OR: [{ empresa_id: empresaId }, { empresa_id: null }] };
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
   * Atualizar modelo de documento
   */
  static async update(id: string | number, dados: Partial<documentos_modelo>): Promise<documentos_modelo> {
    const documento = await prisma.documentos_modelo.findUnique({
      where: { id: Number(id) },
    });

    if (!documento) {
      throw new Error('Modelo de documento não encontrado');
    }

    return prisma.documentos_modelo.update({
      where: { id: documento.id },
      data: {
        ...(dados as Prisma.documentos_modeloUpdateInput),
        updated_at: new Date(),
      },
    });
  }

  /**
   * Deletar modelo de documento
   */
  static async delete(id: string | number): Promise<documentos_modelo> {
    const documento = await prisma.documentos_modelo.findUnique({
      where: { id: Number(id) },
    });

    if (!documento) {
      throw new Error('Modelo de documento não encontrado');
    }

    await prisma.documentos_modelo.delete({ where: { id: documento.id } });
    return documento;
  }
}
