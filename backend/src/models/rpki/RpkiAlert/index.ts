import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from '../../../db/orm';
import { sequelize } from '../../../config/database';

export type RpkiAlertType = 'hijack-detected' | 'roa-expiring';
export type RpkiAlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export class RpkiAlert extends Model<
  InferAttributes<RpkiAlert>,
  InferCreationAttributes<RpkiAlert>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number | null;
  declare tipo: RpkiAlertType;
  declare prefixo: string | null;
  declare asn: string | null;
  declare roa_id: number | null;
  declare resolved_at: Date | null;
  declare severity: RpkiAlertSeverity;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

RpkiAlert.init(
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
      references: { model: 'sistema_tenants', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    tipo: {
      type: DataTypes.ENUM('hijack-detected', 'roa-expiring'),
      allowNull: false,
    },
    prefixo: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    asn: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      get() {
        const value = this.getDataValue('asn');
        return value != null ? String(value) : value;
      },
    },
    roa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'rpki_roas', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    severity: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: false,
      defaultValue: 'medium',
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
    modelName: 'RpkiAlert',
    tableName: 'rpki_alerts',
    timestamps: true,
    underscored: true,
  }
);

