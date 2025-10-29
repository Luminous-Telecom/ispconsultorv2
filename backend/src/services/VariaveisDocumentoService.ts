import { Cliente } from '../models/Cliente';
import { Contrato } from '../models/Contrato';
import { Titulo } from '../models/Titulo';
import { Plano } from '../models/Plano';
import { DadosEmpresa } from '../models/DadosEmpresa';
import { Op } from 'sequelize';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface DadosVariaveis {
  cliente?: Cliente;
  contrato?: Contrato;
  titulo?: Titulo;
  dataReferencia?: Date;
}

export class VariaveisDocumentoService {
  // Cache para logo da empresa (evita conversões repetidas)
  private static logoCache: { url: string; base64: string } | null = null;

  /**
   * Lista de todas as variáveis disponíveis
   */
  static getVariaveisDisponiveis() {
    return {
      cliente: {
        titulo: 'Dados do Cliente',
        variaveis: [
          { variavel: '#cliente.id#', descricao: 'ID do cliente' },
          { variavel: '#cliente.razao_social#', descricao: 'Razão Social' },
          { variavel: '#cliente.nome_fantasia#', descricao: 'Nome Fantasia' },
          { variavel: '#cliente.cnpj#', descricao: 'CNPJ' },
          { variavel: '#cliente.cpf_cnpj#', descricao: 'CPF/CNPJ (legado)' },
          { variavel: '#cliente.email#', descricao: 'E-mail' },
          { variavel: '#cliente.telefone#', descricao: 'Telefone' },
          { variavel: '#cliente.whatsapp#', descricao: 'WhatsApp' },
          { variavel: '#cliente.celular#', descricao: 'Celular (legado)' },
          { variavel: '#cliente.endereco#', descricao: 'Endereço completo' },
          { variavel: '#cliente.logradouro#', descricao: 'Logradouro' },
          { variavel: '#cliente.numero#', descricao: 'Número' },
          { variavel: '#cliente.complemento#', descricao: 'Complemento' },
          { variavel: '#cliente.bairro#', descricao: 'Bairro' },
          { variavel: '#cliente.cidade#', descricao: 'Cidade' },
          { variavel: '#cliente.estado#', descricao: 'Estado (nome completo)' },
          { variavel: '#cliente.uf#', descricao: 'UF (sigla do estado)' },
          { variavel: '#cliente.cep#', descricao: 'CEP' },
        ]
      },
      contrato: {
        titulo: 'Dados do Contrato',
        variaveis: [
          { variavel: '#contrato.id#', descricao: 'ID do contrato' },
          { variavel: '#contrato.plano#', descricao: 'Nome do plano' },
          { variavel: '#contrato.valor_contrato#', descricao: 'Valor do contrato' },
          { variavel: '#contrato.valor_mensal#', descricao: 'Valor mensal do plano' },
          { variavel: '#contrato.valor_final#', descricao: 'Valor final com descontos' },
          { variavel: '#contrato.desconto_percentual#', descricao: 'Desconto percentual (%)' },
          { variavel: '#contrato.desconto_valor#', descricao: 'Desconto em valor (R$)' },
          { variavel: '#contrato.data_inicio#', descricao: 'Data de início do contrato' },
          { variavel: '#contrato.data_fim#', descricao: 'Data de fim do contrato' },
          { variavel: '#contrato.data_validade_desconto#', descricao: 'Validade do desconto' },
          { variavel: '#contrato.status#', descricao: 'Status do contrato' },
          { variavel: '#contrato.dia_vencimento#', descricao: 'Dia de vencimento' },
          { variavel: '#contrato.isento_mensalidade#', descricao: 'Isento de mensalidade (Sim/Não)' },
        ]
      },
      empresa: {
        titulo: 'Dados da Empresa',
        variaveis: [
          { variavel: '#empresa.razao_social#', descricao: 'Razão Social da empresa' },
          { variavel: '#empresa.nome_fantasia#', descricao: 'Nome Fantasia da empresa' },
          { variavel: '#empresa.cnpj#', descricao: 'CNPJ da empresa' },
          { variavel: '#empresa.ie#', descricao: 'Inscrição Estadual' },
          { variavel: '#empresa.im#', descricao: 'Inscrição Municipal' },
          { variavel: '#empresa.logo#', descricao: 'Logo da empresa (URL ou caminho)' },
          { variavel: '#empresa.endereco#', descricao: 'Endereço completo da empresa' },
          { variavel: '#empresa.logradouro#', descricao: 'Logradouro da empresa' },
          { variavel: '#empresa.numero#', descricao: 'Número da empresa' },
          { variavel: '#empresa.complemento#', descricao: 'Complemento da empresa' },
          { variavel: '#empresa.bairro#', descricao: 'Bairro da empresa' },
          { variavel: '#empresa.cidade#', descricao: 'Cidade da empresa' },
          { variavel: '#empresa.estado#', descricao: 'Estado (nome completo) da empresa' },
          { variavel: '#empresa.uf#', descricao: 'UF (sigla) da empresa' },
          { variavel: '#empresa.cep#', descricao: 'CEP da empresa' },
          { variavel: '#empresa.telefone#', descricao: 'Telefone da empresa' },
          { variavel: '#empresa.email#', descricao: 'E-mail da empresa' },
          { variavel: '#empresa.responsavel#', descricao: 'Responsável pela empresa' },
        ]
      },
      financeiro: {
        titulo: 'Dados Financeiros',
        variaveis: [
          { variavel: '#financeiro.total_aberto#', descricao: 'Total de valores em aberto' },
          { variavel: '#financeiro.total_vencido#', descricao: 'Total de valores vencidos' },
          { variavel: '#financeiro.total_pago#', descricao: 'Total já pago' },
          { variavel: '#financeiro.quantidade_titulos_abertos#', descricao: 'Quantidade de títulos em aberto' },
          { variavel: '#financeiro.quantidade_titulos_vencidos#', descricao: 'Quantidade de títulos vencidos' },
          { variavel: '#financeiro.maior_atraso_dias#', descricao: 'Maior atraso em dias' },
          { variavel: '#financeiro.total_juros#', descricao: 'Total de juros acumulados' },
          { variavel: '#financeiro.total_multa#', descricao: 'Total de multa acumulada' },
          { variavel: '#financeiro.valor_com_juros_multa#', descricao: 'Valor total com juros e multa' },
        ]
      },
      titulo: {
        titulo: 'Dados do Título/Parcela',
        variaveis: [
          { variavel: '#titulo.id#', descricao: 'ID do título' },
          { variavel: '#titulo.numero#', descricao: 'Número do título' },
          { variavel: '#titulo.valor#', descricao: 'Valor do título' },
          { variavel: '#titulo.valor_pago#', descricao: 'Valor pago' },
          { variavel: '#titulo.saldo#', descricao: 'Saldo devedor' },
          { variavel: '#titulo.vencimento#', descricao: 'Data de vencimento' },
          { variavel: '#titulo.pagamento#', descricao: 'Data de pagamento' },
          { variavel: '#titulo.status#', descricao: 'Status do título' },
          { variavel: '#titulo.dias_atraso#', descricao: 'Dias em atraso' },
          { variavel: '#titulo.juros#', descricao: 'Valor de juros' },
          { variavel: '#titulo.multa#', descricao: 'Valor de multa' },
          { variavel: '#titulo.descricao#', descricao: 'Descrição do título' },
          { variavel: '#titulo.codigo_pix#', descricao: 'Código PIX EMV (texto para copiar e colar)' },
          { variavel: '#titulo.codigo_barras#', descricao: 'Linha digitável' },
        ]
      },
      sistema: {
        titulo: 'Dados do Sistema',
        variaveis: [
          { variavel: '#sistema.data_atual#', descricao: 'Data atual' },
          { variavel: '#sistema.hora_atual#', descricao: 'Hora atual' },
          { variavel: '#sistema.data_hora_atual#', descricao: 'Data e hora atual' },
          { variavel: '#sistema.ano_atual#', descricao: 'Ano atual' },
          { variavel: '#sistema.mes_atual#', descricao: 'Mês atual' },
          { variavel: '#assinatura_consultor#', descricao: 'Espaço para assinatura do consultor (vazio)' },
          { variavel: '#assinatura_cliente#', descricao: 'Espaço para assinatura do cliente (vazio)' },
        ]
      }
    };
  }

  /**
   * Processa variáveis em um texto
   */
  static async processarVariaveis(
    conteudo: string,
    dados: DadosVariaveis
  ): Promise<string> {
    let resultado = conteudo;
    const dataRef = dados.dataReferencia || new Date();

    // Processar variáveis do cliente
    if (dados.cliente) {
      resultado = this.processarVariaveisCliente(resultado, dados.cliente);
    }

    // Processar variáveis do contrato
    if (dados.contrato) {
      resultado = await this.processarVariaveisContrato(resultado, dados.contrato);
    }

    // Processar variáveis do título
    if (dados.titulo) {
      resultado = this.processarVariaveisTitulo(resultado, dados.titulo, dataRef);
    }

    // Processar variáveis financeiras (só se houver variáveis no conteúdo)
    if (dados.cliente && resultado.includes('#financeiro.')) {
      resultado = await this.processarVariaveisFinanceiro(resultado, dados.cliente, dataRef);
    }

    // Processar variáveis do sistema
    resultado = this.processarVariaveisSistema(resultado, dataRef);

    // Processar variáveis da empresa
    resultado = await this.processarVariaveisEmpresa(resultado);

    return resultado;
  }

  /**
   * Converter UF para nome completo do estado
   */
  private static obterNomeEstado(uf: string): string {
    const estados: Record<string, string> = {
      'AC': 'Acre',
      'AL': 'Alagoas',
      'AP': 'Amapá',
      'AM': 'Amazonas',
      'BA': 'Bahia',
      'CE': 'Ceará',
      'DF': 'Distrito Federal',
      'ES': 'Espírito Santo',
      'GO': 'Goiás',
      'MA': 'Maranhão',
      'MT': 'Mato Grosso',
      'MS': 'Mato Grosso do Sul',
      'MG': 'Minas Gerais',
      'PA': 'Pará',
      'PB': 'Paraíba',
      'PR': 'Paraná',
      'PE': 'Pernambuco',
      'PI': 'Piauí',
      'RJ': 'Rio de Janeiro',
      'RN': 'Rio Grande do Norte',
      'RS': 'Rio Grande do Sul',
      'RO': 'Rondônia',
      'RR': 'Roraima',
      'SC': 'Santa Catarina',
      'SP': 'São Paulo',
      'SE': 'Sergipe',
      'TO': 'Tocantins'
    };
    
    return estados[uf.toUpperCase()] || uf;
  }

  /**
   * Processar variáveis do cliente
   */
  private static processarVariaveisCliente(conteudo: string, cliente: Cliente): string {
    let resultado = conteudo;

    const enderecoCompleto = [
      cliente.endereco,
      cliente.numero,
      cliente.complemento,
      cliente.bairro,
      cliente.cidade,
      cliente.estado
    ].filter(Boolean).join(', ');

    const substituicoes: Record<string, string> = {
      '#cliente.id#': String(cliente.id),
      '#cliente.razao_social#': cliente.razao_social || '',
      '#cliente.nome_fantasia#': cliente.nome_fantasia || '',
      '#cliente.cpf_cnpj#': cliente.cnpj || '',
      '#cliente.cnpj#': cliente.cnpj || '',
      '#cliente.email#': cliente.email || '',
      '#cliente.telefone#': cliente.telefone || '',
      '#cliente.celular#': cliente.whatsapp || '',
      '#cliente.whatsapp#': cliente.whatsapp || '',
      '#cliente.endereco#': enderecoCompleto,
      '#cliente.logradouro#': cliente.endereco || '',
      '#cliente.numero#': cliente.numero || '',
      '#cliente.complemento#': cliente.complemento || '',
      '#cliente.bairro#': cliente.bairro || '',
      '#cliente.cidade#': cliente.cidade || '',
      '#cliente.estado#': cliente.estado ? this.obterNomeEstado(cliente.estado) : '',
      '#cliente.uf#': cliente.estado || '',
      '#cliente.cep#': cliente.cep || '',
    };

    for (const [variavel, valor] of Object.entries(substituicoes)) {
      resultado = resultado.replace(new RegExp(variavel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), valor);
    }

    return resultado;
  }

  /**
   * Processar variáveis do contrato
   */
  private static async processarVariaveisContrato(conteudo: string, contrato: any): Promise<string> {
    let resultado = conteudo;

    // Buscar plano se não estiver carregado
    if (!contrato.plano) {
      const contratoCompleto: any = await Contrato.findByPk(contrato.id, {
        include: [{ model: Plano, as: 'plano' }]
      });
      if (contratoCompleto) {
        contrato = contratoCompleto;
      }
    }

    // Calcular valor do contrato (valor_final ou valor_mensal do plano)
    const valorContrato = contrato.valor_final || contrato.plano?.valor_mensal || 0;
    
    const substituicoes: Record<string, string> = {
      '#contrato.id#': String(contrato.id),
      '#contrato.plano#': contrato.plano?.nome_plano || '',
      '#contrato.valor_contrato#': this.formatarMoeda(valorContrato),
      '#contrato.valor_mensal#': this.formatarMoeda(contrato.plano?.valor_mensal || 0),
      '#contrato.valor_final#': this.formatarMoeda(contrato.valor_final || 0),
      '#contrato.desconto_percentual#': String(contrato.desconto_percentual || 0) + '%',
      '#contrato.desconto_valor#': this.formatarMoeda(contrato.desconto_valor || 0),
      '#contrato.data_inicio#': contrato.data_inicio ? this.formatarData(new Date(contrato.data_inicio)) : '',
      '#contrato.data_fim#': contrato.data_fim ? this.formatarData(new Date(contrato.data_fim)) : '',
      '#contrato.data_validade_desconto#': contrato.data_validade_desconto ? this.formatarData(new Date(contrato.data_validade_desconto)) : '',
      '#contrato.status#': contrato.status || '',
      '#contrato.dia_vencimento#': String(contrato.dia_vencimento || ''),
      '#contrato.isento_mensalidade#': contrato.isento_mensalidade ? 'Sim' : 'Não',
    };

    for (const [variavel, valor] of Object.entries(substituicoes)) {
      resultado = resultado.replace(new RegExp(variavel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), valor);
    }

    return resultado;
  }

  /**
   * Processar variáveis do título
   */
  private static processarVariaveisTitulo(conteudo: string, titulo: Titulo, dataRef: Date): string {
    let resultado = conteudo;

    const diasAtraso = titulo.data_vencimento && new Date(titulo.data_vencimento) < dataRef
      ? Math.floor((dataRef.getTime() - new Date(titulo.data_vencimento).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Calcular juros e multa (se não existir no modelo)
    const juros = (titulo.acrescimo_percentual || 0) > 0 ? (titulo.valor * (titulo.acrescimo_percentual || 0) / 100) : 0;
    const multa = (titulo.acrescimo_valor || 0) || 0;

    const substituicoes: Record<string, string> = {
      '#titulo.id#': String(titulo.id),
      '#titulo.numero#': titulo.numero_titulo || String(titulo.id),
      '#titulo.valor#': this.formatarMoeda(titulo.valor || 0),
      '#titulo.valor_pago#': this.formatarMoeda(titulo.valor_pago || 0),
      '#titulo.saldo#': this.formatarMoeda((titulo.valor || 0) - (titulo.valor_pago || 0)),
      '#titulo.vencimento#': titulo.data_vencimento ? this.formatarData(new Date(titulo.data_vencimento)) : '',
      '#titulo.pagamento#': titulo.data_pagamento ? this.formatarData(new Date(titulo.data_pagamento)) : '',
      '#titulo.status#': titulo.status || '',
      '#titulo.dias_atraso#': String(diasAtraso),
      '#titulo.juros#': this.formatarMoeda(juros),
      '#titulo.multa#': this.formatarMoeda(multa),
      '#titulo.descricao#': titulo.descricao || '',
      '#titulo.codigo_pix#': titulo.qrcode || '',
      '#titulo.codigo_barras#': titulo.linha_digitavel || '',
    };

    for (const [variavel, valor] of Object.entries(substituicoes)) {
      resultado = resultado.replace(new RegExp(variavel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), valor);
    }

    return resultado;
  }

  /**
   * Processar variáveis financeiras
   */
  private static async processarVariaveisFinanceiro(
    conteudo: string,
    cliente: Cliente,
    dataRef: Date
  ): Promise<string> {
    let resultado = conteudo;

    // Buscar todos os títulos do cliente
    const titulos = await Titulo.findAll({
      where: {
        cliente_id: cliente.id,
        status: { [Op.in]: ['pendente', 'vencido'] }
      }
    });

    let totalAberto = 0;
    let totalVencido = 0;
    let totalPago = 0;
    let quantidadeAbertos = 0;
    let quantidadeVencidos = 0;
    let maiorAtraso = 0;
    let totalJuros = 0;
    let totalMulta = 0;

    for (const titulo of titulos) {
      const valor = titulo.valor || 0;
      const valorPago = titulo.valor_pago || 0;
      const saldo = valor - valorPago;

      totalPago += valorPago;

      if (saldo > 0) {
        totalAberto += saldo;
        quantidadeAbertos++;

        const vencimento = titulo.data_vencimento ? new Date(titulo.data_vencimento) : null;
        if (vencimento && vencimento < dataRef) {
          totalVencido += saldo;
          quantidadeVencidos++;

          const diasAtraso = Math.floor((dataRef.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24));
          if (diasAtraso > maiorAtraso) {
            maiorAtraso = diasAtraso;
          }
        }

        // Calcular juros e multa
        const juros = (titulo.acrescimo_percentual || 0) > 0 ? (valor * (titulo.acrescimo_percentual || 0) / 100) : 0;
        const multa = (titulo.acrescimo_valor || 0) || 0;
        totalJuros += juros;
        totalMulta += multa;
      }
    }

    const valorComJurosMulta = totalAberto + totalJuros + totalMulta;

    const substituicoes: Record<string, string> = {
      '#financeiro.total_aberto#': this.formatarMoeda(totalAberto),
      '#financeiro.total_vencido#': this.formatarMoeda(totalVencido),
      '#financeiro.total_pago#': this.formatarMoeda(totalPago),
      '#financeiro.quantidade_titulos_abertos#': String(quantidadeAbertos),
      '#financeiro.quantidade_titulos_vencidos#': String(quantidadeVencidos),
      '#financeiro.maior_atraso_dias#': String(maiorAtraso),
      '#financeiro.total_juros#': this.formatarMoeda(totalJuros),
      '#financeiro.total_multa#': this.formatarMoeda(totalMulta),
      '#financeiro.valor_com_juros_multa#': this.formatarMoeda(valorComJurosMulta),
    };

    for (const [variavel, valor] of Object.entries(substituicoes)) {
      resultado = resultado.replace(new RegExp(variavel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), valor);
    }

    return resultado;
  }

  /**
   * Processar variáveis do sistema
   */
  private static processarVariaveisSistema(conteudo: string, dataRef: Date): string {
    let resultado = conteudo;

    const substituicoes: Record<string, string> = {
      '#sistema.data_atual#': this.formatarData(dataRef),
      '#sistema.hora_atual#': this.formatarHora(dataRef),
      '#sistema.data_hora_atual#': this.formatarDataHora(dataRef),
      '#sistema.ano_atual#': String(dataRef.getFullYear()),
      '#sistema.mes_atual#': String(dataRef.getMonth() + 1).padStart(2, '0'),
      '#assinatura_consultor#': '', // Vazio por padrão, só aparece se houver assinatura
      '#assinatura_cliente#': '', // Vazio por padrão, só aparece se houver assinatura
    };

    for (const [variavel, valor] of Object.entries(substituicoes)) {
      resultado = resultado.replace(new RegExp(variavel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), valor);
    }

    return resultado;
  }

  /**
   * Converter imagem para base64 com cache
   */
  private static async imagemParaBase64(logoUrl: string): Promise<string> {
    // Verificar cache
    if (this.logoCache && this.logoCache.url === logoUrl) {
      return this.logoCache.base64;
    }

    try {
      let base64Result = '';
      
      // Verificar se é URL ou caminho local
      if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
        // Baixar imagem da URL com timeout
        const response = await axios.get(logoUrl, { 
          responseType: 'arraybuffer',
          timeout: 5000 // 5 segundos de timeout
        });
        const base64 = Buffer.from(response.data, 'binary').toString('base64');
        const contentType = response.headers['content-type'] || 'image/png';
        base64Result = `data:${contentType};base64,${base64}`;
      } else {
        // Ler arquivo local
        const absolutePath = path.isAbsolute(logoUrl) 
          ? logoUrl 
          : path.join(process.cwd(), logoUrl);
        
        if (fs.existsSync(absolutePath)) {
          const imageBuffer = fs.readFileSync(absolutePath);
          const base64 = imageBuffer.toString('base64');
          const ext = path.extname(absolutePath).toLowerCase();
          const mimeTypes: Record<string, string> = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.webp': 'image/webp'
          };
          const contentType = mimeTypes[ext] || 'image/png';
          base64Result = `data:${contentType};base64,${base64}`;
        }
      }
      
      // Armazenar no cache se obteve sucesso
      if (base64Result) {
        this.logoCache = { url: logoUrl, base64: base64Result };
        return base64Result;
      }
    } catch (error) {
      console.error('Erro ao converter logo para base64:', error);
    }
    return '';
  }

  /**
   * Processar variáveis da empresa
   */
  private static async processarVariaveisEmpresa(conteudo: string): Promise<string> {
    let resultado = conteudo;

    // Buscar dados da empresa do banco de dados
    const empresa = await DadosEmpresa.findOne({
      order: [['id', 'DESC']] // Pega o registro mais recente
    });

    if (!empresa) {
      // Se não houver empresa cadastrada, retornar conteúdo sem processar
      return resultado;
    }

    // Montar endereço completo da empresa
    const enderecoCompleto = [
      empresa.endereco,
      empresa.numero,
      empresa.complemento,
      empresa.bairro,
      empresa.cidade,
      empresa.estado,
      empresa.cep
    ].filter(Boolean).join(', ');

    // Converter logo para base64 se existir e se a variável estiver no conteúdo
    const logoUrl = empresa.logo || '';
    let logoHtml = '';
    if (logoUrl && conteudo.includes('#empresa.logo#')) {
      const logoBase64 = await this.imagemParaBase64(logoUrl);
      if (logoBase64) {
        logoHtml = `<img src="${logoBase64}" alt="Logo da Empresa" style="max-width: 200px; height: auto;" />`;
      }
    }
    
    const substituicoes: Record<string, string> = {
      '#empresa.razao_social#': empresa.razao_social || '',
      '#empresa.nome_fantasia#': empresa.nome_fantasia || '',
      '#empresa.cnpj#': empresa.cnpj || '',
      '#empresa.ie#': empresa.inscricao_estadual || '',
      '#empresa.im#': empresa.inscricao_municipal || '',
      '#empresa.logo#': logoHtml,
      '#empresa.endereco#': enderecoCompleto,
      '#empresa.logradouro#': empresa.endereco || '',
      '#empresa.numero#': empresa.numero || '',
      '#empresa.complemento#': empresa.complemento || '',
      '#empresa.bairro#': empresa.bairro || '',
      '#empresa.cidade#': empresa.cidade || '',
      '#empresa.estado#': empresa.estado ? this.obterNomeEstado(empresa.estado) : '',
      '#empresa.uf#': empresa.estado || '',
      '#empresa.cep#': empresa.cep || '',
      '#empresa.telefone#': empresa.telefone || '',
      '#empresa.email#': empresa.email || '',
      '#empresa.responsavel#': empresa.responsavel_nome || '',
    };

    for (const [variavel, valor] of Object.entries(substituicoes)) {
      resultado = resultado.replace(new RegExp(variavel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), valor);
    }

    return resultado;
  }

  /**
   * Formatar moeda
   */
  private static formatarMoeda(valor: number): string {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  /**
   * Formatar data
   */
  private static formatarData(data: Date): string {
    return data.toLocaleDateString('pt-BR');
  }

  /**
   * Formatar hora
   */
  private static formatarHora(data: Date): string {
    return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Formatar data e hora
   */
  private static formatarDataHora(data: Date): string {
    return `${this.formatarData(data)} ${this.formatarHora(data)}`;
  }
}

