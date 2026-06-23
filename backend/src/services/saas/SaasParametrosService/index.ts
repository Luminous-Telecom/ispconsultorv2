import SaasParametros from '../../../models/saas/SaasParametros';
import { createSingletonConfigService } from '../../../utils/createSingletonConfigService';

const saasParametrosStore = createSingletonConfigService(SaasParametros, {
  cacheKey: 'saas_parametros:config',
  attributes: [
    'id',
    'validar_cpf_cnpj',
    'validar_cep',
    'titulos_vence_sabado',
    'titulos_vence_domingo',
    'manter_numeros_titulos',
    'quantidade_titulos_manter',
    'central_assinante_metodo_login',
    'dias_atraso_bloqueio',
    'dias_desbloqueio_manual',
    'created_at',
    'updated_at',
  ],
  defaults: {
    validar_cpf_cnpj: true,
    validar_cep: false,
    titulos_vence_sabado: false,
    titulos_vence_domingo: false,
    manter_numeros_titulos: false,
    quantidade_titulos_manter: 12,
    central_assinante_metodo_login: 'cnpj',
    dias_atraso_bloqueio: null,
    dias_desbloqueio_manual: null,
  },
});

export class SaasParametrosService {
  static async get(): Promise<SaasParametros> {
    return saasParametrosStore.get();
  }

  static async update(dados: Partial<SaasParametros>): Promise<SaasParametros> {
    return saasParametrosStore.update(dados);
  }
}
