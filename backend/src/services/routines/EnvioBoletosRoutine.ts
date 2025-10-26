// TODO: Implementar quando os modelos Carne e CarneParcela estiverem disponíveis
export interface EnvioBoletosConfig {
  dias_antes_vencimento?: number; // Enviar X dias antes do vencimento (padrão: 5)
  incluir_vencidos?: boolean; // Se deve incluir boletos vencidos
  incluir_pagos?: boolean; // Se deve incluir boletos já pagos
  clientes_ids?: number[]; // IDs específicos de clientes (opcional)
  bancos_ids?: number[]; // IDs específicos de bancos (opcional)
}

export class EnvioBoletosRoutine {
  async execute(_config: EnvioBoletosConfig): Promise<{
    success: boolean;
    message: string;
    data: {
      parcelasProcessadas: number;
      boletosEnviados: number;
      erros: number;
    };
  }> {
    return {
      success: true,
      message: 'Rotina de envio de boletos não implementada - modelos Carne e CarneParcela não disponíveis',
      data: {
        parcelasProcessadas: 0,
        boletosEnviados: 0,
        erros: 0
      }
    };
  }
}
