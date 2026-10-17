import { prisma } from '../../../db/prisma';
import { RpkiClientError } from '../../../utils/errorUtils';
import { KrillApiService } from '../KrillApiService';
import { syncKrillRepositoryForCa } from '../KrillSyncService';
import { logger } from '../../../utils/logger';

export interface ListRpkiCaFilters {
  empresa_id: number | null;
}

export interface CreateRpkiCaInput {
  empresa_id: number | null;
  nome: string;
  cliente_id?: number | null;
}

function normalizeHandleBase(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'ca';
}

async function generateUniqueHandle(empresa_id: number | null, nome: string): Promise<string> {
  const base = normalizeHandleBase(nome);
  const prefix = `${base}`;
  const existing = await prisma.rpki_cas.findMany({
    where: {
      empresa_id,
      handle: { startsWith: prefix },
    },
    select: { handle: true },
  });

  if (existing.length === 0) return prefix;

  const used = new Set(existing.map((row) => String((row as { handle: string }).handle)));
  let i = 2;
  while (used.has(`${prefix}-${i}`)) i += 1;
  return `${prefix}-${i}`;
}

export class RpkiCaService {
  static async list(filters: ListRpkiCaFilters) {
    return prisma.rpki_cas.findMany({
      where: { empresa_id: filters.empresa_id },
      orderBy: { id: 'desc' },
    });
  }

  static async create(input: CreateRpkiCaInput) {
    const nome = input.nome.trim();
    const empresa_id = input.empresa_id ?? null;
    const cliente_id = input.cliente_id ?? null;

    const handle = await generateUniqueHandle(empresa_id, nome);

    await KrillApiService.ensureCa(handle);

    return prisma.rpki_cas.create({
      data: {
        empresa_id,
        cliente_id,
        nome,
        handle,
        status: 'pending',
      },
    });
  }

  static async listParents(ca_id: number) {
    const rows = await prisma.rpki_ca_parents.findMany({
      where: { ca_id },
      orderBy: { id: 'desc' },
    });
    return rows.map(({ parent_response_xml: _xml, ...rest }) => rest);
  }

  static async listResources(ca_id: number) {
    return prisma.rpki_ca_resources.findMany({
      where: { ca_id },
      orderBy: { id: 'desc' },
    });
  }

  static async clearResources(ca_id: number): Promise<number> {
    const result = await prisma.rpki_ca_resources.deleteMany({ where: { ca_id } });
    return result.count;
  }

  static async listRepositories(ca_id: number) {
    return prisma.rpki_repositories.findMany({
      where: { ca_id },
      orderBy: { id: 'desc' },
    });
  }

  static async deleteParent(ca_id: number, parent_id: number): Promise<void> {
    const parent = await prisma.rpki_ca_parents.findFirst({ where: { id: parent_id, ca_id } });
    if (!parent) throw new RpkiClientError('CA-pai não encontrada para exclusão');

    const ca = await prisma.rpki_cas.findUnique({ where: { id: ca_id } });
    if (ca?.handle && parent.parent_name) {
      try {
        await KrillApiService.removeParent(ca.handle, parent.parent_name);
      } catch (err) {
        logger.warn('RpkiCaService.deleteParent: falha ao remover parent no Krill', {
          context: 'RpkiCaService',
          action: 'deleteParent',
          caId: ca_id,
          parentId: parent_id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    await prisma.rpki_ca_parents.deleteMany({ where: { id: parent_id, ca_id } });
  }

  static async deleteRepository(ca_id: number, repository_id: number): Promise<void> {
    const deleted = await prisma.rpki_repositories.deleteMany({
      where: { id: repository_id, ca_id },
    });
    if (!deleted.count) {
      throw new RpkiClientError('Repositório não encontrado para exclusão');
    }
  }

  static async syncRepository(ca_id: number, repository_id: number, triggerType?: 'roa' | 'aspa' | 'manual' | null) {
    const repository = await prisma.rpki_repositories.findFirst({
      where: { id: repository_id, ca_id },
    });
    if (!repository) {
      throw new RpkiClientError('Repositório não encontrado para atualização');
    }

    const ca = await prisma.rpki_cas.findUnique({ where: { id: ca_id } });
    if (!ca) {
      throw new RpkiClientError('CA não encontrada');
    }

    if (!repository.publication_service_uri) {
      logger.warn('RpkiCaService.syncRepository: repositório sem publication_service_uri; sincronizando via Krill', {
        context: 'RpkiCaService',
        action: 'syncRepository',
        caId: ca_id,
        repositoryId: repository_id,
      });
    }

    return syncKrillRepositoryForCa(ca_id, repository_id, triggerType ?? null);
  }

  static async delete(ca_id: number): Promise<void> {
    const ca = await prisma.rpki_cas.findUnique({ where: { id: ca_id } });
    if (!ca) throw new RpkiClientError('CA não encontrada');

    const [parentsCount, resourcesCount, repositoriesCount] = await Promise.all([
      prisma.rpki_ca_parents.count({ where: { ca_id } }),
      prisma.rpki_ca_resources.count({ where: { ca_id } }),
      prisma.rpki_repositories.count({ where: { ca_id } }),
    ]);

    if (parentsCount > 0 || resourcesCount > 0 || repositoriesCount > 0) {
      throw new RpkiClientError(
        'Não é possível excluir a CA: existem vínculos (CA-pai, recursos ou repositório). Remova os vínculos antes de excluir.'
      );
    }

    try {
      await KrillApiService.deleteCa(ca.handle);
    } catch (err) {
      logger.warn('RpkiCaService.delete: falha ao remover CA no Krill (seguindo exclusão local)', {
        context: 'RpkiCaService',
        action: 'delete',
        caId: ca_id,
        handle: ca.handle,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    await prisma.rpki_cas.delete({ where: { id: ca_id } });
  }
}

