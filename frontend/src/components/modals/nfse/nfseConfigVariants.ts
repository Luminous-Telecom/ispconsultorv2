import type { ApiResponse } from 'types';
import {
  NFSeConfigService,
  type NFSeConfig,
  type NFSeConfigUpdate,
  type NFSeConfigTestAuth,
} from 'services/nfseConfigService';
import {
  SaasNFSeConfigService,
  type SaasNFSeConfigUpdate,
  type SaasNFSeConfigTestAuth,
} from 'services/saas/saasNfseConfigService';

export type NFSeConfigVariant = 'erp' | 'saas';

export interface NFSeConfigApi {
  get(): Promise<ApiResponse<NFSeConfig>>;
  update(data: NFSeConfigUpdate): Promise<ApiResponse<NFSeConfig>>;
  testAuth(data: NFSeConfigTestAuth): Promise<ApiResponse<{ success: boolean; message: string }>>;
}

export interface NFSeConfigVariantConfig {
  queryKey: readonly [string];
  formId: string;
  modalId: string;
  api: NFSeConfigApi;
}

export const NFSE_CONFIG_BY_VARIANT: Record<NFSeConfigVariant, NFSeConfigVariantConfig> = {
  erp: {
    queryKey: ['nfse-config'],
    formId: 'nfse-config-form',
    modalId: 'nfse-modal',
    api: NFSeConfigService,
  },
  saas: {
    queryKey: ['saas-nfse-config'],
    formId: 'saas-nfse-config-form',
    modalId: 'saas-nfse-modal',
    api: {
      get: SaasNFSeConfigService.get,
      update: (data) => SaasNFSeConfigService.update(data as SaasNFSeConfigUpdate),
      testAuth: (data) => SaasNFSeConfigService.testAuth(data as SaasNFSeConfigTestAuth),
    },
  },
};
