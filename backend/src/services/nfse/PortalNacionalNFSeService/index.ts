import { NotaFiscal } from '../../../models/nfse/NotaFiscal';
import { Cliente } from '../../../models/clientes/Cliente';
import { DadosEmpresa } from '../../../models/sistema/DadosEmpresa';
import { NFSeConfig } from '../../../models/nfse/NFSeConfig';
import { NFSeConfigService } from '../NFSeConfigService';
import { ViaCepService } from '../../externos/ViaCepService';
import { logger } from '../../../utils/logger';
import { normalizarCodigoTributacaoNacional, normalizarSerieDps } from '../portalNacional/dpsId';
import { montarDpsXml } from '../portalNacional/dpsXml';
import { abrirCertificadoArmazenado, certificadoVencido } from '../portalNacional/certificadoA1';
import { assinarDpsXml } from '../portalNacional/assinarDps';
import { consultarNfseSefin, emitirNaSefin } from '../portalNacional/sefinClient';

interface ResultadoPortal {
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
}

function digitos(valor: string | null | undefined): string {
  return String(valor || '').replace(/\D/g, '');
}

async function codigoMunicipioPorCep(cep: string | null | undefined, origem: string): Promise<string> {
  if (digitos(cep).length !== 8) {
    throw new Error(`Informe um CEP válido ${origem}.`);
  }
  const endereco = await ViaCepService.buscarCep(String(cep));
  if (!endereco?.ibge || digitos(endereco.ibge).length !== 7) {
    throw new Error(`Não foi possível obter o código do município ${origem}. Confira o CEP.`);
  }
  return digitos(endereco.ibge);
}

export class PortalNacionalNFSeService {
  static async gerarNFSe(
    notaFiscal: NotaFiscal,
    cliente: Cliente,
    dadosEmpresa: DadosEmpresa,
    empresaId?: number | null
  ): Promise<ResultadoPortal> {
    try {
      const config = await NFSeConfigService.getConfig(empresaId ?? dadosEmpresa.id);
      if (!config?.certificado_pfx || !config.certificado_senha) {
        return {
          success: false,
          codigo_erro: 'CERT_AUSENTE',
          erro: 'Envie o certificado A1 e a senha em Integrações → NFS-e.',
        };
      }

      const serie = normalizarSerieDps(config.serie_nf);
      if (!serie) {
        return {
          success: false,
          codigo_erro: 'SERIE_DPS',
          erro: 'A série da NFS-e no Portal Nacional deve ter de 1 a 5 dígitos.',
        };
      }

      const codigoServico = normalizarCodigoTributacaoNacional(config.codigo_servico_municipal);
      if (!codigoServico) {
        return {
          success: false,
          codigo_erro: 'CTRIBNAC',
          erro: 'Informe o código de tributação nacional com 6 dígitos em Integrações → NFS-e.',
        };
      }

      const opSimples = (config.op_simples_nacional || 1) as 1 | 2 | 3;
      if (opSimples === 3 && !config.regime_apuracao_sn) {
        return {
          success: false,
          codigo_erro: 'REG_AP_SN',
          erro: 'Para ME/EPP, informe o regime de apuração do Simples Nacional em Integrações → NFS-e.',
        };
      }

      const descricao = (notaFiscal.descricao || config.descricao_servico || '').trim();
      if (!descricao) {
        return {
          success: false,
          codigo_erro: 'DESC_SERV',
          erro: 'Informe a descrição do serviço na nota ou em Integrações → NFS-e.',
        };
      }

      const certificado = abrirCertificadoArmazenado(config.certificado_pfx, config.certificado_senha);
      if (certificadoVencido(certificado.validade)) {
        return {
          success: false,
          codigo_erro: 'CERT_VENCIDO',
          erro: 'O certificado A1 está vencido. Envie um certificado válido em Integrações → NFS-e.',
        };
      }

      const cnpjEmpresa = digitos(dadosEmpresa.cnpj);
      if (certificado.cnpj && certificado.cnpj !== cnpjEmpresa) {
        return {
          success: false,
          codigo_erro: 'CERT_CNPJ',
          erro: 'O CNPJ do certificado A1 é diferente do CNPJ em Dados da Empresa.',
        };
      }

      const documentoTomador = digitos(cliente.cnpj);
      if (documentoTomador.length !== 11 && documentoTomador.length !== 14) {
        return {
          success: false,
          codigo_erro: 'TOMADOR_DOC',
          erro: 'O cliente precisa de CPF ou CNPJ válido para emitir a NFS-e.',
        };
      }
      if (!cliente.endereco?.trim() || !cliente.bairro?.trim()) {
        return {
          success: false,
          codigo_erro: 'TOMADOR_END',
          erro: 'Preencha logradouro e bairro do cliente antes de emitir a NFS-e.',
        };
      }

      const codigoEmissao = await codigoMunicipioPorCep(dadosEmpresa.cep, 'em Dados da Empresa');
      const codigoTomador = await codigoMunicipioPorCep(cliente.cep, 'do cliente');
      const numeroDps = config.numero_dps && config.numero_dps > 0 ? config.numero_dps : 1;
      const valorServico = Number(notaFiscal.valor_servicos || notaFiscal.valor_total) || 0;
      const valorDesconto = Math.min(Number(notaFiscal.valor_desconto) || 0, valorServico);

      const xml = montarDpsXml({
        ambiente: config.portal_nacional_ambiente,
        dataEmissao: notaFiscal.data_emissao || new Date(),
        serie,
        numeroDps,
        codigoMunicipioEmissao: codigoEmissao,
        cnpjPrestador: cnpjEmpresa,
        inscricaoMunicipal: dadosEmpresa.inscricao_municipal,
        opSimplesNacional: opSimples,
        regimeEspecialTributacao: config.regime_especial_tributacao || 0,
        regimeApuracaoSn: (config.regime_apuracao_sn as 1 | 2 | 3 | null) || null,
        tomador: {
          documento: documentoTomador,
          nome: cliente.razao_social,
          endereco: {
            codigoMunicipio: codigoTomador,
            cep: digitos(cliente.cep),
            logradouro: cliente.endereco.trim(),
            numero: cliente.numero?.trim() || 'SN',
            complemento: cliente.complemento,
            bairro: cliente.bairro.trim(),
          },
          email: cliente.email,
          telefone: cliente.telefone || cliente.whatsapp,
        },
        codigoMunicipioPrestacao: codigoEmissao,
        codigoTributacaoNacional: codigoServico,
        descricaoServico: descricao,
        valorServico,
        valorDesconto,
        aliquotaIss: Number(notaFiscal.aliquota_iss || config.aliquota_iss) || 0,
        tipoRetencaoIssqn: (config.tp_ret_issqn || 1) as 1 | 2 | 3,
      });

      const xmlAssinado = assinarDpsXml(xml, certificado);
      const resultado = await emitirNaSefin(config.portal_nacional_ambiente, xmlAssinado, certificado);
      if (!resultado.success) {
        return resultado;
      }

      await NFSeConfig.update(
        { numero_dps: numeroDps + 1 },
        { where: { id: config.id } }
      );

      return {
        success: true,
        numero: resultado.numero || null,
        serie,
        chave_acesso: resultado.chave_acesso || null,
        data_autorizacao: resultado.data_autorizacao,
        xml: resultado.xml || xmlAssinado,
      };
    } catch (erro) {
      logger.error('Erro ao emitir NFS-e no Portal Nacional', {
        erro: erro instanceof Error ? erro.message : String(erro),
      });
      return {
        success: false,
        codigo_erro: 'DPS_001',
        erro: erro instanceof Error ? erro.message : 'Erro ao emitir NFS-e no Portal Nacional.',
      };
    }
  }

  static async consultarStatus(chaveAcesso: string, empresaId?: number | null): Promise<{
    success: boolean;
    status?: string;
    erro?: string;
  }> {
    try {
      const config = await NFSeConfigService.getConfig(empresaId);
      if (!config?.certificado_pfx || !config.certificado_senha) {
        return { success: false, erro: 'Certificado A1 não configurado.' };
      }
      const certificado = abrirCertificadoArmazenado(config.certificado_pfx, config.certificado_senha);
      return consultarNfseSefin(config.portal_nacional_ambiente, chaveAcesso, certificado);
    } catch (erro) {
      logger.error('Erro ao consultar NFS-e no Portal Nacional', {
        erro: erro instanceof Error ? erro.message : String(erro),
      });
      return { success: false, erro: erro instanceof Error ? erro.message : 'Erro ao consultar a NFS-e.' };
    }
  }

  static async cancelarNFSe(): Promise<{ success: boolean; mensagem?: string; erro?: string }> {
    return {
      success: false,
      erro: 'CANCELAMENTO_PORTAL',
      mensagem: 'O cancelamento no Portal Nacional ainda não é feito por aqui. Cancele a nota no emissor nacional da NFS-e.',
    };
  }
}
