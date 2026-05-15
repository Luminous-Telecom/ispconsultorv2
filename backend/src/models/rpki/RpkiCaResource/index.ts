import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../../config/database';

export type RpkiCaResourceType = 'asn' | 'ipv4' | 'ipv6';
export type RpkiCaResourceSource = 'manual' | 'parent' | 'imported';

export class RpkiCaResource extends Model<
  InferAttributes<RpkiCaResource>,
  InferCreationAttributes<RpkiCaResource>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number | null;
  declare ca_id: number;
  declare resource_type: RpkiCaResourceType;
  declare start_range: string;
  declare end_range: string | null;
  declare max_length: number | null;
  declare source: RpkiCaResourceSource;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

RpkiCaResource.init(
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
      references: { model: 'adm_sistema_tenants', key: 'id' },
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
    resource_type: {
      type: DataTypes.ENUM('asn', 'ipv4', 'ipv6'),
      allowNull: false,
    },
    start_range: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    end_range: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    max_length: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    source: {
      type: DataTypes.ENUM('manual', 'parent', 'imported'),
      allowNull: false,
      defaultValue: 'manual',
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
    modelName: 'RpkiCaResource',
    tableName: 'rpki_ca_resources',
    timestamps: true,
    underscored: true,
  }
);

