/**
 * RpkiSchedulerRoutineService
 *
 * Rotinas agendadas delegadas ao Krill (sync parents/repo/publish).
 */
import { Op } from 'sequelize';
import { logger } from '../../../utils/logger';
import { RpkiCa } from '../../../models/rpki/RpkiCa';
import { RpkiCaParent } from '../../../models/rpki/RpkiCaParent';
import { RpkiRepository } from '../../../models/rpki/RpkiRepository';
import { RpkiProvisioningService } from '../RpkiProvisioningService';

interface SchedulerResult {
  success: boolean;
  message: string;
  total: number;
  sucesso: number;
  erro: number;
}

export class RpkiSchedulerRoutineService {
  static async syncAllParentResources(): Promise<SchedulerResult> {
    const empresaRpkiAtivoCache = new Map<number, boolean>();
    const canEmpresaExecRpki = async (empresaId: number): Promise<boolean> => {
      const cached = empresaRpkiAtivoCache.get(empresaId);
      if (cached !== undefined) return cached;

      const { getModulosDoPlano, tenantTemModulo } = await import('../../saas/PlanoModulosService');
      const modulos = await getModulosDoPlano(empresaId);
      const enabled = tenantTemModulo(modulos, 'rpki');
      empresaRpkiAtivoCache.set(empresaId, enabled);
      return enabled;
    };

    let total = 0;
    let skipped = 0;
    let sucesso = 0;
    let erro = 0;

    const parents = await RpkiCaParent.findAll({
      where: { provisioning_status: { [Op.ne]: 'error' } },
      include: [{ model: RpkiCa, as: 'ca' }],
    });

    for (const parent of parents) {
      const ca = (parent as RpkiCaParent & { ca?: RpkiCa }).ca;
      if (!ca?.handle) continue;

      try {
        if (ca.empresa_id != null && !(await canEmpresaExecRpki(ca.empresa_id))) {
          skipped++;
          continue;
        }

        total++;
        await RpkiProvisioningService.syncParentResources({
          ca,
          parent,
          empresaId: ca.empresa_id,
        });
        sucesso++;
      } catch (err) {
        erro++;
        logger.error('RpkiSchedulerRoutineService: erro ao sincronizar CA-pai via Krill', {
          context: 'RpkiSchedulerRoutineService',
          action: 'syncAllParentResources',
          caId: ca.id,
          parentId: parent.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return {
      success: erro === 0,
      message: `RPKI CA-pai (Krill): ${sucesso}/${total} sincronizadas${erro > 0 ? `, ${erro} com erro` : ''}${skipped > 0 ? `, ${skipped} ignoradas (módulo rpki ausente)` : ''}`,
      total,
      sucesso,
      erro,
    };
  }

  static async syncAllRepositories(): Promise<SchedulerResult> {
    const empresaRpkiAtivoCache = new Map<number, boolean>();
    const canEmpresaExecRpki = async (empresaId: number): Promise<boolean> => {
      const cached = empresaRpkiAtivoCache.get(empresaId);
      if (cached !== undefined) return cached;

      const { getModulosDoPlano, tenantTemModulo } = await import('../../saas/PlanoModulosService');
      const modulos = await getModulosDoPlano(empresaId);
      const enabled = tenantTemModulo(modulos, 'rpki');
      empresaRpkiAtivoCache.set(empresaId, enabled);
      return enabled;
    };

    let total = 0;
    let skipped = 0;
    let sucesso = 0;
    let erro = 0;

    const repositories = await RpkiRepository.findAll({
      include: [{ model: RpkiCa, as: 'ca' }],
    });

    const { RpkiCaService } = await import('../RpkiCaService');

    for (const repo of repositories) {
      const ca = (repo as RpkiRepository & { ca?: RpkiCa }).ca;
      if (!ca) continue;

      try {
        if (ca.empresa_id != null && !(await canEmpresaExecRpki(ca.empresa_id))) {
          skipped++;
          continue;
        }

        total++;
        await RpkiCaService.syncRepository(ca.id, repo.id, 'manual');
        sucesso++;
      } catch (err) {
        erro++;
        logger.error('RpkiSchedulerRoutineService: erro ao sincronizar repositório via Krill', {
          context: 'RpkiSchedulerRoutineService',
          action: 'syncAllRepositories',
          caId: ca.id,
          repositoryId: repo.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return {
      success: erro === 0,
      message: `RPKI repositórios (Krill): ${sucesso}/${total} sincronizados${erro > 0 ? `, ${erro} com erro` : ''}${skipped > 0 ? `, ${skipped} ignorados (módulo rpki ausente)` : ''}`,
      total,
      sucesso,
      erro,
    };
  }
}
