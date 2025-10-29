import { WhatsAppService } from '../WhatsAppService';
import { logger } from '../../utils/logger';

export interface EnvioBoletosConfig {
  antesVencimento?: number[]; // Array de dias antes do vencimento (ex: [10, 5])
  mesmoDia?: boolean; // Enviar no mesmo dia do vencimento
  depoisVencimento?: number[]; // Array de dias depois do vencimento (ex: [5, 10, 15])
}

export class EnvioBoletosRoutine {
  async execute(config: EnvioBoletosConfig = {}): Promise<{
    success: boolean;
    message: string;
    data: {
      parcelasProcessadas: number;
      boletosEnviados: number;
      erros: number;
    };
  }> {
    try {
      // Usar configurações padrão se não fornecido ou vazio
      const configuracoes = {
        antesVencimento: (config?.antesVencimento?.length ?? 0) > 0 ? config.antesVencimento : [10, 5],
        mesmoDia: config?.mesmoDia ?? true,
        depoisVencimento: (config?.depoisVencimento?.length ?? 0) > 0 ? config.depoisVencimento : [5, 10, 15]
      };

      // Executar envio via WhatsAppService
      const resultado = await WhatsAppService.enviarBoletos(configuracoes);

      return {
        success: resultado.sucesso,
        message: `Envio de boletos executado: ${resultado.mensagensEnviadas} mensagens enviadas, ${resultado.erros} erros`,
        data: {
          parcelasProcessadas: resultado.mensagensEnviadas,
          boletosEnviados: resultado.mensagensEnviadas,
          erros: resultado.erros
        }
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao executar envio de boletos:', error);
      
      return {
        success: false,
        message: `Erro ao enviar boletos: ${errorMessage}`,
        data: {
          parcelasProcessadas: 0,
          boletosEnviados: 0,
          erros: 1
        }
      };
    }
  }
}
