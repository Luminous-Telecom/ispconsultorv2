import { prisma } from '../../../db/prisma';
import { SAAS_PLANO_LIMITE_DEFS, type SaasPlanoLimiteRecursoId } from '../../../constants/saasPlanoLimites';
import type { PlanoModuloId } from '../../../constants/planoModulos';

export interface SaasPlanoLimitesContext {
  plano: { id: number } | null;
  modulos: PlanoModuloId[];
  limiteUsuarios: number;
  limites: Record<string, number>;
  limiteEquipamentos: number;
  limiteTuneis: number;
  limiteBackups: number;
}

export interface EquipamentoLimitCheck {
  empresaId: number;
  hasBackup?: boolean;
}

export interface EquipamentoUpdateLimitCheck extends EquipamentoLimitCheck {
  currentHasBackup?: boolean;
}


const LIMIT_COUNTERS: Record<SaasPlanoLimiteRecursoId, (empresaId: number) => Promise<number>> = {
  cadastros_limite_clientes: (empresaId) => prisma.clientes.count({ where: { empresa_id: empresaId } }),
  cadastros_limite_bancos: (empresaId) => prisma.cadastros_bancos.count({ where: { empresa_id: empresaId } }),
  cadastros_limite_contratos: (empresaId) => prisma.contratos.count({ where: { empresa_id: empresaId } }),
  cadastros_limite_planos: (empresaId) => prisma.cadastros_planos.count({ where: { empresa_id: empresaId } }),
  cadastros_limite_modelos_documento: (empresaId) => prisma.documentos_modelo.count({ where: { empresa_id: empresaId } }),
  ixc_provedor_limite_integracoes: (empresaId) => prisma.integracao_ixc_provedor.count({ where: { empresa_id: empresaId } }),
  ordens_servico_limite_ordens_servico: (empresaId) => prisma.ordens_servico.count({ where: { empresa_id: empresaId } }),
  equipamentos_limite_equipamentos: (empresaId) => prisma.ssh_manager_devices.count({ where: { empresa_id: empresaId } }),
  equipamentos_limite_tuneis: (empresaId) => prisma.agent_agents.count({ where: { empresa_id: empresaId } }),
  equipamentos_limite_backups: (empresaId) =>
    prisma.ssh_manager_devices.count({ where: { empresa_id: empresaId, backup_enabled: true } }),
  rpki_limite_cas: (empresaId) => prisma.rpki_cas.count({ where: { empresa_id: empresaId } }),
  rpki_limite_cas_pai: (empresaId) => prisma.rpki_ca_parents.count({ where: { empresa_id: empresaId } }),
  rpki_limite_repositorios: (empresaId) => prisma.rpki_repositories.count({ where: { empresa_id: empresaId } }),
  rpki_limite_roas: (empresaId) => prisma.rpki_roas.count({ where: { empresa_id: empresaId } }),
  rpki_limite_aspas: (empresaId) => prisma.rpki_aspas.count({ where: { empresa_id: empresaId } }),
};

export class SaasPlanoLimitesService {
  static async getContext(_empresaId: number): Promise<SaasPlanoLimitesContext | null> {
    return null;
  }

  static async validateModulo(empresaId: number, modulo: PlanoModuloId, label: string): Promise<string | null> {
    const context = await this.getContext(empresaId);
    if (!context) return null;
    return context.modulos.includes(modulo) ? null : `O plano não inclui o módulo ${label}.`;
  }

  static async validateLimiteCreate(
    empresaId: number | null | undefined,
    recursosKey: SaasPlanoLimiteRecursoId
  ): Promise<string | null> {
    if (empresaId == null) return null;

    const def = SAAS_PLANO_LIMITE_DEFS.find((item) => item.recursosKey === recursosKey);
    if (!def) return null;

    const context = await this.getContext(empresaId);
    if (!context) return null;

    if (!context.modulos.includes(def.modulo)) {
      return `O plano não inclui o módulo ${def.label}.`;
    }

    const limite = context.limites[recursosKey] ?? 0;
    if (limite <= 0) return null;

    const counter = LIMIT_COUNTERS[recursosKey];
    const count = await counter(empresaId);
    if (count >= limite) {
      return `Limite de ${def.label.toLowerCase()} do plano atingido (${limite}).`;
    }

    return null;
  }

  static async validateUsuarioAtivoLimit(
    empresaId: number,
    options: { willBeActive: boolean; excludeUsuarioId?: number } = { willBeActive: true }
  ): Promise<string | null> {
    if (!options.willBeActive) return null;

    const context = await this.getContext(empresaId);
    if (!context) return null;

    const count = await prisma.cadastros_usuarios.count({
      where: {
        empresa_id: empresaId,
        ativo: true,
        ...(options.excludeUsuarioId != null ? { id: { not: options.excludeUsuarioId } } : {}),
      },
    });
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

  static async validateAgentCreate(empresaId: number): Promise<string | null> {
    const context = await this.getContext(empresaId);
    if (!context) return null;

    if (!context.modulos.includes('equipamentos')) {
      return 'O plano não inclui o módulo de equipamentos.';
    }

    if (context.limiteTuneis > 0) {
      const countAgents = await prisma.agent_agents.count({ where: { empresa_id: empresaId } });
      if (countAgents >= context.limiteTuneis) {
        return `Limite de agentes do plano atingido (${context.limiteTuneis}).`;
      }
    }

    return null;
  }

  static async validateEquipamentoCreate({
    empresaId,
    hasBackup = false,
  }: EquipamentoLimitCheck): Promise<string | null> {
    const context = await this.getContext(empresaId);
    if (!context) return null;

    if (!context.modulos.includes('equipamentos')) {
      return 'O plano não inclui o módulo de equipamentos.';
    }

    if (context.limiteEquipamentos > 0) {
      const count = await prisma.ssh_manager_devices.count({ where: { empresa_id: empresaId } });
      if (count >= context.limiteEquipamentos) {
        return `Limite de equipamentos do plano atingido (${context.limiteEquipamentos}).`;
      }
    }

    if (hasBackup && context.limiteBackups > 0) {
      const countBackups = await prisma.ssh_manager_devices.count({ where: { empresa_id: empresaId, backup_enabled: true } });
      if (countBackups >= context.limiteBackups) {
        return `Limite de backups do plano atingido (${context.limiteBackups}).`;
      }
    }

    return null;
  }

  static async validateEquipamentoUpdate({
    empresaId,
    hasBackup = false,
    currentHasBackup = false,
  }: EquipamentoUpdateLimitCheck): Promise<string | null> {
    const context = await this.getContext(empresaId);
    if (!context) return null;

    if (!context.modulos.includes('equipamentos')) {
      return 'O plano não inclui o módulo de equipamentos.';
    }

    const isEnablingBackup = !currentHasBackup && hasBackup;
    if (isEnablingBackup && context.limiteBackups > 0) {
      const countBackups = await prisma.ssh_manager_devices.count({ where: { empresa_id: empresaId, backup_enabled: true } });
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
      const countBackups = await prisma.ssh_manager_devices.count({ where: { empresa_id: empresaId, backup_enabled: true } });
      if (countBackups > context.limiteBackups) {
        return `Quantidade de backups ativos acima do limite do plano (${context.limiteBackups}). Ajuste os equipamentos com backup habilitado.`;
      }
    }

    return null;
  }
}

export default SaasPlanoLimitesService;
