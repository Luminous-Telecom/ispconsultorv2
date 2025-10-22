import { Model, DataTypes, Sequelize } from 'sequelize';
import { sequelize } from '../config/database';

export interface ModeloTermoAdesaoAttributes {
  id: number;
  modelo_contrato_id: number;
  modelo: string;
  created_at: Date;
  updated_at: Date;
}

export interface ModeloTermoAdesaoCreationAttributes {
  modelo_contrato_id: number;
  modelo: string;
}

export class ModeloTermoAdesao extends Model<ModeloTermoAdesaoAttributes, ModeloTermoAdesaoCreationAttributes> implements ModeloTermoAdesaoAttributes {
  public id!: number;
  public modelo_contrato_id!: number;
  public modelo!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

ModeloTermoAdesao.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    modelo_contrato_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'modelo_contrato',
        key: 'id',
      },
    },
    modelo: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
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
    tableName: 'modelo_termo_adesao',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['modelo_contrato_id'],
      },
    ],
  }
);

export default ModeloTermoAdesao;
