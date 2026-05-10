import { Model, DataTypes, CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../../config/database';

export type RpkiActivityObjectType = 'roa' | 'aspa';
export type RpkiActivityAction = 'create' | 'revoke' | 'delete';

export class RpkiActivityLog extends Model<
  InferAttributes<RpkiActivityLog>,
  InferCreationAttributes<RpkiActivityLog>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number | null;
  declare ca_id: number | null;
  declare object_type: RpkiActivityObjectType;
  declare object_id: number | null;
  declare action: RpkiActivityAction;
  declare details: string | null;
  declare created_at: CreationOptional<Date>;
}

RpkiActivityLog.init(
  {
    id: { type: DataTypes.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
    empresa_id: { type: DataTypes.INTEGER, allowNull: true },
    ca_id: { type: DataTypes.INTEGER, allowNull: true },
    object_type: { type: DataTypes.ENUM('roa', 'aspa'), allowNull: false },
    object_id: { type: DataTypes.INTEGER, allowNull: true },
    action: { type: DataTypes.ENUM('create', 'revoke', 'delete'), allowNull: false },
    details: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'RpkiActivityLog',
    tableName: 'rpki_activity_logs',
    timestamps: false,
    underscored: true,
  }
);
