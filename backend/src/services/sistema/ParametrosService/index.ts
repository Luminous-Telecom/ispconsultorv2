import Parametros from '../../../models/sistema/Parametros';
import { createSingletonConfigService } from '../../../utils/createSingletonConfigService';

const parametrosStore = createSingletonConfigService(Parametros, {
  cacheKey: 'parametros:config',
  scopeField: 'empresa_id',
  attributes: [
    'id',
    'validar_cpf_cnpj',
    'validar_cep',
    'titulos_vence_sabado',
    'titulos_vence_domingo',
    'central_assinante_metodo_login',
    'empresa_id',
    'created_at',
    'updated_at',
  ],
  defaults: {
    validar_cpf_cnpj: true,
    validar_cep: false,
    titulos_vence_sabado: false,
    titulos_vence_domingo: false,
    central_assinante_metodo_login: 'cnpj',
  },
});

export class ParametrosService {
  static async get(empresaId: number | null): Promise<Parametros> {
    return parametrosStore.get(empresaId);
  }

  static async update(dados: Partial<Parametros>, empresaId: number | null): Promise<Parametros> {
    return parametrosStore.update(dados, empresaId);
  }
}
