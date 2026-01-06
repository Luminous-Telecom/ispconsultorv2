import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes
} from 'sequelize';
import { sequelize } from '../../config/database';

export class ModeloTermo extends Model<
  InferAttributes<ModeloTermo>,
  InferCreationAttributes<ModeloTermo>
> {
  declare id: CreationOptional<number>;
  declare nome: string;
  declare descricao: string | null;
  declare tipo_termo: 'adesao' | 'permanencia' | 'cancelamento' | 'alteracao';
  declare conteudo: string;
  declare ativo: boolean;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  static async findByTipo(tipo: string): Promise<ModeloTermo[]> {
    return this.findAll({
      where: { 
        tipo_termo: tipo,
        ativo: true 
      },
      order: [['nome', 'ASC']]
    });
  }

  static async findAtivos(): Promise<ModeloTermo[]> {
    return this.findAll({
      where: { ativo: true },
      order: [['tipo_termo', 'ASC'], ['nome', 'ASC']]
    });
  }
}

ModeloTermo.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nome: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    tipo_termo: {
      type: DataTypes.ENUM('adesao', 'permanencia', 'cancelamento', 'alteracao'),
      allowNull: false
    },
    conteudo: {
      type: DataTypes.TEXT('long'),
      allowNull: false
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
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
    modelName: 'ModeloTermo',
    tableName: 'modelos_termo',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['tipo_termo'] },
      { fields: ['ativo'] },
      { fields: ['nome'] }
    ]
  }
);
