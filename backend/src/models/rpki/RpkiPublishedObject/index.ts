import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from '../../../db/orm';
import { sequelize } from '../../../config/database';

export type RpkiPublishedObjectType = 'roa' | 'mft' | 'crl' | 'cer' | 'aspa';

export class RpkiPublishedObject extends Model<
  InferAttributes<RpkiPublishedObject>,
  InferCreationAttributes<RpkiPublishedObject>
> {
  declare id: CreationOptional<number>;
  declare ca_id: number;
  declare repository_id: number;
  declare uri: string;
  declare hash_sha256_hex: string;
  declare object_type: RpkiPublishedObjectType;
  declare object_der_b64: string;
  declare roa_id: number | null;
  declare aspa_id: number | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

RpkiPublishedObject.init(
  {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    ca_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'rpki_cas', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    repository_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'rpki_repositories', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    uri: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    hash_sha256_hex: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    object_type: {
      type: DataTypes.ENUM('roa', 'mft', 'crl', 'cer', 'aspa'),
      allowNull: false,
    },
    object_der_b64: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
    },
    roa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'rpki_roas', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    aspa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'rpki_aspas', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
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
    modelName: 'RpkiPublishedObject',
    tableName: 'rpki_published_objects',
    timestamps: true,
    underscored: true,
  }
);
