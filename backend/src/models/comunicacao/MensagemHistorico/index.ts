import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../../config/database';

export type HistoricoOrigemMensagem = 'erp' | 'saas';

interface MensagemHistoricoAttributes {
  id: number;
  empresa_id?: number | null;
  historico_origem: HistoricoOrigemMensagem;
  tipo: 'email' | 'whatsapp';
  destinatario: string;
  titulo?: string;
  mensagem: string;
  status: 'enviada' | 'erro';
  erro_mensagem?: string;
  entidade_tipo?: string;
  entidade_id?: number;
  servidor_id?: number;
  usuario_id?: number;
  cliente_nome?: string;
  cliente_email?: string;
  cliente_telefone?: string;
  created_at?: Date;
  updated_at?: Date;
}

type MensagemHistoricoCreationAttributes = Optional<
  MensagemHistoricoAttributes,
  'id' | 'historico_origem' | 'created_at' | 'updated_at'
>;

export class MensagemHistorico extends Model<MensagemHistoricoAttributes, MensagemHistoricoCreationAttributes> implements MensagemHistoricoAttributes {
  public id!: number;
  public empresa_id?: number | null;
  public historico_origem!: HistoricoOrigemMensagem;
  public tipo!: 'email' | 'whatsapp';
  public destinatario!: string;
  public titulo?: string;
  public mensagem!: string;
  public status!: 'enviada' | 'erro';
  public erro_mensagem?: string;
  public entidade_tipo?: string;
  public entidade_id?: number;
  public servidor_id?: number;
  public usuario_id?: number;
  public cliente_nome?: string;
  public cliente_email?: string;
  public cliente_telefone?: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

MensagemHistorico.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  empresa_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  historico_origem: {
    type: DataTypes.ENUM('erp', 'saas'),
    allowNull: false,
    defaultValue: 'erp',
    comment: 'Origem do registro: erp (tenant) ou saas (operador SaaS)'
  },
  tipo: {
    type: DataTypes.ENUM('email', 'whatsapp'),
    allowNull: false
  },
  destinatario: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  titulo: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  mensagem: {
    type: DataTypes.TEXT('long'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('enviada', 'erro'),
    allowNull: false,
    defaultValue: 'enviada'
  },
  erro_mensagem: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  entidade_tipo: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  entidade_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  servidor_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  cliente_nome: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Nome do cliente destinatário'
  },
  cliente_email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Email do cliente destinatário'
  },
  cliente_telefone: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Telefone do cliente destinatário'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  sequelize,
  tableName: 'adm_comunicacao_mensagens_historico',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default MensagemHistorico;