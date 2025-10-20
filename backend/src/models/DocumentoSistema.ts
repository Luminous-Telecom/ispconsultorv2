import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface DocumentoSistemaAttributes {
  id: number;
  nome: string;
  tipo: string;
  conteudo: string;
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

interface DocumentoSistemaCreationAttributes extends Optional<DocumentoSistemaAttributes, 'id' | 'created_at' | 'updated_at'> {}

export class DocumentoSistema extends Model<DocumentoSistemaAttributes, DocumentoSistemaCreationAttributes> implements DocumentoSistemaAttributes {
  public id!: number;
  public nome!: string;
  public tipo!: string;
  public conteudo!: string;
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

DocumentoSistema.init(
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
        isIn: [['contrato', 'recibo', 'carta_cobranca', 'boleto', 'comprovante', 'outro']],
      },
    },
    conteudo: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
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
    tableName: 'documentos_sistema',
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
