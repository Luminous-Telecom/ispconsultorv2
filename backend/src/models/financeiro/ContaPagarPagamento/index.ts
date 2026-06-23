import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin
} from 'sequelize';
import { sequelize } from '../../../config/database';
import { ContaPagar } from '../ContaPagar';
import { Usuario } from '../../cadastros/Usuario';

export class ContaPagarPagamento extends Model<
  InferAttributes<ContaPagarPagamento>,
  InferCreationAttributes<ContaPagarPagamento>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number | null;
  declare conta_pagar_id: number;
  declare data: Date;
  declare valor: number;
  declare tipo_pagamento: 'DINHEIRO' | 'BOLETO' | 'CARTAO' | 'DEPOSITO' | 'DEBITO_CONTA' | 'TRANSFERENCIA' | 'PIX';
  declare usuario_id: number | null;
  declare observacao: string | null;
  declare created_at: CreationOptional<Date>;

  // Relacionamentos
  declare getContaPagar: BelongsToGetAssociationMixin<ContaPagar>;
  declare setContaPagar: BelongsToSetAssociationMixin<ContaPagar, number>;
  declare getUsuario: BelongsToGetAssociationMixin<Usuario>;
  declare setUsuario: BelongsToSetAssociationMixin<Usuario, number>;
}

ContaPagarPagamento.init(
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
    conta_pagar_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'financeiro_contas_pagar',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    data: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
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
      allowNull: false
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'cadastros_usuarios',
        key: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    },
    observacao: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    modelName: 'ContaPagarPagamento',
    tableName: 'financeiro_conta_pagar_pagamentos',
    timestamps: false, // Usamos created_at manualmente
    underscored: true,
    indexes: [
      {
        fields: ['conta_pagar_id']
      },
      {
        fields: ['data']
      },
      {
        fields: ['usuario_id']
      },
      {
        fields: ['tipo_pagamento']
      }
    ]
  }
);

