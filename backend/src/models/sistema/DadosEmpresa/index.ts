import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes
} from 'sequelize';
import { sequelize } from '../../../config/database';

export class DadosEmpresa extends Model<
  InferAttributes<DadosEmpresa>,
  InferCreationAttributes<DadosEmpresa>
> {
  declare id: CreationOptional<number>;
  declare razao_social: string;
  declare nome_fantasia: string | null;
  declare cnpj: string;
  declare inscricao_estadual: string | null;
  declare inscricao_municipal: string | null;
  declare cep: string;
  declare endereco: string;
  declare numero: string;
  declare complemento: string | null;
  declare bairro: string;
  declare cidade: string;
  declare estado: string;
  declare telefone: string | null;
  declare celular: string | null;
  declare email: string;
  declare site: string | null;
  declare responsavel_nome: string;
  declare responsavel_cpf: string;
  declare responsavel_cargo: string | null;
  declare responsavel_assinatura: string | null;
  declare logo: string | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

DadosEmpresa.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    razao_social: {
      type: DataTypes.STRING,
      allowNull: false
    },
    nome_fantasia: {
      type: DataTypes.STRING,
      allowNull: true
    },
    cnpj: {
      type: DataTypes.STRING(18),
      allowNull: false,
      unique: true
    },
    inscricao_estadual: {
      type: DataTypes.STRING,
      allowNull: true
    },
    inscricao_municipal: {
      type: DataTypes.STRING,
      allowNull: true
    },
    cep: {
      type: DataTypes.STRING(9),
      allowNull: false
    },
    endereco: {
      type: DataTypes.STRING,
      allowNull: false
    },
    numero: {
      type: DataTypes.STRING,
      allowNull: false
    },
    complemento: {
      type: DataTypes.STRING,
      allowNull: true
    },
    bairro: {
      type: DataTypes.STRING,
      allowNull: false
    },
    cidade: {
      type: DataTypes.STRING,
      allowNull: false
    },
    estado: {
      type: DataTypes.STRING(2),
      allowNull: false
    },
    telefone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    celular: {
      type: DataTypes.STRING,
      allowNull: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false
    },
    site: {
      type: DataTypes.STRING,
      allowNull: true
    },
    responsavel_nome: {
      type: DataTypes.STRING,
      allowNull: false
    },
    responsavel_cpf: {
      type: DataTypes.STRING(14),
      allowNull: false
    },
    responsavel_cargo: {
      type: DataTypes.STRING,
      allowNull: true
    },
    responsavel_assinatura: {
      type: DataTypes.STRING,
      allowNull: true
    },
    logo: {
      type: DataTypes.STRING,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: 'dados_empresa',
    timestamps: true,
    underscored: true
  }
);
