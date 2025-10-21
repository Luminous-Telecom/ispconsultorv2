import { Cliente } from '../models/Cliente';
import { Contrato } from '../models/Contrato';
import { Titulo } from '../models/Titulo';
import { Plano } from '../models/Plano';
import { Op } from 'sequelize';

interface DadosVariaveis {
  cliente?: Cliente;
  contrato?: Contrato;
  titulo?: Titulo;
  dataReferencia?: Date;
}

export class VariaveisDocumentoService {
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
          { variavel: '#cliente.cpf_cnpj#', descricao: 'CPF/CNPJ' },
          { variavel: '#cliente.email#', descricao: 'E-mail' },
          { variavel: '#cliente.telefone#', descricao: 'Telefone' },
          { variavel: '#cliente.celular#', descricao: 'Celular' },
          { variavel: '#cliente.endereco#', descricao: 'Endereço completo' },
          { variavel: '#cliente.logradouro#', descricao: 'Logradouro' },
          { variavel: '#cliente.numero#', descricao: 'Número' },
          { variavel: '#cliente.complemento#', descricao: 'Complemento' },
          { variavel: '#cliente.bairro#', descricao: 'Bairro' },
          { variavel: '#cliente.cidade#', descricao: 'Cidade' },
          { variavel: '#cliente.estado#', descricao: 'Estado' },
          { variavel: '#cliente.cep#', descricao: 'CEP' },
        ]
      },
      contrato: {
        titulo: 'Dados do Contrato',
        variaveis: [
          { variavel: '#contrato.id#', descricao: 'ID do contrato' },
          { variavel: '#contrato.plano#', descricao: 'Nome do plano' },
          { variavel: '#contrato.valor_mensal#', descricao: 'Valor mensal do plano' },
          { variavel: '#contrato.valor_final#', descricao: 'Valor final com descontos' },
          { variavel: '#contrato.desconto_percentual#', descricao: 'Desconto percentual' },
          { variavel: '#contrato.desconto_valor#', descricao: 'Desconto em valor' },
          { variavel: '#contrato.data_inicio#', descricao: 'Data de início' },
          { variavel: '#contrato.data_fim#', descricao: 'Data de fim' },
          { variavel: '#contrato.status#', descricao: 'Status do contrato' },
          { variavel: '#contrato.dia_vencimento#', descricao: 'Dia de vencimento' },
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

    // Processar variáveis financeiras
    if (dados.cliente) {
      resultado = await this.processarVariaveisFinanceiro(resultado, dados.cliente, dataRef);
    }

    // Processar variáveis do sistema
    resultado = this.processarVariaveisSistema(resultado, dataRef);

    return resultado;
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
      '#cliente.email#': cliente.email || '',
      '#cliente.telefone#': cliente.telefone || '',
      '#cliente.celular#': cliente.whatsapp || '',
      '#cliente.endereco#': enderecoCompleto,
      '#cliente.logradouro#': cliente.endereco || '',
      '#cliente.numero#': cliente.numero || '',
      '#cliente.complemento#': cliente.complemento || '',
      '#cliente.bairro#': cliente.bairro || '',
      '#cliente.cidade#': cliente.cidade || '',
      '#cliente.estado#': cliente.estado || '',
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

    const substituicoes: Record<string, string> = {
      '#contrato.id#': String(contrato.id),
      '#contrato.plano#': contrato.plano?.nome_plano || '',
      '#contrato.valor_mensal#': this.formatarMoeda(contrato.plano?.valor_mensal || 0),
      '#contrato.valor_final#': this.formatarMoeda(contrato.valor_final || 0),
      '#contrato.desconto_percentual#': String(contrato.desconto_percentual || 0),
      '#contrato.desconto_valor#': this.formatarMoeda(contrato.desconto_valor || 0),
      '#contrato.data_inicio#': contrato.data_inicio ? this.formatarData(new Date(contrato.data_inicio)) : '',
      '#contrato.data_fim#': contrato.data_fim ? this.formatarData(new Date(contrato.data_fim)) : '',
      '#contrato.status#': contrato.status || '',
      '#contrato.dia_vencimento#': String(contrato.dia_vencimento || ''),
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

