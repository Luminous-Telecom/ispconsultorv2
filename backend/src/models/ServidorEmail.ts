import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface ServidorEmailAttributes {
  id: number;
  host: string;
  porta: number;
  usuario: string;
  senha: string;
  ssl: boolean;
  tls: boolean;
  ativo: boolean;
  nome_remetente: string;
  email_remetente: string;
  timeout: number;
  tentativas: number;
  intervalo_tentativas: number;
  created_at?: Date;
  updated_at?: Date;
}

type ServidorEmailCreationAttributes = Optional<ServidorEmailAttributes, 'id' | 'created_at' | 'updated_at'>;

export class ServidorEmail extends Model<ServidorEmailAttributes, ServidorEmailCreationAttributes> implements ServidorEmailAttributes {
  public id!: number;
  public host!: string;
  public porta!: number;
  public usuario!: string;
  public senha!: string;
  public ssl!: boolean;
  public tls!: boolean;
  public ativo!: boolean;
  public nome_remetente!: string;
  public email_remetente!: string;
  public timeout!: number;
  public tentativas!: number;
  public intervalo_tentativas!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

ServidorEmail.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    host: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    porta: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 65535,
      },
    },
    usuario: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true,
        notEmpty: true,
      },
    },
    senha: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    ssl: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    tls: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    nome_remetente: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    email_remetente: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true,
        notEmpty: true,
      },
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
  },
  {
    sequelize,
    tableName: 'servidores_email',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['ativo'],
        where: { ativo: true }
      },
    ],
  }
);
