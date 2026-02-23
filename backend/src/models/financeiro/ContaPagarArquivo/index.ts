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

export class ContaPagarArquivo extends Model<
  InferAttributes<ContaPagarArquivo>,
  InferCreationAttributes<ContaPagarArquivo>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number | null;
  declare conta_pagar_id: number;
  declare nome: string;
  declare tipo: string | null;
  declare caminho: string;
  declare tamanho: number | null;
  declare mime_type: string | null;
  declare data_upload: Date;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  // Relacionamentos
  declare getContaPagar: BelongsToGetAssociationMixin<ContaPagar>;
  declare setContaPagar: BelongsToSetAssociationMixin<ContaPagar, number>;
}

ContaPagarArquivo.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    conta_pagar_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'contas_pagar',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    nome: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    tipo: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    caminho: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    tamanho: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    data_upload: {
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
    modelName: 'ContaPagarArquivo',
    tableName: 'conta_pagar_arquivos',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['conta_pagar_id']
      },
      {
        fields: ['tipo']
      }
    ]
  }
);

