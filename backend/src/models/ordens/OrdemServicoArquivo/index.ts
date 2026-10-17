import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from '../../../db/orm';
import { sequelize } from '../../../config/database';

export class OrdemServicoArquivo extends Model<
  InferAttributes<OrdemServicoArquivo>,
  InferCreationAttributes<OrdemServicoArquivo>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number | null;
  declare ordem_servico_id: string;
  declare nome: string;
  declare descricao: string | null;
  declare caminho: string;
  declare tamanho: number | null;
  declare mime_type: string | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

OrdemServicoArquivo.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    ordem_servico_id: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    nome: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    caminho: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    tamanho: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: true,
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
    modelName: 'OrdemServicoArquivo',
    tableName: 'ordem_servico_arquivos',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['ordem_servico_id'] },
      { fields: ['empresa_id'] },
    ],
  }
);
