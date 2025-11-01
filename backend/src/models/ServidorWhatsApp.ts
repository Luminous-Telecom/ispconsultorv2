import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface ServidorWhatsAppAttributes {
  id: number;
  evolution_api_url: string;
  evolution_api_key: string;
  instance_name: string;
  qr_code?: string;
  status_conexao: 'disconnected' | 'connecting' | 'connected' | 'qr_required';
  webhook_url?: string;
  webhook_events?: string; // JSON string com eventos habilitados
  ativo: boolean;
  notificacoes_automaticas: boolean;
  timeout: number;
  tentativas: number;
  intervalo_tentativas: number;
  configuracao_extra?: string; // JSON string para configurações específicas
  created_at?: Date;
  updated_at?: Date;
}

export class ServidorWhatsApp extends Model<ServidorWhatsAppAttributes, Optional<ServidorWhatsAppAttributes, 'id' | 'created_at' | 'updated_at'>> implements ServidorWhatsAppAttributes {
  public id!: number;
  public evolution_api_url!: string;
  public evolution_api_key!: string;
  public instance_name!: string;
  public qr_code?: string;
  public status_conexao!: 'disconnected' | 'connecting' | 'connected' | 'qr_required';
  public webhook_url?: string;
  public webhook_events?: string;
  public ativo!: boolean;
  public notificacoes_automaticas!: boolean;
  public timeout!: number;
  public tentativas!: number;
  public intervalo_tentativas!: number;
  public configuracao_extra?: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

ServidorWhatsApp.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    evolution_api_url: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        isUrl: true,
      },
    },
    evolution_api_key: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    instance_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    qr_code: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status_conexao: {
      type: DataTypes.ENUM('disconnected', 'connecting', 'connected', 'qr_required'),
      allowNull: false,
      defaultValue: 'disconnected',
    },
    webhook_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        isValidUrl(value: string) {
          if (value && value.trim() !== '') {
            const urlPattern = /^https?:\/\/.+/;
            if (!urlPattern.test(value)) {
              throw new Error('Webhook URL deve ser uma URL válida');
            }
          }
        }
      },
    },
    webhook_events: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    notificacoes_automaticas: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    timeout: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30000,
      validate: {
        min: 1000,
        max: 300000,
      },
    },
    tentativas: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
      validate: {
        min: 1,
        max: 10,
      },
    },
    intervalo_tentativas: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5000,
      validate: {
        min: 1000,
        max: 60000,
      },
    },
    configuracao_extra: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'servidores_whatsapp',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['ativo'],
        where: { ativo: true }
      },
      {
        fields: ['instance_name'],
      },
      {
        fields: ['status_conexao'],
      },
    ],
  }
);
