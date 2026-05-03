import SaasParametros from '../../../models/saas/SaasParametros';
import { cache } from '../../../utils/cache';

export class SaasParametrosService {
  /**
   * Obter parâmetros (sempre retorna o primeiro registro)
   */
  static async get(): Promise<SaasParametros> {
    const cacheKey = 'saas_saas_parametros:config';
    const cached = cache.get<SaasParametros>(cacheKey);
    if (cached) {
      return cached;
    }

    let parametros = await SaasParametros.findOne({
      attributes: ['id', 'validar_cpf_cnpj', 'validar_cep', 'titulos_vence_sabado', 'titulos_vence_domingo', 'manter_numeros_titulos', 'quantidade_titulos_manter', 'central_assinante_metodo_login', 'dias_atraso_bloqueio', 'dias_desbloqueio_manual', 'created_at', 'updated_at']
    });

    if (!parametros) {
      parametros = await SaasParametros.create({
        validar_cpf_cnpj: true,
        validar_cep: false,
        titulos_vence_sabado: false,
        titulos_vence_domingo: false,
        manter_numeros_titulos: false,
        quantidade_titulos_manter: 12,
        central_assinante_metodo_login: 'cnpj',
        dias_atraso_bloqueio: null,
        dias_desbloqueio_manual: null
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
        manter_numeros_titulos: dados.manter_numeros_titulos ?? false,
        quantidade_titulos_manter: dados.quantidade_titulos_manter ?? 12,
        central_assinante_metodo_login: dados.central_assinante_metodo_login ?? 'cnpj',
        dias_atraso_bloqueio: dados.dias_atraso_bloqueio ?? null,
        dias_desbloqueio_manual: dados.dias_desbloqueio_manual ?? null
      });
    } else {
      await parametros.update(dados);
      await parametros.reload();
    }

    cache.delete('saas_saas_parametros:config');
    return parametros;
  }
}
