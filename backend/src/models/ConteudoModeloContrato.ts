import { Model, DataTypes, Sequelize } from 'sequelize';
import { sequelize } from '../config/database';

export interface ModeloContratoConteudoAttributes {
  id: number;
  modelo_contrato_id: number;
  modelo: string;
  created_at: Date;
  updated_at: Date;
}

export interface ModeloContratoConteudoCreationAttributes {
  modelo_contrato_id: number;
  modelo: string;
}

export class ModeloContratoConteudo extends Model<ModeloContratoConteudoAttributes, ModeloContratoConteudoCreationAttributes> implements ModeloContratoConteudoAttributes {
  public id!: number;
  public modelo_contrato_id!: number;
  public modelo!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

ConteudoModeloContrato.init(
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
  },
  {
    sequelize,
    tableName: 'modelo_contrato_conteudo',
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

export default ModeloContratoConteudo;
