import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes
} from 'sequelize';
import { sequelize } from '../../../config/database';

export class VersaoBlockdomi extends Model<
  InferAttributes<VersaoBlockdomi>,
  InferCreationAttributes<VersaoBlockdomi>
> {
  declare id: CreationOptional<number>;
  declare numero: string;
  declare created_at: CreationOptional<Date>;
}

VersaoBlockdomi.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    numero: {
      type: DataTypes.STRING(12),
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    modelName: 'VersaoBlockdomi',
    tableName: 'versoes_blockdomi',
    timestamps: true,
    underscored: true,
    updatedAt: false
  }
);
