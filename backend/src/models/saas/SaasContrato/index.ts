import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../../config/database';

export class SaasContrato extends Model<
  InferAttributes<SaasContrato>,
  InferCreationAttributes<SaasContrato>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number;
  declare banco_id: CreationOptional<number | null>;
  declare plano_id: number;
  declare data_inicio: string;
  declare data_fim: CreationOptional<string | null>;
  declare dia_vencimento: CreationOptional<number | null>;
  declare tipo: CreationOptional<'mensal' | 'anual'>;
  declare status: CreationOptional<'ativo' | 'cancelado' | 'expirado' | 'pendente'>;
  declare valor: number;
  declare desconto_percentual: CreationOptional<number | null>;
  declare desconto_valor: CreationOptional<number | null>;
  declare data_validade_desconto: CreationOptional<string | null>;
  declare isento_mensalidade: CreationOptional<boolean>;
  declare observacoes: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

SaasContrato.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    empresa_id: { type: DataTypes.INTEGER, allowNull: false },
    banco_id: { type: DataTypes.INTEGER, allowNull: true },
    plano_id: { type: DataTypes.INTEGER, allowNull: false },
    data_inicio: { type: DataTypes.DATEONLY, allowNull: false },
    data_fim: { type: DataTypes.DATEONLY, allowNull: true },
    dia_vencimento: { type: DataTypes.INTEGER, allowNull: true },
    tipo: { type: DataTypes.ENUM('mensal', 'anual'), allowNull: false, defaultValue: 'mensal' },
    status: {
      type: DataTypes.ENUM('ativo', 'cancelado', 'expirado', 'pendente'),
      allowNull: false,
      defaultValue: 'ativo',
    },
    valor: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    desconto_percentual: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    desconto_valor: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    data_validade_desconto: { type: DataTypes.DATEONLY, allowNull: true },
    isento_mensalidade: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    observacoes: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'saas_saas_contratos',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default SaasContrato;
