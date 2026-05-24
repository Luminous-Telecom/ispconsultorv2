import { Op, WhereOptions } from 'sequelize';
import { RpkiCa } from '../../../models/rpki/RpkiCa';
import { RpkiCaParent } from '../../../models/rpki/RpkiCaParent';
import { RpkiCaResource } from '../../../models/rpki/RpkiCaResource';
import { RpkiRepository } from '../../../models/rpki/RpkiRepository';
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
  const whereEmpresa: WhereOptions<RpkiCa> = empresa_id == null ? { empresa_id: null } : { empresa_id };

  const existing = await RpkiCa.findAll({
    where: {
      ...whereEmpresa,
      handle: {
        [Op.like]: `${prefix}%`,
      },
    },
    attributes: ['handle'],
    raw: true,
  });

  if (existing.length === 0) return prefix;

  const used = new Set(existing.map((row) => String((row as { handle: string }).handle)));
  let i = 2;
  while (used.has(`${prefix}-${i}`)) i += 1;
  return `${prefix}-${i}`;
}

export class RpkiCaService {
  static async list(filters: ListRpkiCaFilters): Promise<RpkiCa[]> {
    const where: WhereOptions<RpkiCa> =
      filters.empresa_id == null
        ? { empresa_id: null }
        : { empresa_id: filters.empresa_id };

    return RpkiCa.findAll({
      where,
      order: [['id', 'DESC']],
    });
  }

  static async create(input: CreateRpkiCaInput): Promise<RpkiCa> {
    const nome = input.nome.trim();
    const empresa_id = input.empresa_id ?? null;
    const cliente_id = input.cliente_id ?? null;

    const handle = await generateUniqueHandle(empresa_id, nome);

    await KrillApiService.ensureCa(handle);

    return RpkiCa.create({
      empresa_id,
      cliente_id,
      nome,
      handle,
      status: 'pending',
    });
  }

  static async listParents(ca_id: number): Promise<RpkiCaParent[]> {
    return RpkiCaParent.findAll({
      where: { ca_id },
      order: [['id', 'DESC']],
      attributes: {
        exclude: ['parent_response_xml'],
      },
    });
  }

  static async listResources(ca_id: number): Promise<RpkiCaResource[]> {
    return RpkiCaResource.findAll({
      where: { ca_id },
      order: [['id', 'DESC']],
    });
  }

  static async clearResources(ca_id: number): Promise<number> {
    return RpkiCaResource.destroy({
      where: { ca_id },
    });
  }

  static async listRepositories(ca_id: number): Promise<RpkiRepository[]> {
    return RpkiRepository.findAll({
      where: { ca_id },
      order: [['id', 'DESC']],
    });
  }

  static async deleteParent(ca_id: number, parent_id: number): Promise<void> {
    const parent = await RpkiCaParent.findOne({ where: { id: parent_id, ca_id } });
    if (!parent) throw new RpkiClientError('CA-pai não encontrada para exclusão');

    const ca = await RpkiCa.findByPk(ca_id);
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

    await RpkiCaParent.destroy({ where: { id: parent_id, ca_id } });
  }

  static async deleteRepository(ca_id: number, repository_id: number): Promise<void> {
    const deleted = await RpkiRepository.destroy({
      where: {
        id: repository_id,
        ca_id,
      },
    });
    if (!deleted) {
      throw new RpkiClientError('Repositório não encontrado para exclusão');
    }
  }

  static async syncRepository(ca_id: number, repository_id: number, triggerType?: 'roa' | 'aspa' | 'manual' | null): Promise<RpkiRepository> {
    const repository = await RpkiRepository.findOne({
      where: { id: repository_id, ca_id },
    });
    if (!repository) {
      throw new RpkiClientError('Repositório não encontrado para atualização');
    }

    const ca = await RpkiCa.findByPk(ca_id);
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
    const ca = await RpkiCa.findByPk(ca_id);
    if (!ca) throw new RpkiClientError('CA não encontrada');

    const [parentsCount, resourcesCount, repositoriesCount] = await Promise.all([
      RpkiCaParent.count({ where: { ca_id } }),
      RpkiCaResource.count({ where: { ca_id } }),
      RpkiRepository.count({ where: { ca_id } }),
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

    await RpkiCa.destroy({ where: { id: ca_id } });
  }
}

