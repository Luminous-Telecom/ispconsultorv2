import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../../config/database';

export type SaasEmpresaStatus = 'ativo' | 'inativo' | 'suspenso' | 'cancelado' | 'trial';

export class SaasDadosEmpresa extends Model<
  InferAttributes<SaasDadosEmpresa>,
  InferCreationAttributes<SaasDadosEmpresa>
> {
  declare id: CreationOptional<number>;
  declare nome_empresa: string;
  declare razao_social: CreationOptional<string | null>;
  declare nome_fantasia: CreationOptional<string | null>;
  declare cnpj: CreationOptional<string | null>;
  declare inscricao_estadual: CreationOptional<string | null>;
  declare inscricao_municipal: CreationOptional<string | null>;
  declare cep: CreationOptional<string | null>;
  declare endereco: CreationOptional<string | null>;
  declare numero: CreationOptional<string | null>;
  declare complemento: CreationOptional<string | null>;
  declare bairro: CreationOptional<string | null>;
  declare cidade: CreationOptional<string | null>;
  declare estado: CreationOptional<string | null>;
  declare telefone: CreationOptional<string | null>;
  declare celular: CreationOptional<string | null>;
  declare email: string;
  declare site: CreationOptional<string | null>;
  declare responsavel_nome: CreationOptional<string | null>;
  declare responsavel_cpf: CreationOptional<string | null>;
  declare responsavel_cargo: CreationOptional<string | null>;
  declare responsavel_assinatura: CreationOptional<string | null>;
  declare logo: CreationOptional<string | null>;
  declare plano_id: CreationOptional<number | null>;
  declare status: CreationOptional<SaasEmpresaStatus>;
  declare data_cadastro: CreationOptional<string | null>;
  declare data_vencimento: CreationOptional<string | null>;
  declare limite_usuarios: CreationOptional<number>;
  declare logo_url: CreationOptional<string | null>;
  declare dominio_customizado: CreationOptional<string | null>;
  declare observacoes: CreationOptional<string | null>;
  declare bloqueado_por_atraso: CreationOptional<boolean>;
  declare data_fim_desbloqueio_manual: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

SaasDadosEmpresa.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nome_empresa: { type: DataTypes.STRING(200), allowNull: false },
    razao_social: { type: DataTypes.STRING(255), allowNull: true },
    nome_fantasia: { type: DataTypes.STRING(255), allowNull: true },
    cnpj: { type: DataTypes.STRING(20), allowNull: true, unique: true },
    inscricao_estadual: { type: DataTypes.STRING(100), allowNull: true },
    inscricao_municipal: { type: DataTypes.STRING(100), allowNull: true },
    cep: { type: DataTypes.STRING(9), allowNull: true },
    endereco: { type: DataTypes.STRING(255), allowNull: true },
    numero: { type: DataTypes.STRING(20), allowNull: true },
    complemento: { type: DataTypes.STRING(100), allowNull: true },
    bairro: { type: DataTypes.STRING(100), allowNull: true },
    cidade: { type: DataTypes.STRING(100), allowNull: true },
    estado: { type: DataTypes.STRING(2), allowNull: true },
    telefone: { type: DataTypes.STRING(30), allowNull: true },
    celular: { type: DataTypes.STRING(20), allowNull: true },
    email: { type: DataTypes.STRING(180), allowNull: false },
    site: { type: DataTypes.STRING(255), allowNull: true },
    responsavel_nome: { type: DataTypes.STRING(200), allowNull: true },
    responsavel_cpf: { type: DataTypes.STRING(14), allowNull: true },
    responsavel_cargo: { type: DataTypes.STRING(100), allowNull: true },
    responsavel_assinatura: { type: DataTypes.TEXT, allowNull: true },
    logo: { type: DataTypes.STRING(500), allowNull: true },
    plano_id: { type: DataTypes.INTEGER, allowNull: true },
    status: {
      type: DataTypes.ENUM('ativo', 'inativo', 'suspenso', 'cancelado', 'trial'),
      allowNull: false,
      defaultValue: 'trial',
    },
    data_cadastro: { type: DataTypes.DATEONLY, allowNull: true },
    data_vencimento: { type: DataTypes.DATEONLY, allowNull: true },
    limite_usuarios: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
    logo_url: { type: DataTypes.STRING(500), allowNull: true },
    dominio_customizado: { type: DataTypes.STRING(255), allowNull: true },
    observacoes: { type: DataTypes.TEXT, allowNull: true },
    bloqueado_por_atraso: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    data_fim_desbloqueio_manual: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      defaultValue: null
    },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'saas_saas_dados_empresa',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default SaasDadosEmpresa;
