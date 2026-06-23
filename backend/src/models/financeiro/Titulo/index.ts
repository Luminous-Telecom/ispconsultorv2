import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  BelongsToCreateAssociationMixin,
  Op,
  Sequelize
} from 'sequelize';
import { sequelize } from '../../../config/database';
import { logger } from '../../../utils/logger';
import { Cliente } from '../../clientes/Cliente';
import { Plano } from '../../cadastros/Plano';
import { Banco } from '../../cadastros/Banco';

export class Titulo extends Model<
  InferAttributes<Titulo>,
  InferCreationAttributes<Titulo>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number | null;
  declare cliente_id: number;
  declare plano_id: number;
  declare banco_id: number;
  declare contrato_id: number | null;
  declare numero_titulo: string;
  declare valor: number;
  declare data_vencimento: Date;
  declare status: 'pendente' | 'pago' | 'vencido' | 'cancelado' | 'parcial' | 'pago_atraso';
  declare pago: boolean;
  declare data_pagamento: Date | null;
  declare valor_pago: number | null;
  declare valor_aberto: number | null;
  declare codigo_barras: string | null;
  declare linha_digitavel: string | null;
  declare qrcode: string | null;
  declare qrcode_image: string | null;
  declare observacoes: string | null;
  declare desconto_percentual: number | null;
  declare desconto_valor: number | null;
  declare acrescimo_percentual: number | null;
  declare acrescimo_valor: number | null;
  declare valor_final: number | null;
  declare descricao: string | null;
  declare charge_id: string | null;
  declare url_boleto: string | null;
  declare nosso_numero: string | null;
  declare is_avulso: boolean;
  declare nota_fiscal_id: number | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  // Relacionamentos
  declare getCliente: BelongsToGetAssociationMixin<Cliente>;
  declare setCliente: BelongsToSetAssociationMixin<Cliente, number>;
  declare createCliente: BelongsToCreateAssociationMixin<Cliente>;
  
  declare getPlano: BelongsToGetAssociationMixin<Plano>;
  declare setPlano: BelongsToSetAssociationMixin<Plano, number>;
  declare createPlano: BelongsToCreateAssociationMixin<Plano>;
  
  declare getBanco: BelongsToGetAssociationMixin<Banco>;
  declare setBanco: BelongsToSetAssociationMixin<Banco, number>;
  declare createBanco: BelongsToCreateAssociationMixin<Banco>;

  // Métodos de instância
  static async findPendentes(): Promise<Titulo[]> {
    return this.findAll({
      where: { status: 'pendente' },
      include: [
        { association: 'cliente' },
        { association: 'plano' },
        { association: 'banco' }
      ],
      order: [['data_vencimento', 'ASC']]
    });
  }

  static async findVencidas(): Promise<Titulo[]> {
    return this.findAll({
      where: { status: 'vencido' },
      include: [
        { association: 'cliente' },
        { association: 'plano' },
        { association: 'banco' }
      ],
      order: [['data_vencimento', 'ASC']]
    });
  }

  static async findPagas(): Promise<Titulo[]> {
    return this.findAll({
      where: { status: 'pago' },
      include: [
        { association: 'cliente' },
        { association: 'plano' },
        { association: 'banco' }
      ],
      order: [['data_pagamento', 'DESC']]
    });
  }

  static async findVencidasHoje(): Promise<Titulo[]> {
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);
    
    return this.findAll({
      where: {
        data_vencimento: {
          [Op.lte]: hoje
        },
        status: 'pendente'
      },
      include: [
        { association: 'cliente' },
        { association: 'plano' },
        { association: 'banco' }
      ],
      order: [['data_vencimento', 'ASC']]
    });
  }

  async marcarComoPago(valorPago?: number, dataPagamento?: Date, skipLiquidacaoBanco = false): Promise<void> {
    const valor = valorPago || this.valor;
    const agora = new Date();

    // Normalizar data de pagamento
    let data: Date;
    if (dataPagamento) {
      const dp = new Date(dataPagamento);
      // Se for meia-noite, usar hora atual
      if (dp.getHours() === 0 && dp.getMinutes() === 0 && dp.getSeconds() === 0 && dp.getMilliseconds() === 0) {
        data = new Date(dp.getFullYear(), dp.getMonth(), dp.getDate(), agora.getHours(), agora.getMinutes(), agora.getSeconds(), agora.getMilliseconds());
      } else {
        data = new Date(dp.getFullYear(), dp.getMonth(), dp.getDate(), dp.getHours(), dp.getMinutes(), dp.getSeconds(), dp.getMilliseconds());
      }
    } else {
      data = new Date(agora);
    }

    const valorTotal = Number(this.valor);
    const valorPagoNum = Number(valor);

    // Determinar status
    let novoStatus: 'pago' | 'parcial' | 'pago_atraso';
    let valorAberto: number | null = null;
    let estaPago = false;

    if (valorPagoNum < valorTotal) {
      novoStatus = 'parcial';
      valorAberto = valorTotal - valorPagoNum;
      estaPago = false;
    } else {
      const vencDia = new Date(this.data_vencimento);
      vencDia.setHours(0, 0, 0, 0);
      const pagDia = new Date(data);
      pagDia.setHours(0, 0, 0, 0);

      novoStatus = pagDia > vencDia ? 'pago_atraso' : 'pago';
      estaPago = true;
      valorAberto = null;
    }

    // Formatar data para salvar no banco usando utilitário centralizado
    // Aqui não ajustamos vencimento (sábado/domingo) pois é a data efetiva do pagamento
    // E mantemos a hora para registro preciso (true)
    const dataPagamentoLiteral = data;

    await this.update({
      pago: estaPago,
      data_pagamento: dataPagamentoLiteral,
      valor_pago: valor,
      valor_aberto: valorAberto,
      status: novoStatus
    });

    // Incrementar métrica de boletos pagos se métricas estiverem habilitadas
    // Apenas quando o título é totalmente pago (não parcial)
    if (estaPago && novoStatus === 'pago') {
      const { metrics, isMetricsEnabled } = await import('../../../utils/metrics');
      if (isMetricsEnabled() && metrics) {
        metrics.businessBoletosPagos.inc();
      }
    }

    // Integrar com banco externo se tiver charge_id e não for pagamento via webhook
    // (webhooks já indicam que o banco sabe do pagamento, não precisa liquidar novamente)
    if (this.charge_id && !skipLiquidacaoBanco) {
      try {
        logger.info('Iniciando liquidação no banco externo', {
          titulo_id: this.id,
          charge_id: this.charge_id,
          banco_id: this.banco_id
        });

        const { BancoApiService } = await import('../../../services/bancos/BancoApiService');
        
        // Carregar dados do banco para a liquidação
        const banco = await this.getBanco();
        if (!banco) {
          logger.error('Banco não encontrado para título', {
            titulo_id: this.id,
            banco_id: this.banco_id
          });
          return;
        }

        // Criar objeto compatível com TituloWithRelations
        // Adicionar propriedade banco ao objeto atual
        (this as Titulo & { banco?: Banco }).banco = banco;
        const tituloComBanco = this as Titulo & { banco?: Banco };
        
        // Liquidar título no banco externo
        const resultado = await BancoApiService.liquidarTitulo(tituloComBanco);
        
        if (!resultado.success) {
          logger.warn('Falha ao liquidar título no banco externo', {
            titulo_id: this.id,
            charge_id: this.charge_id,
            message: resultado.message
          });
        } else {
          logger.info('Título liquidado com sucesso no banco externo', {
            titulo_id: this.id,
            charge_id: this.charge_id
          });
        }
      } catch (error) {
        logger.error('Erro ao integrar com banco externo', {
          titulo_id: this.id,
          charge_id: this.charge_id,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
        // Não falhar a operação se a integração externa falhar
      }
    } else {
      logger.info('Título não possui charge_id, pulando liquidação no banco', {
        titulo_id: this.id,
        banco_id: this.banco_id
      });
    }
  }

  async desmarcarPago(): Promise<void> {
    await this.update({
      pago: false,
      data_pagamento: null,
      valor_pago: null,
      status: 'pendente'
    });
  }

  async marcarComoVencida(): Promise<void> {
    if (this.status === 'pendente') {
      await this.update({
        status: 'vencido'
      });
    }
  }

  async cancelar(): Promise<void> {
    await this.update({
      status: 'cancelado'
    });
  }


  async isVencida(): Promise<boolean> {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const dataVencimento = new Date(this.data_vencimento);
    dataVencimento.setHours(0, 0, 0, 0);
    
    return dataVencimento < hoje && this.status === 'pendente';
  }

  async getDiasAteVencimento(): Promise<number> {
    const hoje = new Date();
    const dataVencimento = new Date(this.data_vencimento);
    
    const diferenca = dataVencimento.getTime() - hoje.getTime();
    const dias = Math.ceil(diferenca / (1000 * 60 * 60 * 24));
    
    return dias;
  }

  async getDiasAtraso(): Promise<number> {
    if (!(await this.isVencida())) {
      return 0;
    }
    
    const hoje = new Date();
    const dataVencimento = new Date(this.data_vencimento);
    
    const diferenca = hoje.getTime() - dataVencimento.getTime();
    const dias = Math.ceil(diferenca / (1000 * 60 * 60 * 24));
    
    return dias;
  }

  async calcularValorComMultaJuros(banco?: Banco | null): Promise<number> {
    const valor = parseFloat(this.valor.toString());
    
    if (this.status === 'pago') {
      return valor;
    }
    
    if (!(await this.isVencida()) || !banco) {
      return valor;
    }
    
    const diasAtraso = await this.getDiasAtraso();
    
    const { FinancialCalculationsService } = await import('../../../services/FinancialCalculationsService');
    
    const resultado = FinancialCalculationsService.calcularJurosEMulta(valor, {
      percentual_multa: banco.percentual_multa,
      percentual_juros: banco.percentual_juros,
      diasAtraso
    });
    
    return resultado.valorFinal;
  }

  async gerarCodigoBarras(): Promise<string> {
    // Retornar o código de barras salvo no banco de dados
    // Se não houver, retornar string vazia
    return this.codigo_barras || '';
  }

  async gerarLinhaDigitavel(): Promise<string> {
    const codigoBarras = await this.gerarCodigoBarras();
    
    // Formato da linha digitável: 00000.00000 00000.000000 00000.000000 0 00000000000000
    const linhaDigitavel = 
      codigoBarras.substring(0, 5) + '.' +
      codigoBarras.substring(5, 10) + ' ' +
      codigoBarras.substring(10, 15) + '.' +
      codigoBarras.substring(15, 21) + ' ' +
      codigoBarras.substring(21, 26) + '.' +
      codigoBarras.substring(26, 32) + ' ' +
      codigoBarras.substring(32, 33) + ' ' +
      codigoBarras.substring(33);
    
    return linhaDigitavel;
  }

  async gerarNossoNumero(): Promise<string> {
    const _banco = await this.getBanco();
    
    // Formato: AAAAMMDD + ID do título (8 dígitos)
    const data = new Date();
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    const idTitulo = String(this.id).padStart(8, '0');
    
    const nossoNumero = `${ano}${mes}${dia}${idTitulo}`;
    
    // Atualizar o campo nosso_numero
    await this.update({ nosso_numero: nossoNumero });
    
    return nossoNumero;
  }

  /**
   * Formata data de pagamento para exibição
   */
  getDataPagamentoFormatada(): string | null {
    if (!this.data_pagamento) return null;
    
    try {
      const dateValue: unknown = this.getDataValue('data_pagamento');
      if (!dateValue) return null;
      
      // Se for string, extrair componentes diretamente
      if (typeof dateValue === 'string') {
        const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2}):(\d{2})/);
        if (match) {
          const [, year, month, day, hour, minute, second] = match;
          return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
        }
        return null;
      }
      
      // Se for Date, usar componentes locais
      if (dateValue instanceof Date) {
        const day = String(dateValue.getDate()).padStart(2, '0');
        const month = String(dateValue.getMonth() + 1).padStart(2, '0');
        const year = dateValue.getFullYear();
        const hour = String(dateValue.getHours()).padStart(2, '0');
        const minute = String(dateValue.getMinutes()).padStart(2, '0');
        const second = String(dateValue.getSeconds()).padStart(2, '0');
        
        return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
      }
      
      return null;
    } catch (error) {
      logger.error('Erro ao formatar data de pagamento', { 
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      return null;
    }
  }

  /**
   * Formata created_at para exibição (sem conversão de timezone)
   */
  getCreatedAtFormatada(): string | null {
    if (!this.created_at) return null;
    
    try {
      const dateValue: unknown = this.getDataValue('created_at');
      if (!dateValue) return null;
      
      // Se for string, extrair componentes diretamente
      if (typeof dateValue === 'string') {
        const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2}):(\d{2})/);
        if (match) {
          const [, year, month, day, hour, minute, second] = match;
          return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
        }
        return null;
      }
      
      // Se for Date, usar componentes locais (já convertido pelo Sequelize)
      if (dateValue instanceof Date) {
        const day = String(dateValue.getDate()).padStart(2, '0');
        const month = String(dateValue.getMonth() + 1).padStart(2, '0');
        const year = dateValue.getFullYear();
        const hour = String(dateValue.getHours()).padStart(2, '0');
        const minute = String(dateValue.getMinutes()).padStart(2, '0');
        const second = String(dateValue.getSeconds()).padStart(2, '0');
        
        return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
      }
      
      return null;
    } catch (error) {
      logger.error('Erro ao formatar created_at', { 
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      return null;
    }
  }

  /**
   * Busca o número da NFS-e através da nota fiscal vinculada
   */
  async getNfseNumero(): Promise<string | null> {
    if (!this.nota_fiscal_id) {
      return null;
    }
    
    try {
      const { NotaFiscal } = await import('../../nfse/NotaFiscal');
      const notaFiscal = await NotaFiscal.findByPk(this.nota_fiscal_id);
      return notaFiscal?.numero || null;
    } catch (error) {
      logger.error('Erro ao buscar número da NFS-e', {
        titulo_id: this.id,
        nota_fiscal_id: this.nota_fiscal_id,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      return null;
    }
  }

  /**
   * Busca o status da NFS-e através da nota fiscal vinculada
   */
  async getNfseStatus(): Promise<'agendado' | 'emitida' | 'cancelada' | 'rejeitada' | 'erro' | null> {
    if (!this.nota_fiscal_id) {
      return null;
    }
    
    try {
      const { NotaFiscal } = await import('../../nfse/NotaFiscal');
      const notaFiscal = await NotaFiscal.findByPk(this.nota_fiscal_id);
      return notaFiscal?.nfse_status || null;
    } catch (error) {
      logger.error('Erro ao buscar status da NFS-e', {
        titulo_id: this.id,
        nota_fiscal_id: this.nota_fiscal_id,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      return null;
    }
  }

  /**
   * Sobrescrever toJSON para incluir data_pagamento_formatada, created_at_formatada, nfse_numero e nfse_status
   */
  toJSON(): Record<string, unknown> {
    const json = this.get({ plain: true }) as Record<string, unknown>;
    json.data_pagamento_formatada = this.getDataPagamentoFormatada();
    json.created_at_formatada = this.getCreatedAtFormatada();
    
    // Incluir número e status da NFS-e se a nota fiscal estiver carregada
    if (this.nota_fiscal_id && (this as any).nota_fiscal) {
      const notaFiscal = (this as any).nota_fiscal;
      json.nfse_numero = notaFiscal?.numero || null;
      json.nfse_status = notaFiscal?.nfse_status || null;
    }
    
    return json;
  }

  async getResumo(): Promise<{
    numero_titulo: string;
    valor_original: number;
    valor_atual: number;
    data_vencimento: Date;
    status: string;
    pago: boolean;
    data_pagamento: Date | null;
    dias_vencimento: number;
    dias_atraso: number;
    valor_multa_juros: number;
    codigo_barras: string | null;
    linha_digitavel: string | null;
    url_boleto: string | null;
    nosso_numero: string | null;
  }> {
    const banco = await this.getBanco();
    
    const valorAtual = await this.calcularValorComMultaJuros(banco);
    const diasVencimento = await this.getDiasAteVencimento();
    const diasAtraso = await this.getDiasAtraso();
    const codigoBarras = this.codigo_barras || await this.gerarCodigoBarras();
    const linhaDigitavel = this.linha_digitavel || await this.gerarLinhaDigitavel();
    
    return {
      numero_titulo: this.numero_titulo,
      valor_original: parseFloat(this.valor.toString()),
      valor_atual: valorAtual,
      data_vencimento: this.data_vencimento,
      status: this.status,
      pago: this.pago,
      data_pagamento: this.data_pagamento,
      dias_vencimento: diasVencimento,
      dias_atraso: diasAtraso,
      valor_multa_juros: valorAtual - parseFloat(this.valor.toString()),
      codigo_barras: codigoBarras,
      linha_digitavel: linhaDigitavel,
      url_boleto: this.url_boleto,
      nosso_numero: this.nosso_numero
    };
  }
}

Titulo.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    cliente_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'clientes',
        key: 'id'
      }
    },
    plano_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'cadastros_planos',
        key: 'id'
      }
    },
    banco_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'cadastros_bancos',
        key: 'id'
      }
    },
    contrato_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID do contrato relacionado'
    },
    numero_titulo: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    valor: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0.01
      }
    },
    data_vencimento: {
      type: DataTypes.DATE,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pendente', 'pago', 'vencido', 'cancelado', 'parcial', 'pago_atraso'),
      allowNull: false,
      defaultValue: 'pendente'
    },
    pago: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    data_pagamento: {
      type: DataTypes.DATE,
      allowNull: true
    },
    valor_pago: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    valor_aberto: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Valor restante em aberto (para pagamentos parciais)'
    },
    codigo_barras: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    linha_digitavel: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    qrcode: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    qrcode_image: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    desconto_percentual: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    },
    desconto_valor: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0
      }
    },
    acrescimo_percentual: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    },
    acrescimo_valor: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0
      }
    },
    valor_final: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Valor final após aplicar desconto/acréscimo'
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descrição do título'
    },
    charge_id: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    url_boleto: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    nosso_numero: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Número do título gerado pelo nosso sistema'
    },
    is_avulso: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indica se o título foi criado manualmente (avulso) ou gerado automaticamente pelo sistema'
    },
    nota_fiscal_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'nfse_notas_fiscais',
        key: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      comment: 'ID da nota fiscal vinculada ao título'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    modelName: 'Titulo',
    tableName: 'financeiro_titulos',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['cliente_id']
      },
      {
        fields: ['plano_id']
      },
      {
        fields: ['banco_id']
      },
      {
        fields: ['contrato_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['data_vencimento']
      },
      {
        fields: ['pago']
      },
      {
        fields: ['numero_titulo'],
        unique: true
      },
      {
        fields: ['nota_fiscal_id']
      }
    ]
  }
);
