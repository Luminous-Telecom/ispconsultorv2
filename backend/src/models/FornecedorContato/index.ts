import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin
} from 'sequelize';
import { sequelize } from '../../config/database';
import { Fornecedor } from '../Fornecedor';

export class FornecedorContato extends Model<
  InferAttributes<FornecedorContato>,
  InferCreationAttributes<FornecedorContato>
> {
  declare id: CreationOptional<number>;
  declare fornecedor_id: number;
  declare tipo: 'telefone' | 'email' | 'whatsapp' | 'celular' | 'fixo' | 'outro';
  declare valor: string;
  declare principal: boolean;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  // Relacionamentos
  declare getFornecedor: BelongsToGetAssociationMixin<Fornecedor>;
  declare setFornecedor: BelongsToSetAssociationMixin<Fornecedor, number>;
}

FornecedorContato.init(
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
    tipo: {
      type: DataTypes.ENUM('telefone', 'email', 'whatsapp', 'celular', 'fixo', 'outro'),
      allowNull: false,
      defaultValue: 'telefone'
    },
    valor: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    principal: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
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
    modelName: 'FornecedorContato',
    tableName: 'fornecedor_contatos',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['fornecedor_id']
      },
      {
        fields: ['tipo']
      },
      {
        fields: ['principal']
      }
    ]
  }
);

