import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin
} from 'sequelize';
import { sequelize } from '../config/database';
import { Fornecedor } from './Fornecedor';

export class FornecedorArquivo extends Model<
  InferAttributes<FornecedorArquivo>,
  InferCreationAttributes<FornecedorArquivo>
> {
  declare id: CreationOptional<number>;
  declare fornecedor_id: number;
  declare nome: string;
  declare tipo: string | null;
  declare caminho: string;
  declare tamanho: number | null;
  declare mime_type: string | null;
  declare data_upload: Date;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  // Relacionamentos
  declare getFornecedor: BelongsToGetAssociationMixin<Fornecedor>;
  declare setFornecedor: BelongsToSetAssociationMixin<Fornecedor, number>;
}

FornecedorArquivo.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    fornecedor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'fornecedores',
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
    modelName: 'FornecedorArquivo',
    tableName: 'fornecedor_arquivos',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['fornecedor_id']
      },
      {
        fields: ['tipo']
      }
    ]
  }
);

