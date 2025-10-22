import { DataTypes, Model, Optional, HasOneGetAssociationMixin, HasOneSetAssociationMixin, HasOneCreateAssociationMixin } from 'sequelize';
import { sequelize } from '../config/database';

interface ModeloContratoAttributes {
  id: number;
  nome: string;
  tipo: string;
  conteudo: string;
  conteudo_adesao?: string;
  conteudo_permanencia?: string;
  descricao?: string;
  ativo: boolean;
  tamanho_maximo: number;
  tipos_permitidos: string;
  retencao_dias: number;
  auto_backup: boolean;
  criptografia: boolean;
  created_at?: Date;
  updated_at?: Date;
}

interface ModeloContratoCreationAttributes extends Optional<ModeloContratoAttributes, 'id' | 'created_at' | 'updated_at'> {}

export class ModeloContrato extends Model<ModeloContratoAttributes, ModeloContratoCreationAttributes> implements ModeloContratoAttributes {
  public id!: number;
  public nome!: string;
  public tipo!: string;
  public conteudo!: string;
  public conteudo_adesao?: string;
  public conteudo_permanencia?: string;
  public descricao?: string;
  public ativo!: boolean;
  public tamanho_maximo!: number;
  public tipos_permitidos!: string;
  public retencao_dias!: number;
  public auto_backup!: boolean;
  public criptografia!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

ModeloContrato.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nome: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    tipo: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        isIn: [['contrato', 'boleto', 'comprovante', 'outro']],
      },
    },
    conteudo: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    conteudo_adesao: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    conteudo_permanencia: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    tamanho_maximo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10485760, // 10MB em bytes
      validate: {
        min: 1024,
        max: 104857600, // 100MB
      },
    },
    tipos_permitidos: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 'pdf,doc,docx,xls,xlsx',
      validate: {
        notEmpty: true,
      },
    },
    retencao_dias: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 365,
      validate: {
        min: 1,
        max: 3650, // 10 anos
      },
    },
    auto_backup: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    criptografia: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'modelo_contrato',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['ativo'],
      },
      {
        fields: ['tipo'],
      },
    ],
  }
);
