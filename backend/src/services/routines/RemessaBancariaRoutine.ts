import { Op } from 'sequelize';
import Carne from '../../models/Carne';
import CarneParcela from '../../models/CarneParcela';
import Banco from '../../models/Banco';
import { BancoApiService } from '../BancoApiService';

export interface RemessaBancariaConfig {
  bancos_ids?: number[]; // IDs específicos de bancos (opcional)
  incluir_vencidos?: boolean; // Se deve incluir boletos vencidos
  incluir_pagos?: boolean; // Se deve incluir boletos já pagos
  dias_vencimento_minimo?: number; // Mínimo de dias para vencimento
  dias_vencimento_maximo?: number; // Máximo de dias para vencimento
  valor_minimo?: number; // Valor mínimo da parcela
  valor_maximo?: number; // Valor máximo da parcela
  formato_arquivo?: 'txt' | 'xml' | 'json'; // Formato do arquivo de remessa
  incluir_boletos_nao_registrados?: boolean; // Incluir boletos não registrados no banco
}

export class RemessaBancariaRoutine {
  /**
   * Executa a rotina de geração de remessas bancárias
   */
  public async execute(config: RemessaBancariaConfig): Promise<any> {
    console.log('Iniciando rotina de geração de remessas bancárias...');
    
    const resultado = {
      total_remessas_geradas: 0,
      total_boletos_processados: 0,
      boletos_erro: 0,
      detalhes: [] as any[]
    };

    try {
      // Buscar bancos para processar
      const bancos = await this.buscarBancos(config);
      
      for (const banco of bancos) {
        try {
          const remessaResultado = await this.gerarRemessaParaBanco(banco, config);
          
          resultado.total_remessas_geradas++;
          resultado.total_boletos_processados += remessaResultado.total_boletos;
          resultado.boletos_erro += remessaResultado.boletos_erro;
          
          resultado.detalhes.push({
            banco_id: banco.id,
            banco_nome: banco.nome,
            total_boletos: remessaResultado.total_boletos,
            boletos_erro: remessaResultado.boletos_erro,
            arquivo_gerado: remessaResultado.arquivo_gerado,
            status: 'sucesso'
          });
        } catch (error: any) {
          resultado.detalhes.push({
            banco_id: banco.id,
            banco_nome: banco.nome,
            status: 'erro',
            erro: error.message
          });
          console.error(`Erro ao gerar remessa para banco ${banco.id}:`, error);
        }
      }

      console.log(`Rotina concluída: ${resultado.total_remessas_geradas} remessas geradas, ${resultado.total_boletos_processados} boletos processados`);
      return resultado;

    } catch (error: any) {
      console.error('Erro na rotina de remessas bancárias:', error);
      throw error;
    }
  }

  /**
   * Busca bancos para processar remessas
   */
  private async buscarBancos(config: RemessaBancariaConfig): Promise<Banco[]> {
    const whereClause: any = { ativo: true };

    if (config.bancos_ids && config.bancos_ids.length > 0) {
      whereClause.id = { [Op.in]: config.bancos_ids };
    }

    const bancos = await Banco.findAll({
      where: whereClause
    });

    return bancos;
  }

  /**
   * Gera remessa para um banco específico
   */
  private async gerarRemessaParaBanco(banco: Banco, config: RemessaBancariaConfig): Promise<any> {
    console.log(`Gerando remessa para banco: ${banco.nome}`);

    // Buscar carnês do banco que precisam ser incluídos na remessa
    const carnes = await this.buscarCarnesParaRemessa(banco.id, config);
    
    if (carnes.length === 0) {
      console.log(`Nenhum carnê encontrado para remessa do banco ${banco.nome}`);
      return {
        total_boletos: 0,
        boletos_erro: 0,
        arquivo_gerado: null
      };
    }

    // Gerar arquivo de remessa baseado no tipo do banco
    const arquivoRemessa = await this.gerarArquivoRemessa(banco, carnes, config);
    
    // Enviar remessa para o banco via API
    const resultadoEnvio = await this.enviarRemessaParaBanco(banco, arquivoRemessa);

    return {
      total_boletos: carnes.length,
      boletos_erro: 0, // Implementar contagem de erros se necessário
      arquivo_gerado: arquivoRemessa.nome_arquivo,
      resultado_envio: resultadoEnvio
    };
  }

  /**
   * Busca carnês que devem ser incluídos na remessa
   */
  private async buscarCarnesParaRemessa(bancoId: number, config: RemessaBancariaConfig): Promise<Carne[]> {
    const hoje = new Date();
    
    const whereClause: any = {
      banco_id: bancoId,
      status: { [Op.in]: ['pendente', 'ativo'] }
    };

    // Filtrar por status de pagamento
    if (!config.incluir_pagos) {
      // Implementar lógica para excluir carnês totalmente pagos
    }

    // Buscar carnês com parcelas
    const carnes = await Carne.findAll({
      where: whereClause,
      include: [
        {
          model: CarneParcela,
          as: 'parcelas',
          where: {
            status: 'pendente'
          },
          required: true
        }
      ]
    });

    // Filtrar carnês baseado nas configurações
    const carnesFiltradas = carnes.filter(carne => {
      // Verificar se tem parcelas dentro do período configurado
      const parcelasValidas = carne.parcelas?.filter(parcela => {
        const diasParaVencimento = Math.ceil((parcela.data_vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        
        // Verificar dias de vencimento
        if (config.dias_vencimento_minimo && diasParaVencimento < config.dias_vencimento_minimo) {
          return false;
        }
        if (config.dias_vencimento_maximo && diasParaVencimento > config.dias_vencimento_maximo) {
          return false;
        }

        // Verificar valor da parcela
        if (config.valor_minimo && parcela.valor_parcela < config.valor_minimo) {
          return false;
        }
        if (config.valor_maximo && parcela.valor_parcela > config.valor_maximo) {
          return false;
        }

        return true;
      });

      return parcelasValidas && parcelasValidas.length > 0;
    });

    return carnesFiltradas;
  }

  /**
   * Gera arquivo de remessa baseado no tipo do banco
   */
  private async gerarArquivoRemessa(banco: Banco, carnes: Carne[], config: RemessaBancariaConfig): Promise<any> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const nomeArquivo = `REMESSA_${banco.nome}_${timestamp}.${config.formato_arquivo || 'txt'}`;

    let conteudoArquivo: string;

    switch (banco.tipo_banco) {
      case 'efi':
        conteudoArquivo = await this.gerarRemessaEFI(carnes);
        break;
      case 'bradesco':
        conteudoArquivo = await this.gerarRemessaBradesco(carnes);
        break;
      case 'itau':
        conteudoArquivo = await this.gerarRemessaItau(carnes);
        break;
      default:
        conteudoArquivo = await this.gerarRemessaGenerica(carnes, config);
    }

    return {
      nome_arquivo: nomeArquivo,
      conteudo: conteudoArquivo,
      tamanho: conteudoArquivo.length,
      tipo: config.formato_arquivo || 'txt'
    };
  }

  /**
   * Gera remessa no formato EFI
   */
  private async gerarRemessaEFI(carnes: Carne[]): Promise<string> {
    // Implementar geração de remessa EFI
    // Por enquanto, retornar formato mock
    let conteudo = 'HEADER_EFI\n';
    
    for (const carne of carnes) {
      conteudo += `CARNE_${carne.id}_${carne.numero_carne}\n`;
    }
    
    conteudo += 'TRAILER_EFI\n';
    return conteudo;
  }

  /**
   * Gera remessa no formato Bradesco
   */
  private async gerarRemessaBradesco(carnes: Carne[]): Promise<string> {
    // Implementar geração de remessa Bradesco
    let conteudo = 'HEADER_BRADESCO\n';
    
    for (const carne of carnes) {
      conteudo += `CARNE_${carne.id}_${carne.numero_carne}\n`;
    }
    
    conteudo += 'TRAILER_BRADESCO\n';
    return conteudo;
  }

  /**
   * Gera remessa no formato Itaú
   */
  private async gerarRemessaItau(carnes: Carne[]): Promise<string> {
    // Implementar geração de remessa Itaú
    let conteudo = 'HEADER_ITAU\n';
    
    for (const carne of carnes) {
      conteudo += `CARNE_${carne.id}_${carne.numero_carne}\n`;
    }
    
    conteudo += 'TRAILER_ITAU\n';
    return conteudo;
  }

  /**
   * Gera remessa genérica
   */
  private async gerarRemessaGenerica(carnes: Carne[], config: RemessaBancariaConfig): Promise<string> {
    const formato = config.formato_arquivo || 'txt';
    
    if (formato === 'json') {
      return JSON.stringify({
        timestamp: new Date().toISOString(),
        total_carnes: carnes.length,
        carnes: carnes.map(carne => ({
          id: carne.id,
          numero_carne: carne.numero_carne,
          valor_total: carne.valor_total,
          quantidade_parcelas: carne.quantidade_parcelas
        }))
      }, null, 2);
    }
    
    if (formato === 'xml') {
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<remessa>\n';
      for (const carne of carnes) {
        xml += `  <carne id="${carne.id}" numero="${carne.numero_carne}" valor="${carne.valor_total}" />\n`;
      }
      xml += '</remessa>';
      return xml;
    }
    
    // Formato TXT
    let conteudo = `REMESSA_GENERICA_${new Date().toISOString()}\n`;
    for (const carne of carnes) {
      conteudo += `CARNE_${carne.id}_${carne.numero_carne}_${carne.valor_total}\n`;
    }
    
    return conteudo;
  }

  /**
   * Envia remessa para o banco via API
   */
  private async enviarRemessaParaBanco(banco: Banco, arquivoRemessa: any): Promise<any> {
    try {
      // Usar o BancoApiService para enviar a remessa
      const resultado = await BancoApiService.enviarRemessa(banco, arquivoRemessa);
      
      console.log(`Remessa enviada para ${banco.nome}: ${arquivoRemessa.nome_arquivo}`);
      return resultado;
    } catch (error: any) {
      console.error(`Erro ao enviar remessa para ${banco.nome}:`, error);
      throw error;
    }
  }
}
