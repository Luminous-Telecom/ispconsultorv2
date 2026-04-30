import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes
} from 'sequelize';
import { sequelize } from '../../../config/database';

/** Registro único por número SEI Anatel (protocolo), vinculado a domínios/IPs como versão_blockdomi. */
export class NumeroSeiAnatelBlockdomi extends Model<
  InferAttributes<NumeroSeiAnatelBlockdomi>,
  InferCreationAttributes<NumeroSeiAnatelBlockdomi>
> {
  declare id: CreationOptional<number>;
  declare numero: string;
  declare created_at: CreationOptional<Date>;
}

NumeroSeiAnatelBlockdomi.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    numero: {
      type: DataTypes.STRING(32),
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
    modelName: 'NumeroSeiAnatelBlockdomi',
    tableName: 'adm_numeros_sei_anatel_blockdomi',
    timestamps: true,
    underscored: true,
    updatedAt: false
  }
);
