import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../../config/database';

export type RpkiRoaStatus = 'active' | 'revoked' | 'expired';

export class RpkiRoa extends Model<
  InferAttributes<RpkiRoa>,
  InferCreationAttributes<RpkiRoa>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number | null;
  declare ca_id: number | null;
  declare prefix: string;
  declare asn: string;
  declare max_length: number;
  declare not_before: Date;
  declare not_after: Date;
  declare status: RpkiRoaStatus;
  declare revoked_at: Date | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

RpkiRoa.init(
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
    ca_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'rpki_cas', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    prefix: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    asn: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      get() {
        const value = this.getDataValue('asn');
        return value != null ? String(value) : value;
      },
    },
    max_length: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    not_before: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    not_after: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('active', 'revoked', 'expired'),
      allowNull: false,
      defaultValue: 'active',
    },
    revoked_at: {
      type: DataTypes.DATE,
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
    modelName: 'RpkiRoa',
    tableName: 'rpki_roas',
    timestamps: true,
    underscored: true,
  }
);

