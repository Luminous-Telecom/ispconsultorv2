import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../../config/database';

interface ModeloDocumentoAttributes {
  id: number;
  empresa_id?: number | null;
  nome: string;
  tipo: 'contrato' | 'recibo' | 'carta' | 'boleto' | 'comprovante' | 'outro' | 'termo';
  conteudo: string;
  conteudo_adesao?: string;
  conteudo_permanencia?: string;
  conteudo_recibo?: string;
  conteudo_carta?: string;
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

type ModeloDocumentoCreationAttributes = Optional<ModeloDocumentoAttributes, 'id' | 'created_at' | 'updated_at'>;

export class ModeloDocumento extends Model<ModeloDocumentoAttributes, ModeloDocumentoCreationAttributes> implements ModeloDocumentoAttributes {
  public id!: number;
  public empresa_id?: number | null;
  public nome!: string;
  public tipo!: 'contrato' | 'recibo' | 'carta' | 'boleto' | 'comprovante' | 'outro' | 'termo';
  public conteudo!: string;
  public conteudo_adesao?: string;
  public conteudo_permanencia?: string;
  public conteudo_recibo?: string;
  public conteudo_carta?: string;
  public descricao?: string;
  public ativo!: boolean;
  public tamanho_maximo!: number;
  public tipos_permitidos!: string;
  public retencao_dias!: number;
  public auto_backup!: boolean;
  public criptografia!: boolean;

  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Métodos estáticos
  static async findByTipo(tipo: string): Promise<ModeloDocumento[]> {
    // Validar que o tipo é um dos valores permitidos
    const tiposValidos: Array<ModeloDocumentoAttributes['tipo']> = [
      'contrato', 'recibo', 'carta', 'boleto', 'comprovante', 'outro', 'termo'
    ];
    
    if (!tiposValidos.includes(tipo as ModeloDocumentoAttributes['tipo'])) {
      return [];
    }
    
    return this.findAll({
      where: { 
        tipo: tipo as ModeloDocumentoAttributes['tipo'],
        ativo: true 
      },
      order: [['nome', 'ASC']]
    });
  }

  static async findAtivos(): Promise<ModeloDocumento[]> {
    return this.findAll({
      where: { ativo: true },
      order: [['nome', 'ASC']]
    });
  }
}

ModeloDocumento.init(
  {
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
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    tipo: {
      type: DataTypes.ENUM('contrato', 'recibo', 'carta', 'boleto', 'comprovante', 'outro', 'termo'),
      allowNull: false,
      validate: {
        notEmpty: true,
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
    conteudo_recibo: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    conteudo_carta: {
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
    tableName: 'adm_modelo_documento',
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

export default ModeloDocumento;

