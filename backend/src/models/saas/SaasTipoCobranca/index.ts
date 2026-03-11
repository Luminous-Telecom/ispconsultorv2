import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../../config/database';

export type SaasPeriodicidade =
  | 'mensal'
  | 'bimestral'
  | 'trimestral'
  | 'semestral'
  | 'anual'
  | 'quinzenal'
  | 'semanal';

export class SaasTipoCobranca extends Model<
  InferAttributes<SaasTipoCobranca>,
  InferCreationAttributes<SaasTipoCobranca>
> {
  declare id: CreationOptional<number>;
  declare nome: string;
  declare quantidade_titulos: number;
  declare periodicidade: SaasPeriodicidade;
  declare ativo: boolean;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

SaasTipoCobranca.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nome: { type: DataTypes.STRING(100), allowNull: false },
    quantidade_titulos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    periodicidade: {
      type: DataTypes.ENUM(
        'mensal',
        'bimestral',
        'trimestral',
        'semestral',
        'anual',
        'quinzenal',
        'semanal'
      ),
      allowNull: false,
      defaultValue: 'mensal',
    },
    ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'saas_tipos_cobranca',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default SaasTipoCobranca;
