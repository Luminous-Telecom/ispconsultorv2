import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes
} from 'sequelize';
import { sequelize } from '../../../config/database';

export class ApiToken extends Model<
  InferAttributes<ApiToken>,
  InferCreationAttributes<ApiToken>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number;
  declare nome: string;
  declare token_hash: string;
  declare token_prefix: string;
  declare ativo: CreationOptional<boolean>;
  declare ultimo_uso: CreationOptional<Date | null>;
  declare criado_por: number | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

ApiToken.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'dados_empresa', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    nome: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    token_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true
    },
    token_prefix: {
      type: DataTypes.STRING(12),
      allowNull: false
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    ultimo_uso: {
      type: DataTypes.DATE,
      allowNull: true
    },
    criado_por: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'usuarios', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
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
    tableName: 'api_tokens',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['empresa_id'] },
      { fields: ['token_hash'], unique: true },
      { fields: ['ativo'] }
    ]
  }
);

export default ApiToken;
