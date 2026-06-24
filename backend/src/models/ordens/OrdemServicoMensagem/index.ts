import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../../config/database';

export class OrdemServicoMensagem extends Model<
  InferAttributes<OrdemServicoMensagem>,
  InferCreationAttributes<OrdemServicoMensagem>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number | null;
  declare ordem_servico_id: number;
  declare id_evento: string;
  declare mensagem: string;
  declare data: string;
  declare usuario_id: number | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

OrdemServicoMensagem.init(
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
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    id_evento: {
      type: DataTypes.STRING(4),
      allowNull: false,
      defaultValue: '12',
    },
    mensagem: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    data: {
      type: DataTypes.STRING(19),
      allowNull: false,
    },
    usuario_id: {
      type: DataTypes.INTEGER,
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
    modelName: 'OrdemServicoMensagem',
    tableName: 'ordens_servico_mensagens',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['ordem_servico_id'] },
      { fields: ['empresa_id'] },
      { fields: ['usuario_id'] },
    ],
  }
);
