import { WhatsAppService } from '../../comunicacao/WhatsAppService';
import { EmailService } from '../../comunicacao/EmailService';
import { logger } from '../../../utils/logger';

export interface EnvioBoletosConfig {
  antesVencimento?: number[];
  mesmoDia?: boolean;
  depoisVencimento?: number[];
  canais?: ('whatsapp' | 'email')[];
}

export interface EnvioBoletosOptions {
  saas?: boolean;
  empresa_id?: number;
}

interface DetalhesEnvio {
  whatsapp?: { enviadas: number; erros: number };
  email?: { enviadas: number; erros: number };
}

export class EnvioBoletosRoutine {
  async execute(config: EnvioBoletosConfig = {}, options: EnvioBoletosOptions = {}): Promise<{
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

      const { saas = false, empresa_id } = options;

      if (canais.includes('whatsapp')) {
        try {
          const resultado = await WhatsAppService.enviarBoletos(configuracoes, { saas, empresa_id });

          detalhes.whatsapp = {
            enviadas: resultado.mensagensEnviadas,
            erros: resultado.erros
          };
          totalEnviados += resultado.mensagensEnviadas;
          totalErros += resultado.erros;
        } catch (whatsappError) {
          logger.error('Erro no envio via WhatsApp', {
            context: 'EnvioBoletosRoutine',
            error: whatsappError instanceof Error ? whatsappError.message : String(whatsappError)
          });

          detalhes.whatsapp = { enviadas: 0, erros: 1 };
          totalErros += 1;
        }
      }

      if (canais.includes('email')) {
        try {
          const resultado = await EmailService.enviarBoletos(configuracoes, { saas, empresa_id });

          detalhes.email = {
            enviadas: resultado.emailsEnviados,
            erros: resultado.erros
          };
          totalEnviados += resultado.emailsEnviados;
          totalErros += resultado.erros;
        } catch (emailError) {
          logger.error('Erro no envio via Email', {
            context: 'EnvioBoletosRoutine',
            error: emailError instanceof Error ? emailError.message : String(emailError)
          });

          detalhes.email = { enviadas: 0, erros: 1 };
          totalErros += 1;
        }
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
      const errorStack = error instanceof Error ? error.stack : undefined;

      logger.error('=== ERRO GERAL NA ROTINA DE ENVIO DE BOLETOS ===', {
        context: 'EnvioBoletosRoutine',
        error: errorMessage,
        stack: errorStack,
        config: JSON.stringify(config)
      });

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
