import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../../config/database';

interface TemplateWhatsAppAttributes {
  id: number;
  empresa_id?: number | null;
  nome: string;
  idioma: string;
  variables?: string; // JSON array
  header_document: boolean;
  ativo: boolean;
  created_at?: Date;
  updated_at?: Date;
}

type TemplateWhatsAppCreationAttributes = Optional<TemplateWhatsAppAttributes, 'id' | 'created_at' | 'updated_at'>;

export class TemplateWhatsApp extends Model<TemplateWhatsAppAttributes, TemplateWhatsAppCreationAttributes> implements TemplateWhatsAppAttributes {
  public id!: number;
  public empresa_id?: number | null;
  public nome!: string;
  public idioma!: string;
  public variables?: string;
  public header_document!: boolean;
  public ativo!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

TemplateWhatsApp.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  empresa_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  nome: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  idioma: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'pt_BR',
  },
  variables: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  header_document: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  sequelize,
  tableName: 'adm_comunicacao_templates_whatsapp',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default TemplateWhatsApp;
