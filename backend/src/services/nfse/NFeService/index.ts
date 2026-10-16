import { NotaFiscal } from '../../../models/nfse/NotaFiscal';
import { Cliente } from '../../../models/clientes/Cliente';
import { DadosEmpresaService } from '../../sistema/DadosEmpresaService';
import type { DadosEmpresa } from '../../../models/sistema/DadosEmpresa';
import { logger } from '../../../utils/logger';
import { PortalNacionalNFSeService } from '../PortalNacionalNFSeService';
import { AsaasNFSeService } from '../AsaasNFSeService';
import { NFSeConfigService } from '../NFSeConfigService';
import { Titulo } from '../../../models/financeiro/Titulo';
import { Plano } from '../../../models/cadastros/Plano';
import { normalizeDateForDb } from '../../../utils/dateUtils';
import { getCurrentTimestamp } from '../../../utils/timezoneUtils';

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
      const cliente = await Cliente.findByPk(dados.cliente_id);

      if (!cliente) {
        return {
          success: false,
          erro: 'CLIENTE_NAO_ENCONTRADO',
          mensagem: 'Cliente não encontrado'
        };
      }

      // Buscar dados da empresa (multi-tenant)
      const empresaId = (cliente as { empresa_id?: number | null }).empresa_id ?? undefined;
      const dadosEmpresa = await DadosEmpresaService.findOne(empresaId);
      if (!dadosEmpresa) {
        return {
          success: false,
          erro: 'DADOS_EMPRESA_NAO_ENCONTRADOS',
          mensagem: 'Dados da empresa não configurados'
        };
      }


      // Calcular valores
      let valorServicos = dados.valor_servicos || dados.valor_total;
      let valorDesconto = dados.valor_desconto || 0;
      let valorTotal = dados.valor_total;

      // Se houver título vinculado, usar valores do título
      if (dados.titulo_id) {
        const titulo = await Titulo.findByPk(dados.titulo_id, {
          include: [{ model: Plano, as: 'plano', attributes: ['valor_mensal'] }]
        }) as (Titulo & { plano?: Plano }) | null;
          
        if (titulo?.plano) {
          const valorPlano = Number(titulo.plano.valor_mensal);
          valorTotal = dados.valor_total || Number(titulo.valor_final || valorPlano);
          valorServicos = dados.valor_servicos || valorPlano;
          valorDesconto = Math.max(0, valorServicos - valorTotal);
        }
      }
      
      // Validar: desconto não pode ser superior ao valor total
      if (valorDesconto > valorTotal) {
        valorDesconto = valorTotal;
      }


      // Sempre usar data e hora atual local
      const dataEmissao = new Date();
      logger.info(`[NFeService] Data emissão - Local: ${dataEmissao.getFullYear()}-${String(dataEmissao.getMonth() + 1).padStart(2, '0')}-${String(dataEmissao.getDate()).padStart(2, '0')} ${String(dataEmissao.getHours()).padStart(2, '0')}:${String(dataEmissao.getMinutes()).padStart(2, '0')}:${String(dataEmissao.getSeconds()).padStart(2, '0')}`);

      // Criar data_vencimento
      const dataVencimentoValue = dados.data_vencimento 
        ? normalizeDateForDb(dados.data_vencimento)
        : null;

      const notaFiscal = await NotaFiscal.create({
        empresa_id: empresaId ?? null,
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
        descricao: dados.descricao || null,
        observacoes: dados.observacoes || null
      });

      notaFiscal.status = 'PROCESSANDO';
      await notaFiscal.save();
      
      // Log após salvar para ver o que foi realmente salvo
      await notaFiscal.reload();
      logger.info(`[NFeService] Data emissão após salvar no banco - Local: ${notaFiscal.data_emissao.getFullYear()}-${String(notaFiscal.data_emissao.getMonth() + 1).padStart(2, '0')}-${String(notaFiscal.data_emissao.getDate()).padStart(2, '0')} ${String(notaFiscal.data_emissao.getHours()).padStart(2, '0')}:${String(notaFiscal.data_emissao.getMinutes()).padStart(2, '0')}:${String(notaFiscal.data_emissao.getSeconds()).padStart(2, '0')}`);

      const resultadoProvedor = await this.gerarNFeComProvedor(notaFiscal, cliente, dadosEmpresa, empresaId);

      if (resultadoProvedor.success) {
        // Atualizar nota fiscal com dados do provedor
        notaFiscal.status = 'AUTORIZADA';
        notaFiscal.numero = resultadoProvedor.numero || null;
        notaFiscal.serie = resultadoProvedor.serie || null;
        notaFiscal.chave_acesso = resultadoProvedor.chave_acesso || null;
        notaFiscal.protocolo = resultadoProvedor.protocolo || null;
        notaFiscal.data_autorizacao = resultadoProvedor.data_autorizacao || new Date();
        logger.info(`[NFeService] Data autorização - Local: ${notaFiscal.data_autorizacao.getFullYear()}-${String(notaFiscal.data_autorizacao.getMonth() + 1).padStart(2, '0')}-${String(notaFiscal.data_autorizacao.getDate()).padStart(2, '0')} ${String(notaFiscal.data_autorizacao.getHours()).padStart(2, '0')}:${String(notaFiscal.data_autorizacao.getMinutes()).padStart(2, '0')}:${String(notaFiscal.data_autorizacao.getSeconds()).padStart(2, '0')}`);
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
    dadosEmpresa: DadosEmpresa,
    empresaId?: number | null
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
    const empId = empresaId ?? dadosEmpresa?.id ?? (cliente as { empresa_id?: number | null }).empresa_id ?? undefined;
    const config = await NFSeConfigService.getConfig(empId);
    if (!config) {
      return {
        success: false,
        erro: 'Configuração de NFS-e não encontrada. Configure a NFS-e nos parâmetros do sistema.',
        codigo_erro: 'CONFIG_NFSE_NAO_ENCONTRADA'
      };
    }

    const provider = config.provider;

    // Se Asaas está configurado, usar ele
    if (provider === 'ASAAS') {
      return await AsaasNFSeService.gerarNFSe(notaFiscal, cliente, dadosEmpresa, empId);
    }

    if (provider === 'PORTAL_NACIONAL') {
      return await PortalNacionalNFSeService.gerarNFSe(notaFiscal, cliente, dadosEmpresa, empId);
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

      let empresaIdNota: number | undefined;
      if (notaFiscal.cliente_id) {
        const clienteNota = await Cliente.findByPk(notaFiscal.cliente_id, { attributes: ['empresa_id'] });
        empresaIdNota = (clienteNota as { empresa_id?: number | null } | null)?.empresa_id ?? undefined;
      }
      if (notaFiscal.chave_acesso) {
        const config = await NFSeConfigService.getConfig(empresaIdNota);
        let resultado: { success: boolean; status?: string; erro?: string } | null = null;

        if (!config) {
          return {
            success: false,
            erro: 'Configuração de NFS-e não encontrada'
          };
        }

        if (config.provider === 'ASAAS') {
          resultado = await AsaasNFSeService.consultarStatus(notaFiscal.chave_acesso, empresaIdNota);
        } else if (config.provider === 'PORTAL_NACIONAL') {
          resultado = await PortalNacionalNFSeService.consultarStatus(notaFiscal.chave_acesso, empresaIdNota);
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
   * Atualiza nota fiscal com dados extraídos do XML
   */
  static async atualizarComXml(notaFiscalId: number): Promise<{ success: boolean; mensagem: string }> {
    try {
      const notaFiscal = await NotaFiscal.findByPk(notaFiscalId);
      if (!notaFiscal) {
        return {
          success: false,
          mensagem: 'Nota fiscal não encontrada'
        };
      }

      if (!notaFiscal.xml) {
        return {
          success: false,
          mensagem: 'XML não disponível para esta nota fiscal'
        };
      }

      const { NFSeXmlParserService } = await import('../NFSeXmlParserService');
      const sucesso = await NFSeXmlParserService.atualizarNotaFiscalComXml(notaFiscalId, notaFiscal.xml);

      if (sucesso) {
        return {
          success: true,
          mensagem: 'Nota fiscal atualizada com dados do XML'
        };
      } else {
        return {
          success: false,
          mensagem: 'Falha ao extrair dados do XML'
        };
      }
    } catch (error) {
      logger.error('Erro ao atualizar NF com XML:', error);
      return {
        success: false,
        mensagem: 'Erro interno ao processar XML'
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

      // Verificar se já está cancelada
      if (notaFiscal.status === 'CANCELADA') {
        return {
          success: false,
          erro: 'NOTA_JA_CANCELADA',
          mensagem: 'Esta nota fiscal já foi cancelada'
        };
      }

      if (!justificativa || justificativa.length < 15) {
        return {
          success: false,
          erro: 'JUSTIFICATIVA_INVALIDA',
          mensagem: 'Justificativa deve ter pelo menos 15 caracteres'
        };
      }

      const empresaIdCancel = notaFiscal.cliente_id
        ? ((await Cliente.findByPk(notaFiscal.cliente_id, { attributes: ['empresa_id'] })) as { empresa_id?: number | null } | null)?.empresa_id
        : undefined;
      const configCancel = await NFSeConfigService.getConfig(empresaIdCancel);
      if (configCancel?.provider === 'PORTAL_NACIONAL') {
        return PortalNacionalNFSeService.cancelarNFSe();
      }

      const identificador = notaFiscal.asaas_invoice_id;

      if (identificador) {

        const resultado = await AsaasNFSeService.cancelarNFSe(identificador, justificativa, empresaIdCancel);

        if (!resultado.success) {
          return {
            success: false,
            erro: resultado.erro,
            mensagem: resultado.mensagem
          };
        }
      }

      // Atualizar status no banco
      notaFiscal.status = 'CANCELADA';
      notaFiscal.observacoes = (notaFiscal.observacoes || '') + `\nCancelada em ${getCurrentTimestamp()}: ${justificativa}`;
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

