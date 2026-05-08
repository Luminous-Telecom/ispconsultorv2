import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../../config/database';

export type RpkiValidationState = 'valid' | 'invalid' | 'not-found';

export class RpkiValidationLog extends Model<
  InferAttributes<RpkiValidationLog>,
  InferCreationAttributes<RpkiValidationLog>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number | null;
  declare prefix: string;
  declare asn: string;
  declare prefix_length: number;
  declare state: RpkiValidationState;
  declare matched_roa_id: number | null;
  declare reason: string | null;
  declare request_ip: string | null;
  declare created_at: CreationOptional<Date>;
}

RpkiValidationLog.init(
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
    prefix_length: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    state: {
      type: DataTypes.ENUM('valid', 'invalid', 'not-found'),
      allowNull: false,
    },
    matched_roa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'rpki_roas', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    request_ip: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'RpkiValidationLog',
    tableName: 'rpki_validation_logs',
    timestamps: false,
    underscored: true,
  }
);

