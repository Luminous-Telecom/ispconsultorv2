import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../../config/database';

interface MensagemWhatsAppAttributes {
  id: number;
  tipo: string;
  tipo_envio: 'desativado' | 'pdf';
  mensagem_padrao: string;
  mensagem_manual?: string;
  interacao1?: string;
  interacao2?: string;
  interacao3?: string;
  template_mapping?: string; // JSON string com configuração do template (name, language, variables)
  ativo: boolean;
  created_at?: Date;
  updated_at?: Date;
}

type MensagemWhatsAppCreationAttributes = Optional<MensagemWhatsAppAttributes, 'id' | 'created_at' | 'updated_at'>;

export class MensagemWhatsApp extends Model<MensagemWhatsAppAttributes, MensagemWhatsAppCreationAttributes> implements MensagemWhatsAppAttributes {
  public id!: number;
  public tipo!: string;
  public tipo_envio!: 'desativado' | 'pdf';
  public mensagem_padrao!: string;
  public mensagem_manual?: string;
  public interacao1?: string;
  public interacao2?: string;
  public interacao3?: string;
  public template_mapping?: string;
  public ativo!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

MensagemWhatsApp.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  tipo: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  tipo_envio: {
    type: DataTypes.ENUM('desativado', 'pdf'),
    allowNull: false,
    defaultValue: 'pdf'
  },
  mensagem_padrao: {
    type: DataTypes.TEXT('long'),
    allowNull: false
  },
  mensagem_manual: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  },
  interacao1: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  },
  interacao2: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  },
  interacao3: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  },
  template_mapping: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
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
  tableName: 'mensagens_whatsapp',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default MensagemWhatsApp;

