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
import { Carne } from './Carne';

export class CarneParcela extends Model<
  InferAttributes<CarneParcela>,
  InferCreationAttributes<CarneParcela>
> {
  declare id: CreationOptional<number>;
  declare carne_id: number;
  declare numero_parcela: number;
  declare valor_parcela: number;
  declare tipo: string | null;
  declare data_vencimento: Date;
  declare pago: boolean;
  declare data_pagamento: Date | null;
  declare valor_pago: number | null;
  declare status: 'pendente' | 'pago' | 'vencido' | 'cancelado';
  declare codigo_barras: string | null;
  declare linha_digitavel: string | null;
  declare qrcode: string | null;
  declare qrcode_image: string | null;
  declare observacoes: string | null;
  declare charge_id: string | null;
  declare url_boleto: string | null;
  declare nosso_numero: string | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  // Relacionamentos
  declare getCarne: BelongsToGetAssociationMixin<Carne>;
  declare setCarne: BelongsToSetAssociationMixin<Carne, number>;
  declare createCarne: BelongsToCreateAssociationMixin<Carne>;

  // Métodos de instância
  static async findPendentes(): Promise<CarneParcela[]> {
    return this.findAll({
      where: { status: 'pendente' },
      include: [{ association: 'carne' }],
      order: [['data_vencimento', 'ASC']]
    });
  }

  static async findVencidas(): Promise<CarneParcela[]> {
    return this.findAll({
      where: { status: 'vencido' },
      include: [{ association: 'carne' }],
      order: [['data_vencimento', 'ASC']]
    });
  }

  static async findPagas(): Promise<CarneParcela[]> {
    return this.findAll({
      where: { status: 'pago' },
      include: [{ association: 'carne' }],
      order: [['data_pagamento', 'DESC']]
    });
  }

  static async findVencidasHoje(): Promise<CarneParcela[]> {
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);
    
    return this.findAll({
      where: {
        data_vencimento: {
          [Op.lte]: hoje
        },
        status: 'pendente'
      },
      include: [{ association: 'carne' }],
      order: [['data_vencimento', 'ASC']]
    });
  }

  async marcarComoPago(valorPago?: number, dataPagamento?: Date): Promise<void> {
    const valor = valorPago || this.valor_parcela;
    const data = dataPagamento || new Date();
    
    await this.update({
      pago: true,
      data_pagamento: data,
      valor_pago: valor,
      status: 'pago'
    });

    // Atualizar status do carnê
    const carne = await this.getCarne();
    await carne.verificarEAtualizarStatus();
  }

  async desmarcarPago(): Promise<void> {
    await this.update({
      pago: false,
      data_pagamento: null,
      valor_pago: null,
      status: 'pendente'
    });

    // Atualizar status do carnê
    const carne = await this.getCarne();
    await carne.verificarEAtualizarStatus();
  }

  async marcarComoVencida(): Promise<void> {
    if (this.status === 'pendente') {
      await this.update({
        status: 'vencido'
      });

      // Atualizar status do carnê
      const carne = await this.getCarne();
      await carne.verificarEAtualizarStatus();
    }
  }

  async cancelar(): Promise<void> {
    await this.update({
      status: 'cancelado'
    });

    // Atualizar status do carnê
    const carne = await this.getCarne();
    await carne.verificarEAtualizarStatus();
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
    if (!this.isVencida()) {
      return 0;
    }
    
    const hoje = new Date();
    const dataVencimento = new Date(this.data_vencimento);
    
    const diferenca = hoje.getTime() - dataVencimento.getTime();
    const dias = Math.ceil(diferenca / (1000 * 60 * 60 * 24));
    
    return dias;
  }

  async calcularValorComMultaJuros(banco?: any): Promise<number> {
    let valor = parseFloat(this.valor_parcela.toString());
    
    if (this.status === 'pago') {
      return valor;
    }
    
    if (!this.isVencida() || !banco) {
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
    // Implementar geração de código de barras igual ao PHP
    const carne = await this.getCarne();
    const banco = await carne.getBanco();
    
    // Formato do PHP: '237' + carne_id (8 dígitos) + parcela (2 dígitos) + '00000000000'
    // Usar código do banco ou '237' como padrão
    const codigoBanco = banco?.codigo || '237';
    const carneId = carne.id.toString().padStart(8, '0');
    const numeroParcela = this.numero_parcela.toString().padStart(2, '0');
    const zeros = '00000000000';
    
    const codigoCompleto = `${codigoBanco}${carneId}${numeroParcela}${zeros}`;
    
    // Garantir que o código tenha exatamente 47 caracteres para linha digitável
    // Se for menor, completar com zeros à direita
    const codigoFinal = codigoCompleto.padEnd(47, '0');
    
    return codigoFinal;
  }

  async gerarLinhaDigitavel(): Promise<string> {
    // Implementar geração de linha digitável igual ao PHP
    const codigoBarras = await this.gerarCodigoBarras();
    
    // Formato da linha digitável: 00000.00000 00000.000000 00000.000000 0 00000000000000
    // Dividir o código de barras em grupos específicos
    const codigo = codigoBarras;
    
    // Formato: 00000.00000 00000.000000 00000.000000 0 00000000000000
    const linhaDigitavel = 
      codigo.substring(0, 5) + '.' +
      codigo.substring(5, 10) + ' ' +
      codigo.substring(10, 15) + '.' +
      codigo.substring(15, 21) + ' ' +
      codigo.substring(21, 26) + '.' +
      codigo.substring(26, 32) + ' ' +
      codigo.substring(32, 33) + ' ' +
      codigo.substring(33);
    
    return linhaDigitavel;
  }

  async gerarNossoNumero(): Promise<string> {
    // Gerar nosso número baseado no ID da parcela e data
    const carne = await this.getCarne();
    const banco = await carne.getBanco();
    
    // Formato: AAAAMMDD + ID da parcela (8 dígitos) + número da parcela (2 dígitos)
    const data = new Date();
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    const idParcela = String(this.id).padStart(8, '0');
    const numeroParcela = String(this.numero_parcela).padStart(2, '0');
    
    const nossoNumero = `${ano}${mes}${dia}${idParcela}${numeroParcela}`;
    
    // Atualizar o campo nosso_numero
    await this.update({ nosso_numero: nossoNumero });
    
    return nossoNumero;
  }

  async getResumo(): Promise<{
    numero_parcela: number;
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
    const carne = await this.getCarne();
    const banco = await carne.getBanco();
    
    const valorAtual = await this.calcularValorComMultaJuros(banco);
    const diasVencimento = await this.getDiasAteVencimento();
    const diasAtraso = await this.getDiasAtraso();
    const codigoBarras = this.codigo_barras || await this.gerarCodigoBarras();
    const linhaDigitavel = this.linha_digitavel || await this.gerarLinhaDigitavel();
    
    return {
      numero_parcela: this.numero_parcela,
      valor_original: parseFloat(this.valor_parcela.toString()),
      valor_atual: valorAtual,
      data_vencimento: this.data_vencimento,
      status: this.status,
      pago: this.pago,
      data_pagamento: this.data_pagamento,
      dias_vencimento: diasVencimento,
      dias_atraso: diasAtraso,
      valor_multa_juros: valorAtual - parseFloat(this.valor_parcela.toString()),
      codigo_barras: codigoBarras,
      linha_digitavel: linhaDigitavel,
      url_boleto: this.url_boleto,
      nosso_numero: this.nosso_numero
    };
  }
}

CarneParcela.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    carne_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'carnes',
        key: 'id'
      }
    },
    numero_parcela: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    },
    valor_parcela: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0.01
      }
    },
    tipo: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'normal'
    },
    data_vencimento: {
      type: DataTypes.DATE,
      allowNull: false
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
    status: {
      type: DataTypes.ENUM('pendente', 'pago', 'vencido', 'cancelado'),
      allowNull: false,
      defaultValue: 'pendente'
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
    modelName: 'CarneParcela',
    tableName: 'carne_parcelas',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['carne_id']
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
        fields: ['carne_id', 'numero_parcela'],
        unique: true
      }
    ]
  }
);
