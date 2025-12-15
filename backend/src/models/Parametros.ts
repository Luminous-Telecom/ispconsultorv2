import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { ASSINAFY_API_URL_DEFAULT } from '../services/AssinafyService';

interface ParametrosAttributes {
  id: number;
  validar_cpf_cnpj: boolean;
  validar_cep: boolean;
  titulos_vence_sabado: boolean;
  titulos_vence_domingo: boolean;
  auto_lancamento_titulos: boolean;
  total_titulos_financeiro: number;
  assinatura_digital_habilitado?: boolean;
  assinatura_digital_api_provider?: string;
  assinatura_digital_api_key?: string;
  assinatura_digital_api_url?: string;
  assinatura_digital_account_id?: string;
  assinatura_digital_dias_expiracao_padrao?: number;
  created_at?: Date;
  updated_at?: Date;
}

type ParametrosCreationAttributes = Optional<ParametrosAttributes, 'id' | 'created_at' | 'updated_at'>;

class Parametros extends Model<ParametrosAttributes, ParametrosCreationAttributes> implements ParametrosAttributes {
  public id!: number;
  public validar_cpf_cnpj!: boolean;
  public validar_cep!: boolean;
  public titulos_vence_sabado!: boolean;
  public titulos_vence_domingo!: boolean;
  public auto_lancamento_titulos!: boolean;
  public total_titulos_financeiro!: number;
  public assinatura_digital_habilitado?: boolean;
  public assinatura_digital_api_provider?: string;
  public assinatura_digital_api_key?: string;
  public assinatura_digital_api_url?: string;
  public assinatura_digital_account_id?: string;
  public assinatura_digital_dias_expiracao_padrao?: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Parametros.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    validar_cpf_cnpj: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    validar_cep: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    titulos_vence_sabado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    titulos_vence_domingo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    auto_lancamento_titulos: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    total_titulos_financeiro: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 12
    },
    assinatura_digital_habilitado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    assinatura_digital_api_provider: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'assinafy'
    },
    assinatura_digital_api_key: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    assinatura_digital_api_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: ASSINAFY_API_URL_DEFAULT
    },
    assinatura_digital_account_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Workspace Account ID da Assinafy'
    },
    assinatura_digital_dias_expiracao_padrao: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    }
  },
  {
    sequelize,
    tableName: 'parametros',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

export default Parametros;

