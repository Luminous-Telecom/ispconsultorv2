import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  BelongsToCreateAssociationMixin,
  Op
} from 'sequelize';
import { sequelize } from '../config/database';
import { Cliente } from './Cliente';
import { Plano } from './Plano';
import { Banco } from './Banco';

export class Titulo extends Model<
  InferAttributes<Titulo>,
  InferCreationAttributes<Titulo>
> {
  declare id: CreationOptional<number>;
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

  async marcarComoPago(valorPago?: number, dataPagamento?: Date): Promise<void> {
    const valor = valorPago || this.valor;
    const data = dataPagamento || new Date();
    const valorTotal = Number(this.valor);
    const valorPagoNum = Number(valor);
    
    // Determinar status baseado no valor pago e data de pagamento
    let novoStatus: 'pago' | 'parcial' | 'pago_atraso';
    let valorAberto: number | null = null;
    let estaPago = false;
    
    // Verificar se é pagamento parcial
    if (valorPagoNum < valorTotal) {
      novoStatus = 'parcial';
      valorAberto = valorTotal - valorPagoNum;
      estaPago = false;
    } else {
      // Pagamento total - verificar se foi em atraso
      const dataVencimento = new Date(this.data_vencimento);
      const dataPagamentoDate = new Date(data);
      
      // Comparar apenas as datas (sem horário) para determinar se foi pago em dia
      const dataVencimentoSemHora = new Date(dataVencimento.getFullYear(), dataVencimento.getMonth(), dataVencimento.getDate());
      const dataPagamentoSemHora = new Date(dataPagamentoDate.getFullYear(), dataPagamentoDate.getMonth(), dataPagamentoDate.getDate());
      
      if (dataPagamentoSemHora > dataVencimentoSemHora) {
        novoStatus = 'pago_atraso';
      } else {
        novoStatus = 'pago';
      }
      estaPago = true;
      valorAberto = null;
    }
    
    // Atualizar no banco de dados local
    await this.update({
      pago: estaPago,
      data_pagamento: data,
      valor_pago: valor,
      valor_aberto: valorAberto,
      status: novoStatus
    });

    // Integrar com banco externo se tiver charge_id
    if (this.charge_id) {
      try {
        const { BancoApiService } = await import('../services/BancoApiService');
        
        // Carregar dados do banco para a liquidação
        const banco = await this.getBanco();
        const tituloComBanco = { ...this.toJSON(), banco };
        
        // Liquidar título no banco externo
        const resultado = await BancoApiService.liquidarTitulo(tituloComBanco);
        
        if (!resultado.success) {
          console.warn('Falha ao liquidar título no banco externo:', resultado.message);
        } else {
          console.log('Título liquidado com sucesso no banco externo');
        }
      } catch (error) {
        console.error('Erro ao integrar com banco externo:', error);
        // Não falhar a operação se a integração externa falhar
      }
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

  async calcularValorComMultaJuros(banco?: any): Promise<number> {
    let valor = parseFloat(this.valor.toString());
    
    if (this.status === 'pago') {
      return valor;
    }
    
    if (!(await this.isVencida()) || !banco) {
      return valor;
    }
    
    const diasAtraso = await this.getDiasAtraso();
    
    if (diasAtraso > 0) {
      // Calcular multa
      if (banco.percentual_multa) {
        const multa = valor * (banco.percentual_multa / 100);
        valor += multa;
      }
      
      // Calcular juros
      if (banco.percentual_juros) {
        const juros = valor * (banco.percentual_juros / 100) * diasAtraso;
        valor += juros;
      }
    }
    
    return Math.round(valor * 100) / 100; // Arredondar para 2 casas decimais
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
    const banco = await this.getBanco();
    
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
        model: 'planos',
        key: 'id'
      }
    },
    banco_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'bancos',
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
      type: DataTypes.STRING(500),
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
    tableName: 'titulos',
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
      }
    ]
  }
);
