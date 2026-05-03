import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../../config/database';

export class SaasPlano extends Model<
  InferAttributes<SaasPlano>,
  InferCreationAttributes<SaasPlano>
> {
  declare id: CreationOptional<number>;
  declare nome: string;
  declare descricao: CreationOptional<string | null>;
  declare valor_mensal: number;
  declare valor_anual: CreationOptional<number | null>;
  declare limite_usuarios: CreationOptional<number>;
  declare recursos: CreationOptional<Record<string, unknown> | null>;
  declare ativo: CreationOptional<boolean>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

SaasPlano.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nome: { type: DataTypes.STRING(100), allowNull: false },
    descricao: { type: DataTypes.TEXT, allowNull: true },
    valor_mensal: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    valor_anual: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    limite_usuarios: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
    recursos: { type: DataTypes.JSON, allowNull: true },
    ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'saas_saas_planos',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default SaasPlano;
