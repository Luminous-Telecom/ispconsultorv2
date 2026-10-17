export type EmpresaDefaults = Map<
  number,
  { conta_boleto: number; dia_vencimento_id: number; dia: number }
>;

/**
 * Tabelas saas_titulos, saas_bancos e saas_dias_vencimento não existem no schema.
 * Os carregamentos devolvem vazio.
 */
export class SaasContratoDataLoader {
  static async loadRelatedData(_contratoIds: number[], _empresaToClienteBancoDia: EmpresaDefaults) {
    return {
      titulosEmAbertoPorContrato: new Map<number, Array<{ contrato_id: number | null; data_vencimento: Date }>>(),
      todosTitulosPorContrato: new Map<number, Array<{ contrato_id: number | null; data_vencimento: Date; status?: string }>>(),
    };
  }

  static async loadEmpresaDefaults(_empresaIds: number[]): Promise<EmpresaDefaults> {
    return new Map();
  }
}
