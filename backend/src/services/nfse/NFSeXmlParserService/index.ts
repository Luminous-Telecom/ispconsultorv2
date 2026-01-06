import { logger } from '../../../utils/logger';

export interface NFSeXmlData {
  numero?: string;
  serie?: string;
  chave_acesso?: string;
  data_emissao?: Date;
  valor_total?: number;
  valor_servicos?: number;
  valor_deducoes?: number;
  aliquota_iss?: number;
  codigo_servico?: string;
  discriminacao_servico?: string;
  prestador?: {
    cnpj?: string;
    razao_social?: string;
    nome_fantasia?: string;
    endereco?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
    cep?: string;
    telefone?: string;
    email?: string;
  };
  tomador?: {
    cnpj_cpf?: string;
    razao_social?: string;
    nome_fantasia?: string;
    endereco?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
    cep?: string;
    telefone?: string;
    email?: string;
  };
  status?: string;
  protocolo?: string;
  data_autorizacao?: Date;
  codigo_verificacao?: string;
  numero_rps?: string;
  serie_rps?: string;
  natureza_operacao?: string;
}

export class NFSeXmlParserService {
  /**
   * Extrai dados de uma NFS-e a partir do XML
   */
  static async parseXml(xmlContent: string): Promise<NFSeXmlData> {
    try {
      if (!xmlContent || xmlContent.trim() === '') {
        logger.warn('XML vazio ou nulo fornecido para parsing');
        return {};
      }

      logger.info('Iniciando parsing do XML da NFS-e', {
        xmlLength: xmlContent.length
      });

      const dados: NFSeXmlData = {};

      // Remove namespaces para facilitar o parsing
      const xmlLimpo = xmlContent.replace(/xmlns[^=]*="[^"]*"/g, '');

      // Tenta diferentes padrões de XML de NFS-e

      // 1. Padrão NFS-e (SPED/SEFAZ) - estrutura real do XML fornecido
      dados.numero = this.extractValue(xmlLimpo, /<nNFSe>(.*?)<\/nNFSe>/i) ||
                    this.extractValue(xmlLimpo, /<Numero>(.*?)<\/Numero>/i) ||
                    this.extractValue(xmlLimpo, /<NumeroNFe>(.*?)<\/NumeroNFe>/i) ||
                    this.extractValue(xmlLimpo, /<NumeroNFSe>(.*?)<\/NumeroNFSe>/i);

      dados.serie = this.extractValue(xmlLimpo, /<serie>(.*?)<\/serie>/i) ||
                   this.extractValue(xmlLimpo, /<Serie>(.*?)<\/Serie>/i) ||
                   this.extractValue(xmlLimpo, /<SerieNFe>(.*?)<\/SerieNFe>/i);

      // Chave de acesso é o ID do infNFSe (remover prefixo "NFS" se existir)
      const infNFSeId = this.extractAttribute(xmlLimpo, 'infNFSe', 'Id');
      if (infNFSeId) {
        // Remove o prefixo "NFS" se existir, mantendo apenas a parte numérica
        dados.chave_acesso = infNFSeId.replace(/^NFS/i, '');
      } else {
        dados.chave_acesso = this.extractValue(xmlLimpo, /<ChaveNFe>(.*?)<\/ChaveNFe>/i) ||
                            this.extractValue(xmlLimpo, /<ChaveAcesso>(.*?)<\/ChaveAcesso>/i) ||
                            this.extractValue(xmlLimpo, /<Id>(.*?)<\/Id>/i);
      }

      // Data de emissão
      const dataEmissaoStr = this.extractValue(xmlLimpo, /<dhEmi>(.*?)<\/dhEmi>/i) ||
                            this.extractValue(xmlLimpo, /<DataEmissao>(.*?)<\/DataEmissao>/i) ||
                            this.extractValue(xmlLimpo, /<DataHoraEmissao>(.*?)<\/DataHoraEmissao>/i) ||
                            this.extractValue(xmlLimpo, /<DataNFSe>(.*?)<\/DataNFSe>/i);

      if (dataEmissaoStr) {
        dados.data_emissao = this.parseDate(dataEmissaoStr);
      }

      // Valores
      const valorTotalStr = this.extractValue(xmlLimpo, /<vLiq>(.*?)<\/vLiq>/i) ||
                           this.extractValue(xmlLimpo, /<vServ>(.*?)<\/vServ>/i) ||
                           this.extractValue(xmlLimpo, /<ValorTotal>(.*?)<\/ValorTotal>/i) ||
                           this.extractValue(xmlLimpo, /<ValorNFSe>(.*?)<\/ValorNFSe>/i) ||
                           this.extractValue(xmlLimpo, /<ValorServicos>(.*?)<\/ValorServicos>/i);

      if (valorTotalStr) {
        dados.valor_total = this.parseDecimal(valorTotalStr);
      }

      const valorServicosStr = this.extractValue(xmlLimpo, /<vServ>(.*?)<\/vServ>/i) ||
                              this.extractValue(xmlLimpo, /<ValorServicos>(.*?)<\/ValorServicos>/i) ||
                              this.extractValue(xmlLimpo, /<ValorLiquidoNfse>(.*?)<\/ValorLiquidoNfse>/i);

      if (valorServicosStr) {
        dados.valor_servicos = this.parseDecimal(valorServicosStr);
      }

      // Alíquota ISS - procurar em diferentes locais
      const aliquotaIssStr = this.extractValue(xmlLimpo, /<tribISSQN>(.*?)<\/tribISSQN>/i) ||
                            this.extractValue(xmlLimpo, /<Aliquota>(.*?)<\/Aliquota>/i) ||
                            this.extractValue(xmlLimpo, /<AliquotaISS>(.*?)<\/AliquotaISS>/i);

      if (aliquotaIssStr) {
        dados.aliquota_iss = this.parseDecimal(aliquotaIssStr);
      }

      // Serviço
      dados.codigo_servico = this.extractValue(xmlLimpo, /<cTribNac>(.*?)<\/cTribNac>/i) ||
                            this.extractValue(xmlLimpo, /<ItemListaServico>(.*?)<\/ItemListaServico>/i) ||
                            this.extractValue(xmlLimpo, /<CodigoServico>(.*?)<\/CodigoServico>/i);

      dados.discriminacao_servico = this.extractValue(xmlLimpo, /<xTribNac>(.*?)<\/xTribNac>/i) ||
                                   this.extractValue(xmlLimpo, /<xDescServ>(.*?)<\/xDescServ>/i) ||
                                   this.extractValue(xmlLimpo, /<Discriminacao>(.*?)<\/Discriminacao>/i) ||
                                   this.extractValue(xmlLimpo, /<Descricao>(.*?)<\/Descricao>/i);

      // RPS
      dados.numero_rps = this.extractValue(xmlLimpo, /<nDPS>(.*?)<\/nDPS>/i) ||
                        this.extractValue(xmlLimpo, /<NumeroRPS>(.*?)<\/NumeroRPS>/i);

      dados.serie_rps = this.extractValue(xmlLimpo, /<serie>(.*?)<\/serie>/i) ||
                       this.extractValue(xmlLimpo, /<SerieRPS>(.*?)<\/SerieRPS>/i);

      // Protocolo
      dados.protocolo = this.extractValue(xmlLimpo, /<nDFSe>(.*?)<\/nDFSe>/i) ||
                       this.extractValue(xmlLimpo, /<Protocolo>(.*?)<\/Protocolo>/i);

      // Status
      const statusStr = this.extractValue(xmlLimpo, /<cStat>(.*?)<\/cStat>/i) ||
                       this.extractValue(xmlLimpo, /<Status>(.*?)<\/Status>/i);
      if (statusStr) {
        dados.status = statusStr;
      }

      // Data de autorização/processamento
      const dataAutorizacaoStr = this.extractValue(xmlLimpo, /<dhProc>(.*?)<\/dhProc>/i) ||
                                this.extractValue(xmlLimpo, /<DataAutorizacao>(.*?)<\/DataAutorizacao>/i);

      if (dataAutorizacaoStr) {
        dados.data_autorizacao = this.parseDate(dataAutorizacaoStr);
      }

      // Código de verificação
      dados.codigo_verificacao = this.extractValue(xmlLimpo, /<CodigoVerificacao>(.*?)<\/CodigoVerificacao>/i);

      // Natureza da operação
      dados.natureza_operacao = this.extractValue(xmlLimpo, /<tpEmit>(.*?)<\/tpEmit>/i) ||
                               this.extractValue(xmlLimpo, /<NaturezaOperacao>(.*?)<\/NaturezaOperacao>/i);

      // Dados do Prestador (emitente)
      dados.prestador = {
        cnpj: this.extractValue(xmlLimpo, /<emit>[\s\S]*?<CNPJ>(.*?)<\/CNPJ>[\s\S]*?<\/emit>/i) ||
              this.extractValue(xmlLimpo, /<prest>[\s\S]*?<CNPJ>(.*?)<\/CNPJ>[\s\S]*?<\/prest>/i) ||
              this.extractValue(xmlLimpo, /<Cnpj>(.*?)<\/Cnpj>/i) ||
              this.extractValue(xmlLimpo, /<CNPJ>(.*?)<\/CNPJ>/i),
        razao_social: this.extractValue(xmlLimpo, /<emit>[\s\S]*?<xNome>(.*?)<\/xNome>[\s\S]*?<\/emit>/i) ||
                     this.extractValue(xmlLimpo, /<RazaoSocial>(.*?)<\/RazaoSocial>/i),
        endereco: this.extractValue(xmlLimpo, /<enderNac>[\s\S]*?<xLgr>(.*?)<\/xLgr>[\s\S]*?<\/enderNac>/i) ||
                 this.extractValue(xmlLimpo, /<Endereco>(.*?)<\/Endereco>/i),
        numero: this.extractValue(xmlLimpo, /<enderNac>[\s\S]*?<nro>(.*?)<\/nro>[\s\S]*?<\/enderNac>/i) ||
               this.extractValue(xmlLimpo, /<Numero>(.*?)<\/Numero>/i),
        bairro: this.extractValue(xmlLimpo, /<enderNac>[\s\S]*?<xBairro>(.*?)<\/xBairro>[\s\S]*?<\/enderNac>/i) ||
               this.extractValue(xmlLimpo, /<Bairro>(.*?)<\/Bairro>/i),
        cidade: this.extractValue(xmlLimpo, /<xLocEmi>(.*?)<\/xLocEmi>/i) ||
               this.extractValue(xmlLimpo, /<Cidade>(.*?)<\/Cidade>/i),
        uf: this.extractValue(xmlLimpo, /<enderNac>[\s\S]*?<UF>(.*?)<\/UF>[\s\S]*?<\/enderNac>/i) ||
           this.extractValue(xmlLimpo, /<Uf>(.*?)<\/Uf>/i) ||
           this.extractValue(xmlLimpo, /<UF>(.*?)<\/UF>/i),
        cep: this.extractValue(xmlLimpo, /<enderNac>[\s\S]*?<CEP>(.*?)<\/CEP>[\s\S]*?<\/enderNac>/i) ||
            this.extractValue(xmlLimpo, /<Cep>(.*?)<\/Cep>/i),
        telefone: this.extractValue(xmlLimpo, /<fone>(.*?)<\/fone>/i) ||
                 this.extractValue(xmlLimpo, /<Telefone>(.*?)<\/Telefone>/i),
        email: this.extractValue(xmlLimpo, /<email>(.*?)<\/email>/i) ||
              this.extractValue(xmlLimpo, /<Email>(.*?)<\/Email>/i)
      };

      // Dados do Tomador
      dados.tomador = {
        cnpj_cpf: this.extractValue(xmlLimpo, /<toma>[\s\S]*?<CNPJ>(.*?)<\/CNPJ>[\s\S]*?<\/toma>/i) ||
                 this.extractValue(xmlLimpo, /<CpfCnpj>(.*?)<\/CpfCnpj>/i) ||
                 this.extractValue(xmlLimpo, /<CPF>(.*?)<\/CPF>/i),
        razao_social: this.extractValue(xmlLimpo, /<toma>[\s\S]*?<xNome>(.*?)<\/xNome>[\s\S]*?<\/toma>/i) ||
                     this.extractValue(xmlLimpo, /<RazaoSocialTomador>(.*?)<\/RazaoSocialTomador>/i),
        endereco: this.extractValue(xmlLimpo, /<end>[\s\S]*?<xLgr>(.*?)<\/xLgr>[\s\S]*?<\/end>/i) ||
                 this.extractValue(xmlLimpo, /<EnderecoTomador>(.*?)<\/EnderecoTomador>/i),
        numero: this.extractValue(xmlLimpo, /<end>[\s\S]*?<nro>(.*?)<\/nro>[\s\S]*?<\/end>/i) ||
               this.extractValue(xmlLimpo, /<NumeroTomador>(.*?)<\/NumeroTomador>/i),
        bairro: this.extractValue(xmlLimpo, /<end>[\s\S]*?<xBairro>(.*?)<\/xBairro>[\s\S]*?<\/end>/i) ||
               this.extractValue(xmlLimpo, /<BairroTomador>(.*?)<\/BairroTomador>/i),
        cidade: this.extractValue(xmlLimpo, /<CidadeTomador>(.*?)<\/CidadeTomador>/i),
        uf: this.extractValue(xmlLimpo, /<UfTomador>(.*?)<\/UfTomador>/i),
        cep: this.extractValue(xmlLimpo, /<endNac>[\s\S]*?<CEP>(.*?)<\/CEP>[\s\S]*?<\/endNac>/i) ||
            this.extractValue(xmlLimpo, /<CepTomador>(.*?)<\/CepTomador>/i),
        email: this.extractValue(xmlLimpo, /<toma>[\s\S]*?<email>(.*?)<\/email>[\s\S]*?<\/toma>/i) ||
              this.extractValue(xmlLimpo, /<EmailTomador>(.*?)<\/EmailTomador>/i)
      };

      // Status e outras informações
      dados.status = this.extractValue(xmlLimpo, /<Status>(.*?)<\/Status>/i);
      dados.protocolo = this.extractValue(xmlLimpo, /<Protocolo>(.*?)<\/Protocolo>/i);
      dados.numero_rps = this.extractValue(xmlLimpo, /<NumeroRPS>(.*?)<\/NumeroRPS>/i);
      dados.serie_rps = this.extractValue(xmlLimpo, /<SerieRPS>(.*?)<\/SerieRPS>/i);
      dados.natureza_operacao = this.extractValue(xmlLimpo, /<NaturezaOperacao>(.*?)<\/NaturezaOperacao>/i);

      // Data de autorização já foi extraída acima

      dados.codigo_verificacao = this.extractValue(xmlLimpo, /<CodigoVerificacao>(.*?)<\/CodigoVerificacao>/i);

      logger.info('XML da NFS-e parseado com sucesso', {
        numero: dados.numero,
        serie: dados.serie,
        chave_acesso: dados.chave_acesso,
        valor_total: dados.valor_total,
        prestador_cnpj: dados.prestador?.cnpj,
        tomador_cnpj: dados.tomador?.cnpj_cpf
      });

      return dados;

    } catch (error) {
      logger.error('Erro ao fazer parsing do XML da NFS-e:', {
        error: error instanceof Error ? error.message : String(error),
        xmlLength: xmlContent?.length || 0
      });
      return {};
    }
  }

  /**
   * Extrai valor de uma tag XML usando regex
   */
  private static extractValue(xml: string, regex: RegExp): string | undefined {
    const match = xml.match(regex);
    return match ? match[1]?.trim() : undefined;
  }

  /**
   * Extrai atributo de uma tag XML
   */
  private static extractAttribute(xml: string, tagName: string, attributeName: string): string | undefined {
    const regex = new RegExp(`<${tagName}[^>]*${attributeName}="([^"]*)"[^>]*>`, 'i');
    const match = xml.match(regex);
    return match ? match[1]?.trim() : undefined;
  }

  /**
   * Converte string para Date
   */
  private static parseDate(dateStr: string): Date | undefined {
    try {
      // Tenta diferentes formatos de data
      const formats = [
        /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/, // ISO
        /^(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
        /^(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
        /^(\d{4})\/(\d{2})\/(\d{2})/  // YYYY/MM/DD
      ];

      for (const format of formats) {
        const match = dateStr.match(format);
        if (match) {
          if (match.length === 7) { // Com hora
            return new Date(
              parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]),
              parseInt(match[4]), parseInt(match[5]), parseInt(match[6])
            );
          } else { // Sem hora
            return new Date(parseInt(match[3] || match[1]), parseInt(match[2]) - 1, parseInt(match[1] === match[3] ? match[2] : match[1]));
          }
        }
      }

      // Última tentativa: construtor nativo
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? undefined : date;

    } catch (error) {
      logger.debug('Erro ao parsear data:', { dateStr, error });
      return undefined;
    }
  }

  /**
   * Converte string para decimal
   */
  private static parseDecimal(valueStr: string): number | undefined {
    try {
      // Remove caracteres não numéricos exceto . e ,
      const cleaned = valueStr.replace(/[^\d.,]/g, '');

      // Converte , para . e depois para número
      const normalized = cleaned.replace(',', '.');
      const parsed = parseFloat(normalized);

      return isNaN(parsed) ? undefined : parsed;
    } catch (error) {
      logger.debug('Erro ao parsear decimal:', { valueStr, error });
      return undefined;
    }
  }

  /**
   * Atualiza uma nota fiscal com dados extraídos do XML
   */
  static async atualizarNotaFiscalComXml(notaFiscalId: number, xmlContent: string): Promise<boolean> {
    try {
      const dadosXml = await this.parseXml(xmlContent);

      if (Object.keys(dadosXml).length === 0) {
        logger.warn('Nenhum dado extraído do XML', { notaFiscalId });
        return false;
      }

      // Importa o modelo aqui para evitar dependências circulares
      const { NotaFiscal } = await import('../../../models/NotaFiscal');

      const notaFiscal = await NotaFiscal.findByPk(notaFiscalId);
      if (!notaFiscal) {
        logger.error('Nota fiscal não encontrada para atualização', { notaFiscalId });
        return false;
      }

      const updates: Partial<typeof notaFiscal> = {};

      // Atualiza campos básicos
      if (dadosXml.numero && !notaFiscal.numero) {
        updates.numero = dadosXml.numero;
      }

      if (dadosXml.serie && !notaFiscal.serie) {
        updates.serie = dadosXml.serie;
      }

      if (dadosXml.chave_acesso && !notaFiscal.chave_acesso) {
        updates.chave_acesso = dadosXml.chave_acesso;
      }

      if (dadosXml.data_emissao && !notaFiscal.data_emissao) {
        updates.data_emissao = dadosXml.data_emissao;
      }

      if (dadosXml.valor_total && !notaFiscal.valor_total) {
        updates.valor_total = dadosXml.valor_total;
      }

      if (dadosXml.valor_servicos && !notaFiscal.valor_servicos) {
        updates.valor_servicos = dadosXml.valor_servicos;
      }

      if (dadosXml.valor_deducoes && !notaFiscal.valor_desconto) {
        updates.valor_desconto = dadosXml.valor_deducoes;
      }

      if (dadosXml.aliquota_iss && !notaFiscal.aliquota_iss) {
        updates.aliquota_iss = dadosXml.aliquota_iss;
      }

      if (dadosXml.discriminacao_servico && !notaFiscal.descricao) {
        updates.descricao = dadosXml.discriminacao_servico;
      }

      if (dadosXml.protocolo && !notaFiscal.protocolo) {
        updates.protocolo = dadosXml.protocolo;
      }

      if (dadosXml.data_autorizacao && !notaFiscal.data_autorizacao) {
        updates.data_autorizacao = dadosXml.data_autorizacao;
      }

      if (Object.keys(updates).length > 0) {
        await notaFiscal.update(updates);
        logger.info('Nota fiscal atualizada com dados do XML', {
          notaFiscalId,
          camposAtualizados: Object.keys(updates)
        });
        return true;
      }

      logger.info('Nenhum campo precisou ser atualizado', { notaFiscalId });
      return true;

    } catch (error) {
      logger.error('Erro ao atualizar nota fiscal com XML:', {
        notaFiscalId,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
}
