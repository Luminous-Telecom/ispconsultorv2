import type { Prisma, comunicacao_servidores_email } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { whereComunicacaoEmpresaEstrito } from '../../../utils/comunicacaoEmpresaWhere';
import { buildPagination } from '../../../utils/pagination';
import type { ParsedListQuery } from '../../../utils/listQuery';

type ServidorEmailSemSenha = Omit<comunicacao_servidores_email, 'senha'>;

function semSenha(row: comunicacao_servidores_email): ServidorEmailSemSenha {
  const { senha: _senha, ...rest } = row;
  return rest;
}

type FindOneInput =
  | Prisma.comunicacao_servidores_emailWhereInput
  | {
      where?: Prisma.comunicacao_servidores_emailWhereInput;
      attributes?: { exclude?: string[] };
      include?: unknown;
      order?: unknown;
    };

export class ServidorEmailService {
  /**
   * Listar servidores de email do tenant (sem incluir registros legacy com empresa_id NULL)
   */
  static async list(empresaId?: number | null): Promise<{ success: boolean; data: ServidorEmailSemSenha[] }> {
    const whereEstrito = whereComunicacaoEmpresaEstrito(empresaId);
    const where = (whereEstrito ?? {}) as Prisma.comunicacao_servidores_emailWhereInput;
    const servidores = await prisma.comunicacao_servidores_email.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    return {
      success: true,
      data: servidores.map(semSenha),
    };
  }

  static async listPaginated(empresaId: number | null | undefined, filters: ParsedListQuery) {
    const where = (whereComunicacaoEmpresaEstrito(empresaId) ?? {}) as Prisma.comunicacao_servidores_emailWhereInput;
    const termo = filters.search?.trim();
    if (termo) {
      const campo = filters.searchField;
      if (campo === 'id' && /^\d+$/.test(termo)) where.id = Number(termo);
      else if (campo === 'host') where.host = { contains: termo };
      else if (campo === 'email_remetente') where.email_remetente = { contains: termo };
      else if (campo === 'descricao') where.descricao = { contains: termo };
      else {
        where.OR = [
          { descricao: { contains: termo } },
          { host: { contains: termo } },
          { email_remetente: { contains: termo } },
          { nome_remetente: { contains: termo } },
        ];
      }
    }

    const colunas = ['id', 'descricao', 'host', 'email_remetente', 'nome_remetente', 'ativo', 'padrao', 'created_at'] as const;
    const direcao = filters.sortDirection === 'asc' ? 'asc' : 'desc';
    const coluna = colunas.includes(filters.sortColumn as (typeof colunas)[number])
      ? (filters.sortColumn as (typeof colunas)[number])
      : 'id';
    const page = filters.page;
    const limit = filters.limit;

    const [rows, total] = await Promise.all([
      prisma.comunicacao_servidores_email.findMany({
        where,
        orderBy: { [coluna]: direcao },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.comunicacao_servidores_email.count({ where }),
    ]);

    return {
      success: true,
      data: rows.map(semSenha),
      pagination: buildPagination(page, limit, total),
    };
  }

  /**
   * Buscar servidor por ID
   */
  static async getById(
    id: string | number,
    options?: { excludePassword?: boolean }
  ): Promise<comunicacao_servidores_email | ServidorEmailSemSenha | null> {
    const servidor = await prisma.comunicacao_servidores_email.findUnique({
      where: { id: Number(id) },
    });
    if (!servidor) return null;
    return options?.excludePassword ? semSenha(servidor) : servidor;
  }

  /**
   * Buscar servidor por condições
   */
  static async findOne(options: FindOneInput): Promise<comunicacao_servidores_email | ServidorEmailSemSenha | null> {
    const hasQueryShape = 'where' in options || 'attributes' in options || 'include' in options || 'order' in options;
    const where = (hasQueryShape
      ? (options as { where?: Prisma.comunicacao_servidores_emailWhereInput }).where ?? {}
      : options) as Prisma.comunicacao_servidores_emailWhereInput;
    const exclude = hasQueryShape
      ? (options as { attributes?: { exclude?: string[] } }).attributes?.exclude
      : undefined;
    const servidor = await prisma.comunicacao_servidores_email.findFirst({ where });
    if (!servidor) return null;
    return exclude?.includes('senha') ? semSenha(servidor) : servidor;
  }

  /**
   * Criar servidor
   */
  static async create(dados: Partial<comunicacao_servidores_email>): Promise<comunicacao_servidores_email> {
    return prisma.comunicacao_servidores_email.create({
      data: dados as Prisma.comunicacao_servidores_emailCreateInput,
    });
  }

  /**
   * Atualizar servidor
   */
  static async update(id: string | number, dados: Partial<comunicacao_servidores_email>): Promise<comunicacao_servidores_email> {
    const servidor = await prisma.comunicacao_servidores_email.findUnique({
      where: { id: Number(id) },
    });

    if (!servidor) {
      throw new Error('Servidor de email não encontrado');
    }

    return prisma.comunicacao_servidores_email.update({
      where: { id: servidor.id },
      data: {
        ...(dados as Prisma.comunicacao_servidores_emailUpdateInput),
        updated_at: new Date(),
      },
    });
  }

  /**
   * Atualizar múltiplos servidores (bulk update)
   */
  static async updateBulk(
    where: object,
    dados: Partial<comunicacao_servidores_email>
  ): Promise<void> {
    await prisma.comunicacao_servidores_email.updateMany({
      where: where as Prisma.comunicacao_servidores_emailWhereInput,
      data: {
        ...(dados as Prisma.comunicacao_servidores_emailUpdateManyMutationInput),
        updated_at: new Date(),
      },
    });
  }

  /**
   * Deletar servidor
   */
  static async delete(id: string | number): Promise<comunicacao_servidores_email> {
    const servidor = await prisma.comunicacao_servidores_email.findUnique({
      where: { id: Number(id) },
    });

    if (!servidor) {
      throw new Error('Servidor de email não encontrado');
    }

    await prisma.comunicacao_servidores_email.delete({ where: { id: servidor.id } });
    return servidor;
  }

  /**
   * Atualizar servidor existente pelo id
   */
  static async updateInstance(
    servidor: { id: number },
    dados: Partial<comunicacao_servidores_email>
  ): Promise<comunicacao_servidores_email> {
    const updated = await prisma.comunicacao_servidores_email.update({
      where: { id: servidor.id },
      data: {
        ...(dados as Prisma.comunicacao_servidores_emailUpdateInput),
        updated_at: new Date(),
      },
    });
    Object.assign(servidor, updated);
    return updated;
  }
}
