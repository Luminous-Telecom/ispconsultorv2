import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  HasManyGetAssociationsMixin,
  HasManyAddAssociationMixin,
  HasManyAddAssociationsMixin,
  HasManySetAssociationsMixin,
  HasManyRemoveAssociationMixin,
  HasManyRemoveAssociationsMixin,
  HasManyHasAssociationMixin,
  HasManyHasAssociationsMixin,
  HasManyCountAssociationsMixin,
  HasManyCreateAssociationMixin
} from 'sequelize';
import { sequelize } from '../../../config/database';
import { Fornecedor } from '../Fornecedor';
import { ContaPagarPagamento } from '../ContaPagarPagamento';
import { formatCreatedAt } from '../../../utils/dateUtils';

export class ContaPagar extends Model<
  InferAttributes<ContaPagar>,
  InferCreationAttributes<ContaPagar>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number | null;
  declare fornecedor_id: number;
  declare data_vencimento: Date;
  declare valor: number;
  declare tipo_pagamento: 'DINHEIRO' | 'BOLETO' | 'CARTAO' | 'DEPOSITO' | 'DEBITO_CONTA' | 'TRANSFERENCIA' | 'PIX';
  declare numero_documento: string | null;
  declare nota_fiscal: string | null;
  declare descricao: string | null;
  declare observacoes: string | null;
  declare linha_digitavel: string | null;
  declare tipo_chave_pix: 'CPF_CNPJ' | 'CELULAR' | 'EMAIL' | 'ALEATORIA' | 'QRCODE' | null;
  declare chave_pix: string | null;
  declare status: 'A_PAGAR' | 'PAGO' | 'PARCIAL' | 'CANCELADO';
  declare valor_pago: number;
  declare data_pagamento: Date | null;
  declare data_cadastro: Date;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  // Relacionamentos
  declare getFornecedor: BelongsToGetAssociationMixin<Fornecedor>;
  declare setFornecedor: BelongsToSetAssociationMixin<Fornecedor, number>;

  declare getPagamentos: HasManyGetAssociationsMixin<ContaPagarPagamento>;
  declare addPagamento: HasManyAddAssociationMixin<ContaPagarPagamento, number>;
  declare addPagamentos: HasManyAddAssociationsMixin<ContaPagarPagamento, number>;
  declare setPagamentos: HasManySetAssociationsMixin<ContaPagarPagamento, number>;
  declare removePagamento: HasManyRemoveAssociationMixin<ContaPagarPagamento, number>;
  declare removePagamentos: HasManyRemoveAssociationsMixin<ContaPagarPagamento, number>;
  declare hasPagamento: HasManyHasAssociationMixin<ContaPagarPagamento, number>;
  declare hasPagamentos: HasManyHasAssociationsMixin<ContaPagarPagamento, number>;
  declare countPagamentos: HasManyCountAssociationsMixin;
  declare createPagamento: HasManyCreateAssociationMixin<ContaPagarPagamento>;

  /**
   * Calcula o saldo devedor (valor - valor_pago)
   */
  getSaldoDevedor(): number {
    return Number(this.valor) - Number(this.valor_pago || 0);
  }

  /**
   * Verifica se a conta está vencida
   */
  isVencida(): boolean {
    if (this.status === 'PAGO' || this.status === 'CANCELADO') {
      return false;
    }
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const vencimento = new Date(this.data_vencimento);
    vencimento.setHours(0, 0, 0, 0);
    return vencimento < hoje;
  }

  /**
   * Formata created_at para exibição
   */
  getCreatedAtFormatada(): string | null {
    if (!this.created_at) return null;
    return formatCreatedAt(this.getDataValue('created_at'));
  }

  /**
   * Sobrescrever toJSON para incluir campos calculados
   */
  toJSON(): Record<string, unknown> {
    const json = this.get({ plain: true }) as Record<string, unknown>;
    json.created_at_formatada = this.getCreatedAtFormatada();
    json.saldo_devedor = this.getSaldoDevedor();
    json.vencida = this.isVencida();
    return json;
  }
}

ContaPagar.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    fornecedor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'financeiro_fornecedores',
        key: 'id'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    },
    data_vencimento: {
      type: DataTypes.DATE,
      allowNull: false
    },
    valor: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0.01
      }
    },
    tipo_pagamento: {
      type: DataTypes.ENUM('DINHEIRO', 'BOLETO', 'CARTAO', 'DEPOSITO', 'DEBITO_CONTA', 'TRANSFERENCIA', 'PIX'),
      allowNull: false,
      defaultValue: 'PIX'
    },
    numero_documento: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    nota_fiscal: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    linha_digitavel: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    tipo_chave_pix: {
      type: DataTypes.ENUM('CPF_CNPJ', 'CELULAR', 'EMAIL', 'ALEATORIA', 'QRCODE'),
      allowNull: true
    },
    chave_pix: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('A_PAGAR', 'PAGO', 'PARCIAL', 'CANCELADO'),
      allowNull: false,
      defaultValue: 'A_PAGAR'
    },
    valor_pago: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    data_pagamento: {
      type: DataTypes.DATE,
      allowNull: true
    },
    data_cadastro: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
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
    modelName: 'ContaPagar',
    tableName: 'financeiro_contas_pagar',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: (conta: ContaPagar) => {
        if (!conta.data_cadastro) {
          conta.data_cadastro = new Date();
        }
      }
    },
    indexes: [
      {
        fields: ['fornecedor_id']
      },
      {
        fields: ['data_vencimento']
      },
      {
        fields: ['status']
      },
      {
        fields: ['tipo_pagamento']
      },
      {
        fields: ['data_pagamento']
      }
    ]
  }
);

