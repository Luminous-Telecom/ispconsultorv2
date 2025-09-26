import { Op } from 'sequelize';
import Carne from '../../models/Carne';
import CarneParcela from '../../models/CarneParcela';
import Cliente from '../../models/Cliente';

export interface EnvioBoletosConfig {
  dias_antes_vencimento?: number; // Enviar X dias antes do vencimento (padrão: 5)
  incluir_vencidos?: boolean; // Se deve incluir boletos vencidos
  incluir_pagos?: boolean; // Se deve incluir boletos já pagos
  clientes_ids?: number[]; // IDs específicos de clientes (opcional)
  bancos_ids?: number[]; // IDs específicos de bancos (opcional)
  template_email?: string; // Template personalizado do email
  assunto_email?: string; // Assunto personalizado do email
  remetente_email?: string; // Email do remetente
}

export class EnvioBoletosRoutine {
  /**
   * Executa a rotina de envio de boletos por email
   */
  public async execute(config: EnvioBoletosConfig): Promise<any> {
    console.log('Iniciando rotina de envio de boletos...');
    
    const resultado = {
      total_boletos_processados: 0,
      emails_enviados: 0,
      emails_erro: 0,
      detalhes: [] as any[]
    };

    try {
      // Buscar parcelas que devem ter boletos enviados
      const parcelas = await this.buscarParcelasParaEnvio(config);
      resultado.total_boletos_processados = parcelas.length;

      console.log(`Processando ${parcelas.length} boletos para envio...`);

      for (const parcela of parcelas) {
        try {
          const emailEnviado = await this.enviarBoletoPorEmail(parcela, config);
          
          if (emailEnviado) {
            resultado.emails_enviados++;
            resultado.detalhes.push({
              parcela_id: parcela.id,
              cliente_nome: parcela.Carne?.Cliente?.razao_social,
              valor: parcela.valor_parcela,
              vencimento: parcela.data_vencimento,
              status: 'sucesso'
            });
          }
        } catch (error: any) {
          resultado.emails_erro++;
          resultado.detalhes.push({
            parcela_id: parcela.id,
            cliente_nome: parcela.Carne?.Cliente?.razao_social,
            status: 'erro',
            erro: error.message
          });
          console.error(`Erro ao enviar boleto da parcela ${parcela.id}:`, error);
        }
      }

      console.log(`Rotina concluída: ${resultado.emails_enviados} emails enviados, ${resultado.emails_erro} erros`);
      return resultado;

    } catch (error: any) {
      console.error('Erro na rotina de envio de boletos:', error);
      throw error;
    }
  }

  /**
   * Busca parcelas que devem ter boletos enviados
   */
  private async buscarParcelasParaEnvio(config: EnvioBoletosConfig): Promise<CarneParcela[]> {
    const hoje = new Date();
    const diasAntes = config.dias_antes_vencimento || 5;
    
    // Calcular data limite para envio
    const dataLimite = new Date(hoje);
    dataLimite.setDate(dataLimite.getDate() + diasAntes);

    const whereClause: any = {
      status: 'pendente'
    };

    // Filtrar por data de vencimento
    if (config.incluir_vencidos) {
      whereClause.data_vencimento = { [Op.lte]: dataLimite };
    } else {
      whereClause.data_vencimento = { 
        [Op.and]: [
          { [Op.gte]: hoje },
          { [Op.lte]: dataLimite }
        ]
      };
    }

    // Buscar parcelas com informações do carnê e cliente
    const parcelas = await CarneParcela.findAll({
      where: whereClause,
      include: [
        {
          model: Carne,
          as: 'Carne',
          include: [
            {
              model: Cliente,
              as: 'Cliente',
              where: config.clientes_ids && config.clientes_ids.length > 0 
                ? { id: { [Op.in]: config.clientes_ids } }
                : undefined,
              required: true
            }
          ],
          where: config.bancos_ids && config.bancos_ids.length > 0 
            ? { banco_id: { [Op.in]: config.bancos_ids } }
            : undefined,
          required: true
        }
      ]
    });

    return parcelas;
  }

  /**
   * Envia boleto por email para uma parcela específica
   */
  private async enviarBoletoPorEmail(parcela: CarneParcela, config: EnvioBoletosConfig): Promise<boolean> {
    const cliente = parcela.Carne?.Cliente;
    if (!cliente || !cliente.email) {
      throw new Error('Cliente não possui email cadastrado');
    }

    // Gerar URL do boleto
    const boletoUrl = await this.gerarUrlBoleto(parcela);
    
    // Preparar dados do email
    const emailData = {
      to: cliente.email,
      subject: config.assunto_email || `Boleto - Parcela ${parcela.numero_parcela} - ${cliente.razao_social}`,
      template: config.template_email || 'boleto_padrao',
      data: {
        cliente_nome: cliente.razao_social,
        parcela_numero: parcela.numero_parcela,
        valor_parcela: parcela.valor_parcela,
        data_vencimento: parcela.data_vencimento,
        boleto_url: boletoUrl,
        carne_numero: parcela.Carne?.numero_carne
      }
    };

    // Enviar email
    const emailEnviado = await this.enviarEmail(emailData);
    
    if (emailEnviado) {
      // Marcar como enviado (opcional - pode criar uma tabela de logs de envio)
      console.log(`Email enviado para ${cliente.email} - Parcela ${parcela.numero_parcela}`);
    }

    return emailEnviado;
  }

  /**
   * Gera URL do boleto para uma parcela
   */
  private async gerarUrlBoleto(parcela: CarneParcela): Promise<string> {
    // Implementar geração de URL do boleto
    // Por enquanto, retornar uma URL mock
    const baseUrl = process.env.APP_URL || 'http://localhost:3001';
    return `${baseUrl}/api/carnes/${parcela.carne_id}/parcelas/${parcela.id}/boleto`;
  }

  /**
   * Envia email usando serviço de email
   */
  private async enviarEmail(emailData: any): Promise<boolean> {
    try {
      // Implementar envio de email
      // Por enquanto, simular envio
      console.log('Enviando email:', {
        to: emailData.to,
        subject: emailData.subject
      });

      // Simular delay de envio
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simular sucesso (90% de chance)
      return Math.random() > 0.1;
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      return false;
    }
  }

  /**
   * Valida configuração de envio
   */
  private validarConfiguracao(config: EnvioBoletosConfig): void {
    if (config.dias_antes_vencimento && config.dias_antes_vencimento < 0) {
      throw new Error('Dias antes do vencimento deve ser um número positivo');
    }

    if (config.remetente_email && !this.validarEmail(config.remetente_email)) {
      throw new Error('Email do remetente inválido');
    }
  }

  /**
   * Valida formato de email
   */
  private validarEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
