import { NotaFiscal } from '../models/NotaFiscal';
import { Cliente } from '../models/Cliente';
import { DadosEmpresa } from '../models/DadosEmpresa';
import { logger } from '../utils/logger';
import { PortalNacionalNFSeService } from './PortalNacionalNFSeService';
import { AsaasNFSeService } from './AsaasNFSeService';
import { NFSeConfigService } from './NFSeConfigService';
import { Titulo } from '../models/Titulo';
import { Plano } from '../models/Plano';
import { Contrato } from '../models/Contrato';
import { ContratoPlanoAdicional } from '../models/ContratoPlanoAdicional';
import { FinancialCalculationsService } from './FinancialCalculationsService';
import { normalizeDateForDb } from '../utils/dateUtils';

export interface DadosNFe {
  cliente_id: number;
  titulo_id?: number;
  natureza_operacao?: string;
  data_emissao?: Date | string;
  data_vencimento?: Date | string;
  valor_total: number;
  valor_servicos?: number;
  valor_produtos?: number;
  valor_desconto?: number;
  aliquota_iss?: number;
  descricao?: string;
  observacoes?: string;
  modelo?: number;
  cfop?: string;
  cst_icms?: string;
}

export interface ResultadoGeracaoNFe {
  success: boolean;
  notaFiscal?: NotaFiscal;
  mensagem?: string;
  erro?: string;
  codigo_erro?: string;
}

/**
 * Service responsável por gerar Notas Fiscais de Serviços Eletrônicas (NFS-e)
 */
export class NFeService {
  /**
   * Gera uma Nota Fiscal de Serviços Eletrônica (NFS-e) para um cliente
   */
  static async gerarNFe(dados: DadosNFe): Promise<ResultadoGeracaoNFe> {
    try {
      // Buscar cliente
      const cliente = await Cliente.findByPk(dados.cliente_id, {
        include: []
      });

      if (!cliente) {
        return {
          success: false,
          erro: 'CLIENTE_NAO_ENCONTRADO',
          mensagem: 'Cliente não encontrado'
        };
      }

      // Buscar dados da empresa
      const dadosEmpresa = await DadosEmpresa.findOne();
      if (!dadosEmpresa) {
        return {
          success: false,
          erro: 'DADOS_EMPRESA_NAO_ENCONTRADOS',
          mensagem: 'Dados da empresa não configurados'
        };
      }


      // Buscar configuração da NFS-e para usar descrição padrão
      const nfseConfig = await NFSeConfigService.getConfig();
      const descricaoPadrao = nfseConfig?.descricao_servico || null;

      // Calcular valores se houver título vinculado
      let valorServicos = dados.valor_servicos || dados.valor_total;
      let valorDesconto = dados.valor_desconto || 0;
      let valorTotal = dados.valor_total;

      if (dados.titulo_id) {

        const titulo = await Titulo.findByPk(dados.titulo_id, {
          include: [
            {
              model: Plano,
              as: 'plano',
              attributes: ['id', 'nome_plano', 'valor_mensal']
            }
          ]
        }) as (Titulo & { plano?: Plano }) | null;
          
        if (titulo?.plano) {
          const valorPlano = Number(titulo.plano.valor_mensal);
          let totalServicos = valorPlano;
          let totalFinal = valorPlano;

          if (titulo.valor_final) {
            totalFinal = Number(titulo.valor_final);
          }

          if (titulo.contrato_id) {
            const contrato = await Contrato.findByPk(titulo.contrato_id);
            
            if (contrato) {
              const planosAdicionais = await ContratoPlanoAdicional.findAll({
                where: { contrato_id: contrato.id, status: 'ativo' },
                include: [{ model: Plano, as: 'plano', attributes: ['id', 'nome_plano', 'valor_mensal'] }]
              }) as Array<ContratoPlanoAdicional & { plano?: Plano }>;

              for (const planoAdicional of planosAdicionais) {
                if (planoAdicional.plano) {
                  const valorAdicional = Number(planoAdicional.plano.valor_mensal);
                  const valorFinalAdicional = planoAdicional.valor_final
                    ? Number(planoAdicional.valor_final)
                    : FinancialCalculationsService.calcularValorFinal(valorAdicional, {
                        desconto_valor: planoAdicional.desconto_valor,
                        desconto_percentual: planoAdicional.desconto_percentual
                      });
                  
                  totalServicos += valorAdicional;
                  totalFinal += valorFinalAdicional;
                }
              }
            }
          }

          valorServicos = totalServicos;
          valorTotal = dados.valor_total || totalFinal;
          valorDesconto = Math.max(0, totalServicos - valorTotal);
        }
      }


      // Criar data_emissao preservando hora atual
      // Se data_emissao for fornecida como string YYYY-MM-DD (sem hora), usar data fornecida com hora atual
      // Se data_emissao for fornecida como Date ou string com hora, preservar hora
      // Se não fornecida, usar data/hora atual
      let dataEmissao: Date;
      const now = new Date();
      
      
      if (dados.data_emissao instanceof Date) {
        dataEmissao = dados.data_emissao;
      } else if (typeof dados.data_emissao === 'string') {
        const hasTime = /T|\s/.test(dados.data_emissao);
        
        if (hasTime) {
          dataEmissao = new Date(dados.data_emissao);
        } else {
          // Sem hora (formato YYYY-MM-DD), usar data fornecida com hora atual
          const dateMatch = dados.data_emissao.match(/^(\d{4})-(\d{2})-(\d{2})/);
          if (dateMatch) {
            const [, year, month, day] = dateMatch.map(Number);
            dataEmissao = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
          } else {
            dataEmissao = new Date(dados.data_emissao);
          }
        }
      } else {
        dataEmissao = new Date();
      }
      

      // Criar data_vencimento
      const dataVencimentoValue = dados.data_vencimento 
        ? normalizeDateForDb(dados.data_vencimento)
        : null;

      const notaFiscal = await NotaFiscal.create({
        cliente_id: dados.cliente_id,
        titulo_id: dados.titulo_id || null,
        status: 'PENDENTE',
        tipo_operacao: 'SAIDA',
        modelo: dados.modelo || 55, // NFS-e usa modelo 55 para compatibilidade
        natureza_operacao: dados.natureza_operacao || 'PRESTAÇÃO DE SERVIÇOS',
        data_emissao: dataEmissao,
        data_vencimento: dataVencimentoValue,
        valor_total: valorTotal,
        valor_servicos: valorServicos,
        valor_produtos: dados.valor_produtos || 0,
        valor_desconto: valorDesconto,
        valor_icms: 0,
        valor_iss: this.calcularISS(valorTotal, dados.aliquota_iss || 0),
        aliquota_iss: dados.aliquota_iss || 0,
        cfop: dados.cfop || null,
        cst_icms: dados.cst_icms || null,
        descricao: dados.descricao || descricaoPadrao,
        observacoes: dados.observacoes || null
      });

      notaFiscal.status = 'PROCESSANDO';
      await notaFiscal.save();

      

      const resultadoProvedor = await this.gerarNFeComProvedor(notaFiscal, cliente, dadosEmpresa);

      if (resultadoProvedor.success) {
        // Atualizar nota fiscal com dados do provedor
        notaFiscal.status = 'AUTORIZADA';
        notaFiscal.numero = resultadoProvedor.numero || null;
        notaFiscal.serie = resultadoProvedor.serie || null;
        notaFiscal.chave_acesso = resultadoProvedor.chave_acesso || null;
        notaFiscal.protocolo = resultadoProvedor.protocolo || null;
        notaFiscal.data_autorizacao = resultadoProvedor.data_autorizacao || new Date();
        notaFiscal.xml = resultadoProvedor.xml || null;
        notaFiscal.pdf_url = resultadoProvedor.pdf_url || null;
        notaFiscal.danfe_url = resultadoProvedor.danfe_url || null;
        
        // Salvar invoice_id e status da NFS-e
        const invoiceId = ('invoice_id' in resultadoProvedor && typeof resultadoProvedor.invoice_id === 'string') 
          ? resultadoProvedor.invoice_id 
          : null;
        notaFiscal.asaas_invoice_id = invoiceId;
        notaFiscal.nfse_status = resultadoProvedor.numero ? 'emitida' : 'agendado';
        
        await notaFiscal.save();

        // Atualizar título se titulo_id foi fornecido (vínculo com nota fiscal)
        if (dados.titulo_id) {
          await Titulo.update(
            { nota_fiscal_id: notaFiscal.id },
            { where: { id: dados.titulo_id } }
          );
        }

      } else {
        // Marcar como erro
        notaFiscal.status = 'ERRO';
        notaFiscal.mensagem_erro = resultadoProvedor.erro || 'Erro ao gerar NFS-e';
        // Limitar codigo_erro a 10 caracteres (tamanho máximo do campo)
        notaFiscal.codigo_erro = resultadoProvedor.codigo_erro 
          ? resultadoProvedor.codigo_erro.substring(0, 10) 
          : null;
        notaFiscal.nfse_status = 'erro';
        await notaFiscal.save();

        return {
          success: false,
          notaFiscal,
          erro: resultadoProvedor.codigo_erro || 'ERRO_GERACAO',
          mensagem: resultadoProvedor.erro || 'Erro ao gerar NFS-e com o provedor'
        };
      }

      return {
        success: true,
        notaFiscal,
        mensagem: 'NFS-e gerada com sucesso'
      };
    } catch (error) {
      logger.error('Erro ao gerar NFS-e:', error);
      return {
        success: false,
        erro: 'ERRO_INTERNO',
        mensagem: error instanceof Error ? error.message : 'Erro interno ao gerar NFS-e'
      };
    }
  }

  /**
   * Gera NFS-e usando provedor externo
   * Suporta Portal Nacional (usuário/senha) e outros provedores
   */
  private static async gerarNFeComProvedor(
    notaFiscal: NotaFiscal,
    cliente: Cliente,
    dadosEmpresa: DadosEmpresa
  ): Promise<{
    success: boolean;
    numero?: string | null;
    serie?: string | null;
    chave_acesso?: string | null;
    protocolo?: string | null;
    data_autorizacao?: Date;
    xml?: string | null;
    pdf_url?: string | null;
    danfe_url?: string | null;
    erro?: string;
    codigo_erro?: string;
  }> {
    // Verificar qual provedor está configurado
    const config = await NFSeConfigService.getConfig();
    const provider = config.provider;

    // Se Asaas está configurado, usar ele
    if (provider === 'ASAAS') {
      if (config.asaas_api_key) {
        return await AsaasNFSeService.gerarNFSe(notaFiscal, cliente, dadosEmpresa);
      } else {
        logger.error('Asaas configurado mas API Key não encontrada');
        return {
          success: false,
          erro: 'Configuração do Asaas incompleta. Configure a API Key nos parâmetros do sistema.',
          codigo_erro: 'CONFIG_ASAAS_INCOMPLETA'
        };
      }
    }

    // Se Portal Nacional está configurado, usar ele
    if (provider === 'PORTAL_NACIONAL') {
      if (config.portal_nacional_username && config.portal_nacional_password) {
        return await PortalNacionalNFSeService.gerarNFSe(notaFiscal, cliente, dadosEmpresa);
      } else {
        logger.error('Portal Nacional configurado mas credenciais não encontradas');
        return {
          success: false,
          erro: 'Configuração do Portal Nacional incompleta. Configure usuário e senha nos parâmetros do sistema.',
          codigo_erro: 'CONFIG_PORTAL_NACIONAL_INCOMPLETA'
        };
      }
    }

    // Se provider não configurado, não permitir geração
    logger.error('Nenhum provedor de NFS-e configurado corretamente. Configure um provedor nos parâmetros do sistema.');
    return {
      success: false,
      erro: 'Nenhum provedor de NFS-e configurado. Configure um provedor (Portal Nacional ou Asaas) nos parâmetros do sistema.',
      codigo_erro: 'PROVIDER_NAO_CONFIGURADO'
    };
  }

  /**
   * Calcula valor do ISS
   */
  private static calcularISS(valorBase: number, aliquota: number): number {
    return (valorBase * aliquota) / 100;
  }

  /**
   * Consulta status de uma NFS-e
   */
  static async consultarStatus(notaFiscalId: number): Promise<{
    success: boolean;
    status?: string;
    erro?: string;
  }> {
    try {
      const notaFiscal = await NotaFiscal.findByPk(notaFiscalId);
      if (!notaFiscal) {
        return {
          success: false,
          erro: 'NOTA_FISCAL_NAO_ENCONTRADA'
        };
      }

      // Se tem chave de acesso, consultar no provedor configurado
      if (notaFiscal.chave_acesso) {
        const config = await NFSeConfigService.getConfig();
        let resultado: { success: boolean; status?: string; erro?: string } | null = null;

        if (config.provider === 'ASAAS') {
          resultado = await AsaasNFSeService.consultarStatus(notaFiscal.chave_acesso);
        } else if (config.provider === 'PORTAL_NACIONAL') {
          resultado = await PortalNacionalNFSeService.consultarStatus(notaFiscal.chave_acesso);
        }

        if (resultado?.success && resultado.status && resultado.status !== notaFiscal.status) {
          notaFiscal.status = resultado.status as NotaFiscal['status'];
              await notaFiscal.save();
            }

        if (resultado) {
            return resultado;
        }
      }

      // Retornar status do banco de dados
      return {
        success: true,
        status: notaFiscal.status
      };
    } catch (error) {
      logger.error('Erro ao consultar status da NFS-e:', error);
      return {
        success: false,
        erro: 'ERRO_CONSULTA'
      };
    }
  }

  /**
   * Cancela uma NFS-e
   */
  static async cancelarNFe(notaFiscalId: number, justificativa: string): Promise<{
    success: boolean;
    mensagem?: string;
    erro?: string;
  }> {
    try {
      const notaFiscal = await NotaFiscal.findByPk(notaFiscalId);
      if (!notaFiscal) {
        return {
          success: false,
          erro: 'NOTA_FISCAL_NAO_ENCONTRADA'
        };
      }

      if (!notaFiscal.podeCancelar()) {
        return {
          success: false,
          erro: 'NOTA_NAO_PODE_SER_CANCELADA',
          mensagem: 'Apenas notas autorizadas podem ser canceladas'
        };
      }

      if (!justificativa || justificativa.length < 15) {
        return {
          success: false,
          erro: 'JUSTIFICATIVA_INVALIDA',
          mensagem: 'Justificativa deve ter pelo menos 15 caracteres'
        };
      }

      // Tentar cancelar no provedor se configurado
      if (notaFiscal.chave_acesso) {
        const config = await NFSeConfigService.getConfig();

        if (config.provider === 'ASAAS') {
          const resultado = await AsaasNFSeService.cancelarNFSe(
            notaFiscal.chave_acesso,
            justificativa
          );
          
          if (!resultado.success) {
            return {
              success: false,
              erro: resultado.erro || 'Erro ao cancelar NFS-e no Asaas',
              mensagem: resultado.erro
            };
          }
        } else if (config.provider === 'PORTAL_NACIONAL') {
          const resultado = await PortalNacionalNFSeService.cancelarNFSe(
            notaFiscal.chave_acesso,
            justificativa
          );
          
          if (!resultado.success) {
            return {
              success: false,
              erro: resultado.erro || 'Erro ao cancelar NFS-e no Portal Nacional',
              mensagem: resultado.erro
            };
          }
        }
      }

      // Atualizar status no banco
      notaFiscal.status = 'CANCELADA';
      notaFiscal.observacoes = (notaFiscal.observacoes || '') + `\nCancelada em ${new Date().toISOString()}: ${justificativa}`;
      await notaFiscal.save();

      return {
        success: true,
        mensagem: 'NFS-e cancelada com sucesso'
      };
    } catch (error) {
      logger.error('Erro ao cancelar NFS-e:', error);
      return {
        success: false,
        erro: 'ERRO_CANCELAMENTO'
      };
    }
  }
}

