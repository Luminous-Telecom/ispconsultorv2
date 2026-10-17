import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from '../../../db/orm';
import { sequelize } from '../../../config/database';

export class AtendimentoLocal extends Model<
  InferAttributes<AtendimentoLocal>,
  InferCreationAttributes<AtendimentoLocal>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number | null;
  declare cliente_id: number;
  declare ixc_id: string | null;
  declare protocolo: string;
  declare id_filial: string;
  declare id_estrutura: string;
  declare id_assunto: string;
  declare id_ticket_setor: string;
  declare id_responsavel_technico: string;
  declare titulo: string;
  declare menssagem: string;
  declare prioridade: string;
  declare melhor_horario_reserve: string;
  declare data_reservada: string | null;
  declare su_status: string;
  declare tipo: string;
  declare data_criacao: string;
  declare ultima_atualizacao: string;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

AtendimentoLocal.init(
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
    ixc_id: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    protocolo: {
      type: DataTypes.STRING(32),
      allowNull: false,
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
    id_ticket_setor: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: '',
    },
    id_responsavel_technico: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: '',
    },
    titulo: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: '',
    },
    menssagem: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    prioridade: {
      type: DataTypes.STRING(1),
      allowNull: false,
      defaultValue: 'N',
    },
    melhor_horario_reserve: {
      type: DataTypes.STRING(1),
      allowNull: false,
      defaultValue: 'Q',
    },
    data_reservada: {
      type: DataTypes.STRING(19),
      allowNull: true,
    },
    su_status: {
      type: DataTypes.STRING(4),
      allowNull: false,
      defaultValue: 'N',
    },
    tipo: {
      type: DataTypes.STRING(4),
      allowNull: false,
      defaultValue: 'E',
    },
    data_criacao: {
      type: DataTypes.STRING(19),
      allowNull: false,
    },
    ultima_atualizacao: {
      type: DataTypes.STRING(19),
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
    modelName: 'AtendimentoLocal',
    tableName: 'atendimentos',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['empresa_id'] },
      { fields: ['cliente_id'] },
      { fields: ['ixc_id'] },
      { fields: ['protocolo'], unique: true, name: 'atendimentos_protocolo_unique' },
    ],
  }
);
