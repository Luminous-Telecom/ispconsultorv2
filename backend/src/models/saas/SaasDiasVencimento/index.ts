import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../../config/database';

export class SaasDiasVencimento extends Model<
  InferAttributes<SaasDiasVencimento>,
  InferCreationAttributes<SaasDiasVencimento>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number;
  declare dia: number | null;
  declare dia_padrao: number;
  declare ativo: boolean;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

SaasDiasVencimento.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    empresa_id: { type: DataTypes.INTEGER, allowNull: false },
    dia: { type: DataTypes.INTEGER, allowNull: true },
    dia_padrao: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
    ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'saas_dias_vencimento',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default SaasDiasVencimento;
