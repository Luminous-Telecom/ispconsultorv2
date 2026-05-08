import { RpkiCa } from '../../../models/rpki/RpkiCa';
import { RpkiCaParent } from '../../../models/rpki/RpkiCaParent';
import { RpkiRepository } from '../../../models/rpki/RpkiRepository';
import { RpkiProvisioningService } from '../RpkiProvisioningService';
import { RpkiCaService } from '../RpkiCaService';
import { logger } from '../../../utils/logger';

interface RpkiRoutineSummary {
  success: boolean;
  message: string;
  total: number;
  sucesso: number;
  erro: number;
}

export class RpkiSchedulerRoutineService {
  static async syncAllParentResources(): Promise<RpkiRoutineSummary> {
    const parents = await RpkiCaParent.findAll({
      order: [['id', 'ASC']],
    });

    let sucesso = 0;
    let erro = 0;

    for (const parent of parents) {
      try {
        const ca = await RpkiCa.findByPk(parent.ca_id);
        if (!ca || ca.status === 'disabled') {
          continue;
        }

        await RpkiProvisioningService.syncParentResources({
          ca,
          parent,
          empresaId: ca.empresa_id,
        });
        sucesso += 1;
      } catch (error) {
        erro += 1;
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        await parent.update({
          provisioning_status: 'error',
          last_error: errorMessage,
        });
        logger.warn('Falha ao sincronizar recursos RPKI da CA-pai em rotina agendada', {
          context: 'RpkiSchedulerRoutineService',
          action: 'syncAllParentResources',
          parentId: parent.id,
          caId: parent.ca_id,
          error: errorMessage,
        });
      }
    }

    const total = parents.length;
    return {
      success: erro === 0,
      message: `Sincronização de CAs-pai concluída: ${sucesso} sucesso(s), ${erro} erro(s).`,
      total,
      sucesso,
      erro,
    };
  }

  static async syncAllRepositories(): Promise<RpkiRoutineSummary> {
    const repositories = await RpkiRepository.findAll({
      order: [['id', 'ASC']],
    });

    let sucesso = 0;
    let erro = 0;

    for (const repository of repositories) {
      try {
        const ca = await RpkiCa.findByPk(repository.ca_id);
        if (!ca || ca.status === 'disabled') {
          continue;
        }

        await RpkiCaService.syncRepository(repository.ca_id, repository.id);
        sucesso += 1;
      } catch (error) {
        erro += 1;
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        await repository.update({
          publication_status: 'error',
          last_error: errorMessage,
        });
        logger.warn('Falha ao sincronizar repositório RPKI em rotina agendada', {
          context: 'RpkiSchedulerRoutineService',
          action: 'syncAllRepositories',
          repositoryId: repository.id,
          caId: repository.ca_id,
          error: errorMessage,
        });
      }
    }

    const total = repositories.length;
    return {
      success: erro === 0,
      message: `Sincronização de repositórios RPKI concluída: ${sucesso} sucesso(s), ${erro} erro(s).`,
      total,
      sucesso,
      erro,
    };
  }
}

