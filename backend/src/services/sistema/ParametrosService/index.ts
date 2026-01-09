import Parametros from '../../../models/sistema/Parametros';

export class ParametrosService {
  /**
   * Obter parâmetros (sempre retorna o primeiro registro)
   */
  static async get(): Promise<Parametros> {
    let parametros = await Parametros.findOne({
      attributes: ['id', 'validar_cpf_cnpj', 'validar_cep', 'titulos_vence_sabado', 'titulos_vence_domingo', 'auto_lancamento_titulos', 'total_titulos_financeiro', 'created_at', 'updated_at']
    });

    // Se não existir, criar com valores padrão
    if (!parametros) {
      parametros = await Parametros.create({
        validar_cpf_cnpj: true,
        validar_cep: false,
        titulos_vence_sabado: false,
        titulos_vence_domingo: false,
        auto_lancamento_titulos: false,
        total_titulos_financeiro: 12
      });
    }

    return parametros;
  }

  /**
   * Atualizar parâmetros
   */
  static async update(dados: Partial<Parametros>): Promise<Parametros> {
    let parametros = await Parametros.findOne();

    if (!parametros) {
      parametros = await Parametros.create({
        validar_cpf_cnpj: dados.validar_cpf_cnpj ?? true,
        validar_cep: dados.validar_cep ?? false,
        titulos_vence_sabado: dados.titulos_vence_sabado ?? false,
        titulos_vence_domingo: dados.titulos_vence_domingo ?? false,
        auto_lancamento_titulos: dados.auto_lancamento_titulos ?? false,
        total_titulos_financeiro: dados.total_titulos_financeiro ?? 12
      });
    } else {
      await parametros.update(dados);
      await parametros.reload();
    }

    return parametros;
  }
}

