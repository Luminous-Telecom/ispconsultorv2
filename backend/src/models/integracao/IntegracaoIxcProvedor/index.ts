import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from '../../../db/orm';
import { sequelize } from '../../../config/database';

export class IntegracaoIxcProvedor extends Model<
  InferAttributes<IntegracaoIxcProvedor>,
  InferCreationAttributes<IntegracaoIxcProvedor>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number | null;
  declare cliente_id: number | null;
  declare nome: string;
  declare api_url: string | null;
  declare api_token: string | null;
  declare ativo: boolean;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  toJSON(): Record<string, unknown> {
    const json = this.get({ plain: true }) as Record<string, unknown>;
    json.has_api_token = !!this.getDataValue('api_token');
    delete json.api_token;
    return json;
  }
}

IntegracaoIxcProvedor.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    cliente_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    nome: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    api_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    api_token: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'IntegracaoIxcProvedor',
    tableName: 'integracao_ixc_provedor',
    timestamps: true,
    underscored: true,
  }
);
