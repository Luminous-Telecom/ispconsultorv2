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
    logger.info('=== INICIANDO ROTINA DE ENVIO DE BOLETOS ===', {
      context: 'EnvioBoletosRoutine',
      config: JSON.stringify(config)
    });

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

      logger.info('Configurações da rotina de envio de boletos', {
        context: 'EnvioBoletosRoutine',
        configuracoes: JSON.stringify(configuracoes),
        canais: JSON.stringify(canais)
      });

      if (canais.includes('whatsapp')) {
        try {
          logger.info('Iniciando envio de boletos via WhatsApp', {
            context: 'EnvioBoletosRoutine'
          });

          const resultado = await WhatsAppService.enviarBoletos(configuracoes);

          logger.info('Resultado envio WhatsApp', {
            context: 'EnvioBoletosRoutine',
            mensagensEnviadas: resultado.mensagensEnviadas,
            erros: resultado.erros,
            sucesso: resultado.sucesso
          });

          detalhes.whatsapp = {
            enviadas: resultado.mensagensEnviadas,
            erros: resultado.erros
          };
          totalEnviados += resultado.mensagensEnviadas;
          totalErros += resultado.erros;
        } catch (whatsappError) {
          logger.error('Erro específico no envio via WhatsApp', {
            context: 'EnvioBoletosRoutine',
            error: whatsappError instanceof Error ? whatsappError.message : String(whatsappError),
            stack: whatsappError instanceof Error ? whatsappError.stack : undefined
          });

          detalhes.whatsapp = { enviadas: 0, erros: 1 };
          totalErros += 1;
        }
      }

      if (canais.includes('email')) {
        try {
          logger.info('Iniciando envio de boletos via Email', {
            context: 'EnvioBoletosRoutine'
          });

          const resultado = await EmailService.enviarBoletos(configuracoes);

          logger.info('Resultado envio Email', {
            context: 'EnvioBoletosRoutine',
            emailsEnviados: resultado.emailsEnviados,
            erros: resultado.erros,
            sucesso: resultado.sucesso
          });

          detalhes.email = {
            enviadas: resultado.emailsEnviados,
            erros: resultado.erros
          };
          totalEnviados += resultado.emailsEnviados;
          totalErros += resultado.erros;
        } catch (emailError) {
          logger.error('Erro específico no envio via Email', {
            context: 'EnvioBoletosRoutine',
            error: emailError instanceof Error ? emailError.message : String(emailError),
            stack: emailError instanceof Error ? emailError.stack : undefined
          });

          detalhes.email = { enviadas: 0, erros: 1 };
          totalErros += 1;
        }
      }

      const resultadoFinal = {
        success: totalEnviados > 0,
        message: `Envio de boletos executado: ${totalEnviados} boletos enviados, ${totalErros} erros`,
        data: {
          parcelasProcessadas: totalEnviados,
          boletosEnviados: totalEnviados,
          erros: totalErros,
          detalhes
        }
      };

      logger.info('=== ROTINA DE ENVIO DE BOLETOS CONCLUÍDA ===', {
        context: 'EnvioBoletosRoutine',
        resultado: JSON.stringify(resultadoFinal)
      });

      return resultadoFinal;
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
