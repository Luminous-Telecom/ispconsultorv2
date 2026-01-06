import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../config/database';

export interface ModeloContratoPermanenciaAttributes {
  id: number;
  modelo_documento_id: number;
  modelo: string;
  created_at: Date;
  updated_at: Date;
}

export interface ModeloContratoPermanenciaCreationAttributes {
  modelo_documento_id: number;
  modelo: string;
}

export class ModeloContratoPermanencia extends Model<ModeloContratoPermanenciaAttributes, ModeloContratoPermanenciaCreationAttributes> implements ModeloContratoPermanenciaAttributes {
  public id!: number;
  public modelo_documento_id!: number;
  public modelo!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

ModeloContratoPermanencia.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    modelo_documento_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'modelo_documento',
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
    tableName: 'modelo_contrato_permanencia',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['modelo_documento_id'],
      },
    ],
  }
);

export default ModeloContratoPermanencia;
