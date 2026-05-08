import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../../config/database';

export type RpkiCaStatus = 'pending' | 'active' | 'error' | 'disabled';

export class RpkiCa extends Model<
  InferAttributes<RpkiCa>,
  InferCreationAttributes<RpkiCa>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number | null;
  declare cliente_id: number | null;
  declare nome: string;
  declare handle: string;
  declare status: RpkiCaStatus;
  declare ca_cert_pem: string | null;
  declare private_key_pem: string | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

RpkiCa.init(
  {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'adm_sistema_dados_empresa', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    cliente_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'adm_clientes_clientes', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    nome: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    handle: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'active', 'error', 'disabled'),
      allowNull: false,
      defaultValue: 'pending',
    },
    ca_cert_pem: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    private_key_pem: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
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
    modelName: 'RpkiCa',
    tableName: 'rpki_cas',
    timestamps: true,
    underscored: true,
  }
);

