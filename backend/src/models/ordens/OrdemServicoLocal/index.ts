import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../../config/database';

export class OrdemServicoLocal extends Model<
  InferAttributes<OrdemServicoLocal>,
  InferCreationAttributes<OrdemServicoLocal>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number | null;
  declare cliente_id: number;
  declare prioridade: string;
  declare melhor_horario_agenda: string;
  declare data_agenda: string | null;
  declare mensagem: string;
  declare status: string;
  declare protocolo: string;
  declare data_abertura: string;
  declare ixc_id: string | null;
  declare id_filial: string;
  declare id_estrutura: string;
  declare id_assunto: string;
  declare setor: string;
  declare id_tecnico: string;
  declare tipo: string;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

OrdemServicoLocal.init(
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
    cliente_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    prioridade: {
      type: DataTypes.STRING(1),
      allowNull: false,
      defaultValue: 'N',
    },
    melhor_horario_agenda: {
      type: DataTypes.STRING(1),
      allowNull: false,
      defaultValue: 'Q',
    },
    data_agenda: {
      type: DataTypes.STRING(19),
      allowNull: true,
    },
    mensagem: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(4),
      allowNull: false,
      defaultValue: 'A',
    },
    protocolo: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    data_abertura: {
      type: DataTypes.STRING(19),
      allowNull: false,
    },
    ixc_id: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    id_filial: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: '',
    },
    id_estrutura: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: '0',
    },
    id_assunto: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: '',
    },
    setor: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: '',
    },
    id_tecnico: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: '',
    },
    tipo: {
      type: DataTypes.STRING(4),
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
    modelName: 'OrdemServicoLocal',
    tableName: 'ordens_servico',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['empresa_id'] },
      { fields: ['cliente_id'] },
      { fields: ['protocolo'], unique: true, name: 'ordens_servico_protocolo_unique' },
      { fields: ['ixc_id'] },
    ],
  }
);
