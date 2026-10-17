import type { ModalType } from 'contexts/ModalContext';
import type { TranslationKeys } from 'contexts/I18nContext';
import type { LogsModalType } from './logsModal/types';

export interface ResolvedLogsModal {
  titleKey: keyof TranslationKeys;
  logType: LogsModalType;
  variant: 'erp';
}

type ModalId = Exclude<ModalType, null>;

/**
 * Mapeia id do modal → tipo de log + origem ERP vs SaaS (sem inferência por URL).
 */
const LOG_MODAL_BY_ID: Partial<Record<ModalId, ResolvedLogsModal>> = {
  // ERP
  'logs-usuarios': { titleKey: 'logs.usuarios', logType: 'usuarios', variant: 'erp' },
  'logs-email': { titleKey: 'logs.email', logType: 'email', variant: 'erp' },
  'logs-whatsapp': { titleKey: 'logs.whatsapp', logType: 'whatsapp', variant: 'erp' },
  'logs-assinatura-digital': { titleKey: 'logs.assinaturaDigital', logType: 'assinatura-digital', variant: 'erp' },
  'logs-acesso-sistema': { titleKey: 'logs.acessoSistema', logType: 'acesso-sistema', variant: 'erp' },
  'logs-equipamentos': { titleKey: 'logs.equipamentos', logType: 'equipamentos', variant: 'erp' },
  'logs-agentes': { titleKey: 'logs.agentes', logType: 'agentes', variant: 'erp' },
  'logs-blockdomi-api': { titleKey: 'blockdomi.logsApi', logType: 'blockdomi-api', variant: 'erp' },
};

export function resolveLogsModal(active: ModalType | null): ResolvedLogsModal | null {
  if (!active) return null;
  return LOG_MODAL_BY_ID[active] ?? null;
}
