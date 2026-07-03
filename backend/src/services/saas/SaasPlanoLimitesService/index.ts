import { Op, literal } from 'sequelize';
import { Usuario } from '../../../models/cadastros/Usuario';
import { SshDevice } from '../../../models/ssh-manager/SshDevice';
import { SaasContrato } from '../../../models/saas/SaasContrato';
import { SaasPlano } from '../../../models/saas/SaasPlano';
import type { PlanoModuloId } from '../../../constants/planoModulos';

export interface SaasPlanoLimitesContext {
  plano: SaasPlano;
  modulos: PlanoModuloId[];
  limiteUsuarios: number;
  limiteEquipamentos: number;
  limiteTuneis: number;
  limiteBackups: number;
}

export interface EquipamentoLimitCheck {
  empresaId: number;
  hasTunel?: boolean;
  hasBackup?: boolean;
}

export interface EquipamentoUpdateLimitCheck extends EquipamentoLimitCheck {
  currentHasTunel?: boolean;
  currentHasBackup?: boolean;
}

const DEFAULT_EQUIPAMENTOS_LIMITS = {
  limiteEquipamentos: 0,
  limiteTuneis: 0,
  limiteBackups: 0,
};

function parseRecursos(recursos: SaasPlano['recursos'] | string | null | undefined): Record<string, unknown> | null {
  if (typeof recursos === 'string') {
    try {
      const parsed = JSON.parse(recursos) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  return recursos && typeof recursos === 'object' && !Array.isArray(recursos)
    ? (recursos as Record<string, unknown>)
    : null;
}

function extractNumber(recursos: Record<string, unknown> | null, key: string, fallback: number): number {
  const raw = recursos?.[key];
  return typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 ? raw : fallback;
}

function extractModulos(recursos: Record<string, unknown> | null): PlanoModuloId[] {
  const modulos = recursos?.modulos;
  if (Array.isArray(modulos)) {
    return modulos.filter((modulo): modulo is PlanoModuloId => typeof modulo === 'string');
  }

  const legacy: PlanoModuloId[] = ['cadastros'];
  if (recursos?.financeiro === true) legacy.push('financeiro');
  if (recursos?.blockdomi === true) legacy.push('blockdomi');
  if (recursos?.equipamentos === true) legacy.push('equipamentos');
  if (recursos?.rpki === true) legacy.push('rpki');
  if (recursos?.whatsapp === true) legacy.push('envio_notificacoes');
  if (recursos?.nfse === true) legacy.push('nfse');
  legacy.push('assinatura_digital');
  return [...new Set(legacy)];
}

export class SaasPlanoLimitesService {
  static async getContext(empresaId: number): Promise<SaasPlanoLimitesContext | null> {
    const contrato = await SaasContrato.findOne({
      where: { empresa_id: empresaId, status: 'ativo' },
      include: [{ model: SaasPlano, as: 'plano', required: true }],
      order: [['data_inicio', 'DESC']],
    }) as (SaasContrato & { plano?: SaasPlano }) | null;

    if (!contrato?.plano) {
      return null;
    }

    const recursos = parseRecursos(contrato.plano.recursos);
    return {
      plano: contrato.plano,
      modulos: extractModulos(recursos),
      limiteUsuarios: Math.max(1, Number(contrato.plano.limite_usuarios) || 1),
      limiteEquipamentos: extractNumber(
        recursos,
        'equipamentos_limite_equipamentos',
        DEFAULT_EQUIPAMENTOS_LIMITS.limiteEquipamentos
      ),
      limiteTuneis: extractNumber(
        recursos,
        'equipamentos_limite_tuneis',
        DEFAULT_EQUIPAMENTOS_LIMITS.limiteTuneis
      ),
      limiteBackups: extractNumber(
        recursos,
        'equipamentos_limite_backups',
        DEFAULT_EQUIPAMENTOS_LIMITS.limiteBackups
      ),
    };
  }

  static async validateUsuarioAtivoLimit(
    empresaId: number,
    options: { willBeActive: boolean; excludeUsuarioId?: number } = { willBeActive: true }
  ): Promise<string | null> {
    if (!options.willBeActive) return null;

    const context = await this.getContext(empresaId);
    if (!context) return null;

    const where: Record<string | symbol, unknown> = { empresa_id: empresaId, ativo: true };
    if (options.excludeUsuarioId != null) {
      where.id = { [Op.ne]: options.excludeUsuarioId };
    }

    const count = await Usuario.count({ where });
    if (count >= context.limiteUsuarios) {
      return `Limite de usuários ativos do plano atingido (${context.limiteUsuarios}).`;
    }

    return null;
  }

  static async validateEquipamentosModule(empresaId: number): Promise<string | null> {
    const context = await this.getContext(empresaId);
    if (!context) return null;

    return context.modulos.includes('equipamentos')
      ? null
      : 'O plano não inclui o módulo de equipamentos.';
  }

  static async validateEquipamentoCreate({
    empresaId,
    hasTunel = false,
    hasBackup = false,
  }: EquipamentoLimitCheck): Promise<string | null> {
    const context = await this.getContext(empresaId);
    if (!context) return null;

    if (!context.modulos.includes('equipamentos')) {
      return 'O plano não inclui o módulo de equipamentos.';
    }

    if (context.limiteEquipamentos > 0) {
      const count = await SshDevice.count({ where: { empresa_id: empresaId } });
      if (count >= context.limiteEquipamentos) {
        return `Limite de equipamentos do plano atingido (${context.limiteEquipamentos}).`;
      }
    }

    if (hasTunel && context.limiteTuneis > 0) {
      const countTuneis = await SshDevice.count({
        where: { [Op.and]: [{ empresa_id: empresaId }, literal('agent_id IS NOT NULL')] },
      });
      if (countTuneis >= context.limiteTuneis) {
        return `Limite de túneis do plano atingido (${context.limiteTuneis}).`;
      }
    }

    if (hasBackup && context.limiteBackups > 0) {
      const countBackups = await SshDevice.count({ where: { empresa_id: empresaId, backup_enabled: true } });
      if (countBackups >= context.limiteBackups) {
        return `Limite de backups do plano atingido (${context.limiteBackups}).`;
      }
    }

    return null;
  }

  static async validateEquipamentoUpdate({
    empresaId,
    hasTunel = false,
    hasBackup = false,
    currentHasTunel = false,
    currentHasBackup = false,
  }: EquipamentoUpdateLimitCheck): Promise<string | null> {
    const context = await this.getContext(empresaId);
    if (!context) return null;

    if (!context.modulos.includes('equipamentos')) {
      return 'O plano não inclui o módulo de equipamentos.';
    }

    const isAddingTunel = !currentHasTunel && hasTunel;
    if (isAddingTunel && context.limiteTuneis > 0) {
      const countTuneis = await SshDevice.count({
        where: { [Op.and]: [{ empresa_id: empresaId }, literal('agent_id IS NOT NULL')] },
      });
      if (countTuneis >= context.limiteTuneis) {
        return `Limite de túneis do plano atingido (${context.limiteTuneis}).`;
      }
    }

    const isEnablingBackup = !currentHasBackup && hasBackup;
    if (isEnablingBackup && context.limiteBackups > 0) {
      const countBackups = await SshDevice.count({ where: { empresa_id: empresaId, backup_enabled: true } });
      if (countBackups >= context.limiteBackups) {
        return `Limite de backups do plano atingido (${context.limiteBackups}).`;
      }
    }

    return null;
  }

  static async validateBackupExecution(empresaId: number, backupEnabled: boolean): Promise<string | null> {
    const context = await this.getContext(empresaId);
    if (!context) return null;

    if (!context.modulos.includes('equipamentos')) {
      return 'O plano não inclui o módulo de equipamentos.';
    }

    if (!backupEnabled) {
      return 'Backup não habilitado para este equipamento.';
    }

    if (context.limiteBackups > 0) {
      const countBackups = await SshDevice.count({ where: { empresa_id: empresaId, backup_enabled: true } });
      if (countBackups > context.limiteBackups) {
        return `Quantidade de backups ativos acima do limite do plano (${context.limiteBackups}). Ajuste os equipamentos com backup habilitado.`;
      }
    }

    return null;
  }
}

export default SaasPlanoLimitesService;
