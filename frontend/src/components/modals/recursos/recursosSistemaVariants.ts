import { ParametrosService } from 'services/parametrosService';

export type RecursosSistemaVariant = 'erp';

export interface RecursosSistemaFormBase {
  validar_cpf_cnpj: boolean;
  validar_cep: boolean;
  titulos_vence_sabado: boolean;
  titulos_vence_domingo: boolean;
  central_assinante_metodo_login: string;
  /** Dias após vencimento para suspender contrato. null/0 = desabilitado. */
  dias_suspender_atraso: number | null;
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
} as const;

export const RECURSOS_ERP_INITIAL: RecursosSistemaFormBase = {
  validar_cpf_cnpj: true,
  validar_cep: false,
  titulos_vence_sabado: false,
  titulos_vence_domingo: false,
  central_assinante_metodo_login: 'cnpj',
  dias_suspender_atraso: null,
};
