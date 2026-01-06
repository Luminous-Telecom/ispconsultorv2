import { WhatsAppService } from '../../comunicacao/WhatsAppService';
import { EmailService } from '../../comunicacao/EmailService';
import { logger } from '../../../utils/logger';

export interface EnvioBoletosConfig {
  antesVencimento?: number[];
  mesmoDia?: boolean;
  depoisVencimento?: number[];
  canais?: ('whatsapp' | 'email')[];
}

interface DetalhesEnvio {
  whatsapp?: { enviadas: number; erros: number };
  email?: { enviadas: number; erros: number };
}

export class EnvioBoletosRoutine {
  async execute(config: EnvioBoletosConfig = {}): Promise<{
    success: boolean;
    message: string;
    data: {
      parcelasProcessadas: number;
      boletosEnviados: number;
      erros: number;
      detalhes: {
        whatsapp?: { enviadas: number; erros: number };
        email?: { enviadas: number; erros: number };
      };
    };
  }> {
    try {
      const configuracoes = {
        antesVencimento: (config?.antesVencimento?.length ?? 0) > 0 ? config.antesVencimento : [10, 5],
        mesmoDia: config?.mesmoDia ?? true,
        depoisVencimento: (config?.depoisVencimento?.length ?? 0) > 0 ? config.depoisVencimento : [5, 10, 15]
      };

      const canais = config?.canais || ['whatsapp', 'email'];
      const detalhes: DetalhesEnvio = {};
      let totalEnviados = 0;
      let totalErros = 0;

      if (canais.includes('whatsapp')) {
        const resultado = await WhatsAppService.enviarBoletos(configuracoes);
        detalhes.whatsapp = {
          enviadas: resultado.mensagensEnviadas,
          erros: resultado.erros
        };
        totalEnviados += resultado.mensagensEnviadas;
        totalErros += resultado.erros;
      }

      if (canais.includes('email')) {
        const resultado = await EmailService.enviarBoletos(configuracoes);
        detalhes.email = {
          enviadas: resultado.emailsEnviados,
          erros: resultado.erros
        };
        totalEnviados += resultado.emailsEnviados;
        totalErros += resultado.erros;
      }

      return {
        success: totalEnviados > 0,
        message: `Envio de boletos executado: ${totalEnviados} boletos enviados, ${totalErros} erros`,
        data: {
          parcelasProcessadas: totalEnviados,
          boletosEnviados: totalEnviados,
          erros: totalErros,
          detalhes
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Erro ao executar envio de boletos:', error);
      
      return {
        success: false,
        message: `Erro ao enviar boletos: ${errorMessage}`,
        data: {
          parcelasProcessadas: 0,
          boletosEnviados: 0,
          erros: 1,
          detalhes: {}
        }
      };
    }
  }
}
