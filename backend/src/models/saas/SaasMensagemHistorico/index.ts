import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  Optional,
} from 'sequelize';
import { sequelize } from '../../../config/database';

interface SaasMensagemHistoricoAttributes {
  id: number;
  empresa_id: number;
  tipo: 'email' | 'whatsapp';
  destinatario: string;
  titulo?: string;
  mensagem: string;
  status: 'enviada' | 'erro';
  erro_mensagem?: string;
  entidade_tipo?: string;
  entidade_id?: number;
  servidor_id?: number;
  cliente_nome?: string;
  cliente_email?: string;
  cliente_telefone?: string;
  created_at?: Date;
  updated_at?: Date;
}

type SaasMensagemHistoricoCreationAttributes = Optional<
  SaasMensagemHistoricoAttributes,
  'id' | 'created_at' | 'updated_at'
>;

export class SaasMensagemHistorico extends Model<
  SaasMensagemHistoricoAttributes,
  SaasMensagemHistoricoCreationAttributes
> implements SaasMensagemHistoricoAttributes {
  declare id: CreationOptional<number>;
  declare empresa_id: number;
  declare tipo: 'email' | 'whatsapp';
  declare destinatario: string;
  declare titulo?: string;
  declare mensagem: string;
  declare status: 'enviada' | 'erro';
  declare erro_mensagem?: string;
  declare entidade_tipo?: string;
  declare entidade_id?: number;
  declare servidor_id?: number;
  declare cliente_nome?: string;
  declare cliente_email?: string;
  declare cliente_telefone?: string;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

SaasMensagemHistorico.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    tipo: {
      type: DataTypes.ENUM('email', 'whatsapp'),
      allowNull: false,
    },
    destinatario: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    titulo: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    mensagem: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('enviada', 'erro'),
      allowNull: false,
      defaultValue: 'enviada',
    },
    erro_mensagem: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    entidade_tipo: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    entidade_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    servidor_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    cliente_nome: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    cliente_email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    cliente_telefone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'saas_mensagens_historico',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default SaasMensagemHistorico;
