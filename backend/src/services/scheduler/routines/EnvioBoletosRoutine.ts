import { WhatsAppService } from '../../comunicacao/WhatsAppService';
import { EmailService } from '../../comunicacao/EmailService';
import { logger } from '../../../utils/logger';
import { prisma } from '../../../db/prisma';

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
  /**
   * ERP global (SaaS alvo erp_global): sem empresa_id → percorre todos os tenants.
   * SaaS cobrança: saas=true. ERP por tenant: passa empresa_id.
   */
  private async resolveEmpresaIds(options: EnvioBoletosOptions): Promise<Array<number | undefined>> {
    const { saas = false, empresa_id } = options;
    if (saas) {
      return [undefined];
    }
    if (empresa_id != null && empresa_id > 0) {
      return [empresa_id];
    }
    const empresas = await prisma.sistema_tenants.findMany({
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    const ids = empresas.map((e) => e.id).filter((id): id is number => id != null && id > 0);
    if (ids.length === 0) {
      logger.warn('EnvioBoletosRoutine - Nenhuma empresa encontrada para envio ERP global', {
        context: 'EnvioBoletosRoutine'
      });
    }
    return ids;
  }

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
        antesVencimento: (config?.antesVencimento?.length ?? 0) > 0 ? config.antesVencimento : [10, 5, 2],
        mesmoDia: config?.mesmoDia ?? true,
        depoisVencimento: (config?.depoisVencimento?.length ?? 0) > 0 ? config.depoisVencimento : [1, 5, 10, 15]
      };

      const canais = config?.canais || ['whatsapp', 'email'];
      const detalhes: DetalhesEnvio = {};
      let totalEnviados = 0;
      let totalErros = 0;

      const { saas = false } = options;
      const empresaIds = await this.resolveEmpresaIds(options);

      for (const empresaId of empresaIds) {
        if (canais.includes('whatsapp')) {
          try {
            const resultado = await WhatsAppService.enviarBoletos(configuracoes, {
              saas,
              empresa_id: empresaId
            });

            detalhes.whatsapp = {
              enviadas: (detalhes.whatsapp?.enviadas ?? 0) + resultado.mensagensEnviadas,
              erros: (detalhes.whatsapp?.erros ?? 0) + resultado.erros
            };
            totalEnviados += resultado.mensagensEnviadas;
            totalErros += resultado.erros;
          } catch (whatsappError) {
            logger.error('Erro no envio via WhatsApp', {
              context: 'EnvioBoletosRoutine',
              empresa_id: empresaId,
              error: whatsappError instanceof Error ? whatsappError.message : String(whatsappError)
            });

            detalhes.whatsapp = {
              enviadas: detalhes.whatsapp?.enviadas ?? 0,
              erros: (detalhes.whatsapp?.erros ?? 0) + 1
            };
            totalErros += 1;
          }
        }

        if (canais.includes('email')) {
          try {
            const resultado = await EmailService.enviarBoletos(configuracoes, {
              saas,
              empresa_id: empresaId
            });

            detalhes.email = {
              enviadas: (detalhes.email?.enviadas ?? 0) + resultado.emailsEnviados,
              erros: (detalhes.email?.erros ?? 0) + resultado.erros
            };
            totalEnviados += resultado.emailsEnviados;
            totalErros += resultado.erros;
          } catch (emailError) {
            logger.error('Erro no envio via Email', {
              context: 'EnvioBoletosRoutine',
              empresa_id: empresaId,
              error: emailError instanceof Error ? emailError.message : String(emailError)
            });

            detalhes.email = {
              enviadas: detalhes.email?.enviadas ?? 0,
              erros: (detalhes.email?.erros ?? 0) + 1
            };
            totalErros += 1;
          }
        }
      }

      return {
        success: totalErros === 0,
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
