import type { Prisma, assinatura_digital_assinaturas } from '@prisma/client';
import { prisma } from '../../../db/prisma';

export interface ListAssinaturasFilters {
  status?: string;
  cliente_id?: string | number;
  termo_contrato_id?: string | number;
  empresa_id?: number | null;
}

const assinaturaInclude = {
  contratos_termos: { select: { id: true, tipo_termo: true, assinado: true } },
  clientes: { select: { id: true, razao_social: true, email: true, cnpj: true } },
} satisfies Prisma.assinatura_digital_assinaturasInclude;

type AssinaturaComRelacoes = Prisma.assinatura_digital_assinaturasGetPayload<{
  include: typeof assinaturaInclude;
}>;

export class AssinaturaDigitalService {
  /**
   * Recarrega o registro com contratos_termos e clientes.
   */
  static async reloadComRelacoes(assinatura: { id: number }): Promise<AssinaturaComRelacoes | null> {
    const reloaded = await prisma.assinatura_digital_assinaturas.findUnique({
      where: { id: assinatura.id },
      include: assinaturaInclude,
    });
    if (reloaded) Object.assign(assinatura, reloaded);
    return reloaded;
  }

  /**
   * Listar assinaturas com filtros (filtra por empresa_id quando informado)
   */
  static async list(filters: ListAssinaturasFilters): Promise<AssinaturaComRelacoes[]> {
    const where: Prisma.assinatura_digital_assinaturasWhereInput = {};

    if (filters.status) {
      where.status = filters.status as assinatura_digital_assinaturas['status'];
    }
    if (filters.cliente_id) {
      where.cliente_id = Number(filters.cliente_id);
    }
    if (filters.termo_contrato_id) {
      where.termo_contrato_id = Number(filters.termo_contrato_id);
    }
    if (filters.empresa_id != null) {
      where.empresa_id = filters.empresa_id;
    }

    return prisma.assinatura_digital_assinaturas.findMany({
      where,
      include: assinaturaInclude,
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Buscar assinatura por ID (opcionalmente validando empresa_id)
   */
  static async getById(id: string | number, empresaId?: number | null): Promise<AssinaturaComRelacoes | null> {
    const assinatura = await prisma.assinatura_digital_assinaturas.findUnique({
      where: { id: Number(id) },
      include: assinaturaInclude,
    });
    if (assinatura && empresaId != null && assinatura.empresa_id !== empresaId) {
      return null;
    }
    return assinatura;
  }

  /**
   * Buscar assinatura por termo_contrato_id
   */
  static async getByTermoContrato(termoContratoId: number): Promise<assinatura_digital_assinaturas | null> {
    return prisma.assinatura_digital_assinaturas.findFirst({
      where: { termo_contrato_id: termoContratoId },
    });
  }

  /**
   * Buscar assinatura por api_document_id (aceita string ou number)
   */
  static async getByApiDocumentId(apiDocumentId: string | number): Promise<assinatura_digital_assinaturas | null> {
    let assinatura = await prisma.assinatura_digital_assinaturas.findFirst({
      where: { api_document_id: String(apiDocumentId) },
    });

    const asNumber = String(Number(apiDocumentId));
    if (!assinatura && asNumber !== 'NaN' && asNumber !== String(apiDocumentId)) {
      assinatura = await prisma.assinatura_digital_assinaturas.findFirst({
        where: { api_document_id: asNumber },
      });
    }

    return assinatura;
  }

  /**
   * Buscar assinatura por api_document_id com apenas atributos específicos
   */
  static async getByApiDocumentIdWithAttributes(
    apiDocumentId: string | number,
    attributes: string[]
  ): Promise<Partial<assinatura_digital_assinaturas> | null> {
    const select = Object.fromEntries(attributes.map((attribute) => [attribute, true])) as Prisma.assinatura_digital_assinaturasSelect;
    let assinatura = await prisma.assinatura_digital_assinaturas.findFirst({
      where: { api_document_id: String(apiDocumentId) },
      select,
    });

    const asNumber = String(Number(apiDocumentId));
    if (!assinatura && asNumber !== 'NaN' && asNumber !== String(apiDocumentId)) {
      assinatura = await prisma.assinatura_digital_assinaturas.findFirst({
        where: { api_document_id: asNumber },
        select,
      });
    }

    return assinatura;
  }

  /**
   * Atualizar assinatura por ID
   */
  static async updateById(id: number, dados: Prisma.assinatura_digital_assinaturasUpdateInput): Promise<void> {
    await prisma.assinatura_digital_assinaturas.updateMany({
      where: { id },
      data: { ...dados, updated_at: new Date() },
    });
  }

  /**
   * Criar assinatura
   */
  static async create(dados: Prisma.assinatura_digital_assinaturasUncheckedCreateInput): Promise<assinatura_digital_assinaturas> {
    return prisma.assinatura_digital_assinaturas.create({ data: dados });
  }

  /**
   * Atualizar assinatura
   */
  static async update(
    id: string | number,
    dados: Prisma.assinatura_digital_assinaturasUpdateInput
  ): Promise<AssinaturaComRelacoes> {
    const assinatura = await prisma.assinatura_digital_assinaturas.findUnique({
      where: { id: Number(id) },
    });

    if (!assinatura) {
      throw new Error('Assinatura não encontrada');
    }

    return prisma.assinatura_digital_assinaturas.update({
      where: { id: assinatura.id },
      data: { ...dados, updated_at: new Date() },
      include: assinaturaInclude,
    });
  }

  /**
   * Deletar assinatura
   */
  static async delete(id: string | number): Promise<assinatura_digital_assinaturas> {
    const assinatura = await prisma.assinatura_digital_assinaturas.findUnique({
      where: { id: Number(id) },
    });

    if (!assinatura) {
      throw new Error('Assinatura não encontrada');
    }

    await prisma.assinatura_digital_assinaturas.delete({ where: { id: assinatura.id } });
    return assinatura;
  }
}
