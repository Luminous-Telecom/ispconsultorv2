import type { Prisma, comunicacao_servidores_whatsapp } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { whereComunicacaoEmpresaEstrito } from '../../../utils/comunicacaoEmpresaWhere';
import { buildPagination } from '../../../utils/pagination';
import type { ParsedListQuery } from '../../../utils/listQuery';

const TOKEN_FIELDS = ['evolution_api_key', 'whatsapp_cloud_token'] as const;

type ServidorWhatsAppSemTokens = Omit<comunicacao_servidores_whatsapp, (typeof TOKEN_FIELDS)[number]>;

function semTokens(row: comunicacao_servidores_whatsapp): ServidorWhatsAppSemTokens {
  const { evolution_api_key: _apiKey, whatsapp_cloud_token: _token, ...rest } = row;
  return rest;
}

export class ServidorWhatsAppService {
  /**
   * Listar servidores de WhatsApp do tenant (sem incluir registros legacy com empresa_id NULL)
   */
  static async list(empresaId?: number | null): Promise<{ success: boolean; data: ServidorWhatsAppSemTokens[] }> {
    const whereEstrito = whereComunicacaoEmpresaEstrito(empresaId);
    const where = (whereEstrito ?? {}) as Prisma.comunicacao_servidores_whatsappWhereInput;
    const servidores = await prisma.comunicacao_servidores_whatsapp.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    return {
      success: true,
      data: servidores.map(semTokens),
    };
  }

  static async listPaginated(empresaId: number | null | undefined, filters: ParsedListQuery) {
    const where = (whereComunicacaoEmpresaEstrito(empresaId) ?? {}) as Prisma.comunicacao_servidores_whatsappWhereInput;
    const termo = filters.search?.trim();
    if (termo) {
      const campo = filters.searchField;
      if (campo === 'id' && /^\d+$/.test(termo)) where.id = Number(termo);
      else if (campo === 'instance_name') where.instance_name = { contains: termo };
      else if (campo === 'descricao') where.descricao = { contains: termo };
      else if (campo === 'tipo_api') where.tipo_api = termo as comunicacao_servidores_whatsapp['tipo_api'];
      else {
        where.OR = [
          { descricao: { contains: termo } },
          { instance_name: { contains: termo } },
        ];
      }
    }

    const colunas = ['id', 'descricao', 'tipo_api', 'instance_name', 'ativo', 'padrao', 'status_conexao', 'created_at'] as const;
    const direcao = filters.sortDirection === 'asc' ? 'asc' : 'desc';
    const coluna = colunas.includes(filters.sortColumn as (typeof colunas)[number])
      ? (filters.sortColumn as (typeof colunas)[number])
      : 'id';
    const page = filters.page;
    const limit = filters.limit;

    const [rows, total] = await Promise.all([
      prisma.comunicacao_servidores_whatsapp.findMany({
        where,
        orderBy: { [coluna]: direcao },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.comunicacao_servidores_whatsapp.count({ where }),
    ]);

    return {
      success: true,
      data: rows.map(semTokens),
      pagination: buildPagination(page, limit, total),
    };
  }

  /**
   * Buscar servidor por ID
   */
  static async getById(id: string | number, options: { excludeTokens: true }): Promise<ServidorWhatsAppSemTokens | null>;
  static async getById(id: string | number, options?: { excludeTokens?: false }): Promise<comunicacao_servidores_whatsapp | null>;
  static async getById(
    id: string | number,
    options?: { excludeTokens?: boolean }
  ): Promise<comunicacao_servidores_whatsapp | ServidorWhatsAppSemTokens | null> {
    const servidor = await prisma.comunicacao_servidores_whatsapp.findUnique({
      where: { id: Number(id) },
    });
    if (!servidor) return null;
    return options?.excludeTokens ? semTokens(servidor) : servidor;
  }

  /**
   * Buscar servidor por condições
   */
  static async findOne(where: object): Promise<comunicacao_servidores_whatsapp | null> {
    return prisma.comunicacao_servidores_whatsapp.findFirst({
      where: where as Prisma.comunicacao_servidores_whatsappWhereInput,
    });
  }

  /**
   * Criar servidor
   */
  static async create(dados: Partial<comunicacao_servidores_whatsapp>): Promise<comunicacao_servidores_whatsapp> {
    return prisma.comunicacao_servidores_whatsapp.create({
      data: dados as Prisma.comunicacao_servidores_whatsappCreateInput,
    });
  }

  /**
   * Deletar servidor
   */
  static async delete(id: string | number): Promise<comunicacao_servidores_whatsapp> {
    const servidor = await prisma.comunicacao_servidores_whatsapp.findUnique({
      where: { id: Number(id) },
    });

    if (!servidor) {
      throw new Error('Servidor de WhatsApp não encontrado');
    }

    await prisma.comunicacao_servidores_whatsapp.delete({ where: { id: servidor.id } });
    return servidor;
  }

  /**
   * Atualizar servidor existente pelo id
   */
  static async updateInstance(
    servidor: { id: number },
    dados: Partial<comunicacao_servidores_whatsapp>
  ): Promise<comunicacao_servidores_whatsapp> {
    const updated = await prisma.comunicacao_servidores_whatsapp.update({
      where: { id: servidor.id },
      data: {
        ...(dados as Prisma.comunicacao_servidores_whatsappUpdateInput),
        updated_at: new Date(),
      },
    });
    Object.assign(servidor, updated);
    return updated;
  }

  /**
   * Atualizar múltiplos servidores (bulk update)
   */
  static async updateBulk(
    where: object,
    dados: Partial<comunicacao_servidores_whatsapp>
  ): Promise<number> {
    const result = await prisma.comunicacao_servidores_whatsapp.updateMany({
      where: where as Prisma.comunicacao_servidores_whatsappWhereInput,
      data: {
        ...(dados as Prisma.comunicacao_servidores_whatsappUpdateManyMutationInput),
        updated_at: new Date(),
      },
    });
    return result.count;
  }
}
