import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes
} from 'sequelize';
import { sequelize } from '../../../config/database';

export class IpPermitidoBlockdomi extends Model<
  InferAttributes<IpPermitidoBlockdomi>,
  InferCreationAttributes<IpPermitidoBlockdomi>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number | null;
  declare cliente_id: number;
  declare faixa_ips: string;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

IpPermitidoBlockdomi.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
  empresa_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
    cliente_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'clientes', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    faixa_ips: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    modelName: 'IpPermitidoBlockdomi',
    tableName: 'ips_permitidos_blockdomi',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['cliente_id']
      }
    ]
  }
);
