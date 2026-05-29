import { ParametrosService } from 'services/parametrosService';
import {
  SaasParametrosService,
  type SaasParametros,
} from 'services/saas/saasParametrosService';

export type RecursosSistemaVariant = 'erp' | 'saas';

export interface RecursosSistemaFormBase {
  validar_cpf_cnpj: boolean;
  validar_cep: boolean;
  titulos_vence_sabado: boolean;
  titulos_vence_domingo: boolean;
  central_assinante_metodo_login: string;
}

export interface RecursosSistemaFormSaas extends RecursosSistemaFormBase {
  manter_numeros_titulos: boolean;
  quantidade_titulos_manter: number;
  dias_atraso_bloqueio: number | null;
  dias_desbloqueio_manual: number | null;
}

export const RECURSOS_SISTEMA_BY_VARIANT = {
  erp: {
    queryKey: ['parametros'] as const,
    formId: 'recursos-sistema-form',
    modalId: 'recursos-sistema-modal',
    title: 'Recursos do Sistema',
    api: {
      get: () => ParametrosService.get(),
      update: (data: Partial<RecursosSistemaFormBase>) => ParametrosService.update(data),
    },
  },
  saas: {
    queryKey: ['saas-parametros'] as const,
    formId: 'saas-recursos-sistema-form',
    modalId: 'saas-recursos-sistema-modal',
    title: 'Recursos do Sistema',
    api: {
      get: () => SaasParametrosService.get(),
      update: (data: Partial<RecursosSistemaFormSaas>) => SaasParametrosService.update(data),
    },
  },
} as const;

export const RECURSOS_ERP_INITIAL: RecursosSistemaFormBase = {
  validar_cpf_cnpj: true,
  validar_cep: false,
  titulos_vence_sabado: false,
  titulos_vence_domingo: false,
  central_assinante_metodo_login: 'cnpj',
};

export const RECURSOS_SAAS_INITIAL: RecursosSistemaFormSaas = {
  ...RECURSOS_ERP_INITIAL,
  manter_numeros_titulos: false,
  quantidade_titulos_manter: 12,
  dias_atraso_bloqueio: null,
  dias_desbloqueio_manual: null,
};

export function mapSaasParametrosToForm(
  d: SaasParametros,
  base: RecursosSistemaFormBase
): RecursosSistemaFormSaas {
  const qtd = d.quantidade_titulos_manter ?? 12;
  return {
    ...base,
    manter_numeros_titulos: d.manter_numeros_titulos ?? false,
    quantidade_titulos_manter: Math.min(24, Math.max(1, qtd)),
    dias_atraso_bloqueio: d.dias_atraso_bloqueio ?? null,
    dias_desbloqueio_manual: d.dias_desbloqueio_manual ?? null,
  };
}
