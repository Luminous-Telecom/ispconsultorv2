import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes
} from 'sequelize';
import { sequelize } from '../../../config/database';

export type PeriodicidadeTipoCobranca = 'mensal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual' | 'quinzenal' | 'semanal';

export class TipoCobrancaContrato extends Model<
  InferAttributes<TipoCobrancaContrato>,
  InferCreationAttributes<TipoCobrancaContrato>
> {
  declare id: CreationOptional<number>;
  declare nome: string;
  declare quantidade_titulos: number;
  declare periodicidade: PeriodicidadeTipoCobranca;
  declare empresa_id: number | null;
  declare ativo: boolean;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

TipoCobrancaContrato.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nome: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    quantidade_titulos: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    periodicidade: {
      type: DataTypes.ENUM('mensal', 'bimestral', 'trimestral', 'semestral', 'anual', 'quinzenal', 'semanal'),
      allowNull: false,
      defaultValue: 'mensal'
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
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
    modelName: 'TipoCobrancaContrato',
    tableName: 'cadastros_tipos_cobranca_contrato',
    timestamps: true,
    underscored: true
  }
);
