import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from '../../../db/orm';
import { sequelize } from '../../../config/database';

export type RpkiAspaAfi = 'ipv4' | 'ipv6' | 'both';
export type RpkiAspaStatus = 'active' | 'revoked' | 'expired';

export class RpkiAspa extends Model<
  InferAttributes<RpkiAspa>,
  InferCreationAttributes<RpkiAspa>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number | null;
  declare ca_id: number;
  declare customer_asn: string;
  declare providers_json: string[];
  declare afi: RpkiAspaAfi;
  declare status: RpkiAspaStatus;
  declare not_before: Date;
  declare not_after: Date;
  declare revoked_at: Date | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

RpkiAspa.init(
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
    ca_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'rpki_cas', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    customer_asn: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      get() {
        const value = this.getDataValue('customer_asn');
        return value != null ? String(value) : value;
      },
    },
    providers_json: {
      type: DataTypes.JSON,
      allowNull: false,
      get() {
        const value = this.getDataValue('providers_json');
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
          try { return JSON.parse(value); } catch { return []; }
        }
        return value ?? [];
      },
    },
    afi: {
      type: DataTypes.ENUM('ipv4', 'ipv6', 'both'),
      allowNull: false,
      defaultValue: 'both',
    },
    status: {
      type: DataTypes.ENUM('active', 'revoked', 'expired'),
      allowNull: false,
      defaultValue: 'active',
    },
    not_before: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    not_after: {
      type: DataTypes.DATE,
      allowNull: false,
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
    modelName: 'RpkiAspa',
    tableName: 'rpki_aspas',
    timestamps: true,
    underscored: true,
  }
);

