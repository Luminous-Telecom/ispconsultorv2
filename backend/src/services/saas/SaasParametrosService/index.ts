import SaasParametros from '../../../models/saas/SaasParametros';
import { cache } from '../../../utils/cache';

export class SaasParametrosService {
  /**
   * Obter parâmetros (sempre retorna o primeiro registro)
   */
  static async get(): Promise<SaasParametros> {
    const cacheKey = 'saas_parametros:config';
    const cached = cache.get<SaasParametros>(cacheKey);
    if (cached) {
      return cached;
    }

    let parametros = await SaasParametros.findOne({
      attributes: ['id', 'validar_cpf_cnpj', 'validar_cep', 'titulos_vence_sabado', 'titulos_vence_domingo', 'central_assinante_metodo_login', 'created_at', 'updated_at']
    });

    if (!parametros) {
      parametros = await SaasParametros.create({
        validar_cpf_cnpj: true,
        validar_cep: false,
        titulos_vence_sabado: false,
        titulos_vence_domingo: false,
        central_assinante_metodo_login: 'cnpj'
      });
    }

    cache.set(cacheKey, parametros, 600000);
    return parametros;
  }

  /**
   * Atualizar parâmetros
   */
  static async update(dados: Partial<SaasParametros>): Promise<SaasParametros> {
    let parametros = await SaasParametros.findOne();

    if (!parametros) {
      parametros = await SaasParametros.create({
        validar_cpf_cnpj: dados.validar_cpf_cnpj ?? true,
        validar_cep: dados.validar_cep ?? false,
        titulos_vence_sabado: dados.titulos_vence_sabado ?? false,
        titulos_vence_domingo: dados.titulos_vence_domingo ?? false,
        central_assinante_metodo_login: dados.central_assinante_metodo_login ?? 'cnpj'
      });
    } else {
      await parametros.update(dados);
      await parametros.reload();
    }

    cache.delete('saas_parametros:config');
    return parametros;
  }
}
