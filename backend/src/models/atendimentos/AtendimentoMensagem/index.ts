import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../../config/database';

export class AtendimentoMensagem extends Model<
  InferAttributes<AtendimentoMensagem>,
  InferCreationAttributes<AtendimentoMensagem>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number | null;
  declare atendimento_id: number;
  declare ixc_id: string | null;
  declare mensagem: string;
  declare data: string;
  declare usuario_id: number | null;
  declare visibilidade_mensagens: string;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

AtendimentoMensagem.init(
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
    atendimento_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    ixc_id: {
      type: DataTypes.STRING(32),
      allowNull: true,
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
    visibilidade_mensagens: {
      type: DataTypes.STRING(1),
      allowNull: false,
      defaultValue: 'E',
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
    modelName: 'AtendimentoMensagem',
    tableName: 'atendimentos_mensagens',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['atendimento_id'] },
      { fields: ['empresa_id'] },
    ],
  }
);
