import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface ServidorSMSAttributes {
  id: number;
  provedor: string;
  api_key: string;
  api_secret?: string;
  sender_id: string;
  webhook_url?: string;
  ativo: boolean;
  timeout: number;
  tentativas: number;
  intervalo_tentativas: number;
  configuracao_extra?: string; // JSON string para configurações específicas do provedor
  created_at?: Date;
  updated_at?: Date;
}

interface ServidorSMSCreationAttributes extends Optional<ServidorSMSAttributes, 'id' | 'created_at' | 'updated_at'> {}

export class ServidorSMS extends Model<ServidorSMSAttributes, ServidorSMSCreationAttributes> implements ServidorSMSAttributes {
  public id!: number;
  public provedor!: string;
  public api_key!: string;
  public api_secret?: string;
  public sender_id!: string;
  public webhook_url?: string;
  public ativo!: boolean;
  public timeout!: number;
  public tentativas!: number;
  public intervalo_tentativas!: number;
  public configuracao_extra?: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

ServidorSMS.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    provedor: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        isIn: [['twilio', 'aws', 'zapier', 'custom']],
      },
    },
    api_key: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    api_secret: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    sender_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    webhook_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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
    tableName: 'servidores_sms',
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
        fields: ['provedor'],
      },
    ],
  }
);
