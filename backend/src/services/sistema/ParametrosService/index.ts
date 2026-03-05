import Parametros from '../../../models/sistema/Parametros';
import { cache } from '../../../utils/cache';

export class ParametrosService {
  /**
   * Obter parâmetros da empresa (ou global se empresaId null)
   */
  static async get(empresaId: number | null): Promise<Parametros> {
    const cacheKey = `parametros:config:${empresaId ?? 'global'}`;
    const cached = cache.get<Parametros>(cacheKey);
    if (cached) {
      return cached;
    }

    const where = { empresa_id: empresaId };

    let parametros = await Parametros.findOne({
      where,
      attributes: ['id', 'validar_cpf_cnpj', 'validar_cep', 'titulos_vence_sabado', 'titulos_vence_domingo', 'central_assinante_metodo_login', 'empresa_id', 'created_at', 'updated_at']
    });

    if (!parametros) {
      parametros = await Parametros.create({
        validar_cpf_cnpj: true,
        validar_cep: false,
        titulos_vence_sabado: false,
        titulos_vence_domingo: false,
        central_assinante_metodo_login: 'cnpj',
        empresa_id: empresaId
      } as any);
    }

    cache.set(cacheKey, parametros, 600000);
    return parametros;
  }

  /**
   * Atualizar parâmetros da empresa
   */
  static async update(dados: Partial<Parametros>, empresaId: number | null): Promise<Parametros> {
    const where = { empresa_id: empresaId };

    let parametros = await Parametros.findOne({ where });

    if (!parametros) {
      parametros = await Parametros.create({
        validar_cpf_cnpj: dados.validar_cpf_cnpj ?? true,
        validar_cep: dados.validar_cep ?? false,
        titulos_vence_sabado: dados.titulos_vence_sabado ?? false,
        titulos_vence_domingo: dados.titulos_vence_domingo ?? false,
        central_assinante_metodo_login: (dados as any).central_assinante_metodo_login ?? 'cnpj',
        empresa_id: empresaId
      } as any);
    } else {
      await parametros.update({ ...dados, empresa_id: empresaId });
      await parametros.reload();
    }

    cache.delete(`parametros:config:${empresaId ?? 'global'}`);
    return parametros;
  }
}

