import { Op } from 'sequelize';
import { SAAS_PLANO_LIMITE_DEFS, type SaasPlanoLimiteRecursoId } from '../../../constants/saasPlanoLimites';
import {
  appendLegacyIxcProvedorModulo,
  readLimiteFromRecursos,
} from '../../../utils/saasPlanoLimiteRecursosUtils';
import { Usuario } from '../../../models/cadastros/Usuario';
import { Banco } from '../../../models/cadastros/Banco';
import { Plano } from '../../../models/cadastros/Plano';
import { Cliente } from '../../../models/clientes/Cliente';
import { Contrato } from '../../../models/contratos/Contrato';
import { ModeloDocumento } from '../../../models/documentos/ModeloDocumento';
import { IntegracaoIxcProvedor } from '../../../models/integracao/IntegracaoIxcProvedor';
import { OrdemServicoLocal } from '../../../models/ordens/OrdemServicoLocal';
import { Agent } from '../../../models/agent/Agent';
import { SshDevice } from '../../../models/ssh-manager/SshDevice';
import { RpkiCa } from '../../../models/rpki/RpkiCa';
import { RpkiCaParent } from '../../../models/rpki/RpkiCaParent';
import { RpkiRepository } from '../../../models/rpki/RpkiRepository';
import { RpkiRoa } from '../../../models/rpki/RpkiRoa';
import { RpkiAspa } from '../../../models/rpki/RpkiAspa';
import { SaasContrato } from '../../../models/saas/SaasContrato';
import { SaasPlano } from '../../../models/saas/SaasPlano';
import type { PlanoModuloId } from '../../../constants/planoModulos';

export interface SaasPlanoLimitesContext {
  plano: SaasPlano;
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
  let result: PlanoModuloId[];
  if (Array.isArray(modulos)) {
    result = modulos.filter((modulo): modulo is PlanoModuloId => typeof modulo === 'string');
  } else {
    const legacy: PlanoModuloId[] = ['cadastros'];
    if (recursos?.financeiro === true) legacy.push('financeiro');
    if (recursos?.blockdomi === true) legacy.push('blockdomi');
    if (recursos?.equipamentos === true) legacy.push('equipamentos');
    if (recursos?.rpki === true) legacy.push('rpki');
    if (recursos?.whatsapp === true) legacy.push('envio_notificacoes');
    if (recursos?.nfse === true) legacy.push('nfse');
    legacy.push('assinatura_digital');
    result = [...new Set(legacy)];
  }
  return appendLegacyIxcProvedorModulo(result, recursos);
}

const LIMIT_COUNTERS: Record<SaasPlanoLimiteRecursoId, (empresaId: number) => Promise<number>> = {
  cadastros_limite_clientes: (empresaId) => Cliente.count({ where: { empresa_id: empresaId } }),
  cadastros_limite_bancos: (empresaId) => Banco.count({ where: { empresa_id: empresaId } }),
  cadastros_limite_contratos: (empresaId) => Contrato.count({ where: { empresa_id: empresaId } }),
  cadastros_limite_planos: (empresaId) => Plano.count({ where: { empresa_id: empresaId } }),
  cadastros_limite_modelos_documento: (empresaId) => ModeloDocumento.count({ where: { empresa_id: empresaId } }),
  ixc_provedor_limite_integracoes: (empresaId) => IntegracaoIxcProvedor.count({ where: { empresa_id: empresaId } }),
  ixc_provedor_limite_ordens_servico: (empresaId) => OrdemServicoLocal.count({ where: { empresa_id: empresaId } }),
  equipamentos_limite_equipamentos: (empresaId) => SshDevice.count({ where: { empresa_id: empresaId } }),
  equipamentos_limite_tuneis: (empresaId) => Agent.count({ where: { empresa_id: empresaId } }),
  equipamentos_limite_backups: (empresaId) =>
    SshDevice.count({ where: { empresa_id: empresaId, backup_enabled: true } }),
  rpki_limite_cas: (empresaId) => RpkiCa.count({ where: { empresa_id: empresaId } }),
  rpki_limite_cas_pai: (empresaId) => RpkiCaParent.count({ where: { empresa_id: empresaId } }),
  rpki_limite_repositorios: (empresaId) => RpkiRepository.count({ where: { empresa_id: empresaId } }),
  rpki_limite_roas: (empresaId) => RpkiRoa.count({ where: { empresa_id: empresaId } }),
  rpki_limite_aspas: (empresaId) => RpkiAspa.count({ where: { empresa_id: empresaId } }),
};

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
    const limites: Record<string, number> = {};
    for (const def of SAAS_PLANO_LIMITE_DEFS) {
      limites[def.recursosKey] = readLimiteFromRecursos(recursos, def.recursosKey, 0);
    }
    return {
      plano: contrato.plano,
      modulos: extractModulos(recursos),
      limiteUsuarios: Math.max(1, Number(contrato.plano.limite_usuarios) || 1),
      limites,
      limiteEquipamentos: limites.equipamentos_limite_equipamentos ?? 0,
      limiteTuneis: limites.equipamentos_limite_tuneis ?? 0,
      limiteBackups: limites.equipamentos_limite_backups ?? 0,
    };
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

  static async validateAgentCreate(empresaId: number): Promise<string | null> {
    const context = await this.getContext(empresaId);
    if (!context) return null;

    if (!context.modulos.includes('equipamentos')) {
      return 'O plano não inclui o módulo de equipamentos.';
    }

    if (context.limiteTuneis > 0) {
      const countAgents = await Agent.count({ where: { empresa_id: empresaId } });
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
      const count = await SshDevice.count({ where: { empresa_id: empresaId } });
      if (count >= context.limiteEquipamentos) {
        return `Limite de equipamentos do plano atingido (${context.limiteEquipamentos}).`;
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
