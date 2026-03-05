import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../../config/database';

export interface ParametroAttributes {
  id: number;
  chave: string;
  valor: string;
  tipo: 'string' | 'number' | 'boolean' | 'json';
  descricao: string;
  categoria: string;
  ativo: boolean;
  empresa_id: number | null;
  created_at: Date;
  updated_at: Date;
}

export type ParametroCreationAttributes = Omit<ParametroAttributes, 'id' | 'created_at' | 'updated_at'>;

export class Parametro extends Model<ParametroAttributes, ParametroCreationAttributes> implements ParametroAttributes {
  public id!: number;
  public chave!: string;
  public valor!: string;
  public tipo!: 'string' | 'number' | 'boolean' | 'json';
  public descricao!: string;
  public categoria!: string;
  public ativo!: boolean;
  public empresa_id!: number | null;
  public created_at!: Date;
  public updated_at!: Date;

  static associate() {
    // Associações se necessário
  }
}

Parametro.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  chave: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  valor: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  tipo: {
    type: DataTypes.ENUM('string', 'number', 'boolean', 'json'),
    allowNull: false,
    defaultValue: 'string'
  },
  descricao: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  categoria: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'geral'
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  empresa_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null
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
  tableName: 'adm_parametro',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default Parametro;
