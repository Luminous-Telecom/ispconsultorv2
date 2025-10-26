// TODO: Implementar quando os modelos Carne e CarneParcela estiverem disponíveis
export interface RemessaBancariaConfig {
  bancos_ids?: number[]; // IDs específicos de bancos (opcional)
  incluir_vencidos?: boolean; // Se deve incluir boletos vencidos
  incluir_pagos?: boolean; // Se deve incluir boletos já pagos
  clientes_ids?: number[]; // IDs específicos de clientes (opcional)
}

export class RemessaBancariaRoutine {
  async execute(_config: RemessaBancariaConfig): Promise<{
    success: boolean;
    message: string;
    data: {
      parcelasProcessadas: number;
      remessasGeradas: number;
      erros: number;
    };
  }> {
    return {
      success: true,
      message: 'Rotina de remessa bancária não implementada - modelos Carne e CarneParcela não disponíveis',
      data: {
        parcelasProcessadas: 0,
        remessasGeradas: 0,
        erros: 0
      }
    };
  }
}
