import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

interface ServidorWhatsAppAttributes {
  id: number;
  tipo_api: 'evolution' | 'whatsapp_cloud';
  evolution_api_url: string;
  evolution_api_key: string;
  instance_name: string;
  qr_code?: string;
  status_conexao: 'disconnected' | 'connecting' | 'connected' | 'qr_required';
  webhook_url?: string;
  webhook_events?: string; // JSON string com eventos habilitados
  whatsapp_cloud_token?: string;
  whatsapp_cloud_phone_number_id?: string;
  whatsapp_cloud_business_account_id?: string;
  template_mapping?: string; // JSON string com mapeamento de tipos de mensagem para templates
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
  public tipo_api!: 'evolution' | 'whatsapp_cloud';
  public evolution_api_url!: string;
  public evolution_api_key!: string;
  public instance_name!: string;
  public qr_code?: string;
  public status_conexao!: 'disconnected' | 'connecting' | 'connected' | 'qr_required';
  public webhook_url?: string;
  public webhook_events?: string;
  public whatsapp_cloud_token?: string;
  public whatsapp_cloud_phone_number_id?: string;
  public whatsapp_cloud_business_account_id?: string;
  public template_mapping?: string;
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
    tipo_api: {
      type: DataTypes.ENUM('evolution', 'whatsapp_cloud'),
      allowNull: false,
      defaultValue: 'evolution',
    },
    evolution_api_url: {
      type: DataTypes.STRING(500),
      allowNull: true, // Opcional quando usar WhatsApp Cloud API
      validate: {
        isValidUrl(value: string) {
          if (value && value.trim() !== '') {
            const urlPattern = /^https?:\/\/.+/;
            if (!urlPattern.test(value)) {
              throw new Error('URL da Evolution API deve ser uma URL válida');
            }
          }
        }
      },
    },
    evolution_api_key: {
      type: DataTypes.STRING(500),
      allowNull: true, // Opcional quando usar WhatsApp Cloud API
    },
    instance_name: {
      type: DataTypes.STRING(100),
      allowNull: true, // Opcional quando usar WhatsApp Cloud API
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
    whatsapp_cloud_token: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    whatsapp_cloud_phone_number_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    whatsapp_cloud_business_account_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    template_mapping: {
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
