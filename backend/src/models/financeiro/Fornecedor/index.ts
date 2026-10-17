import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  HasManyGetAssociationsMixin,
  HasManyAddAssociationMixin,
  HasManyAddAssociationsMixin,
  HasManySetAssociationsMixin,
  HasManyRemoveAssociationMixin,
  HasManyRemoveAssociationsMixin,
  HasManyHasAssociationMixin,
  HasManyHasAssociationsMixin,
  HasManyCountAssociationsMixin,
  HasManyCreateAssociationMixin
} from '../../../db/orm';
import { sequelize } from '../../../config/database';
import { ContaPagar } from '../ContaPagar';
import { formatCreatedAt } from '../../../utils/dateUtils';

export class Fornecedor extends Model<
  InferAttributes<Fornecedor>,
  InferCreationAttributes<Fornecedor>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number | null;
  declare tipo_pessoa: 'FISICA' | 'JURIDICA';
  declare nome_razao_social: string;
  declare nome_fantasia: string | null;
  declare cpf_cnpj: string;
  declare cep: string | null;
  declare logradouro: string | null;
  declare numero: string | null;
  declare complemento: string | null;
  declare bairro: string | null;
  declare cidade: string | null;
  declare estado: string | null;
  declare pais: string | null;
  declare observacoes: string | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  // Relacionamentos
  declare getContasPagar: HasManyGetAssociationsMixin<ContaPagar>;
  declare addContaPagar: HasManyAddAssociationMixin<ContaPagar, number>;
  declare addContasPagar: HasManyAddAssociationsMixin<ContaPagar, number>;
  declare setContasPagar: HasManySetAssociationsMixin<ContaPagar, number>;
  declare removeContaPagar: HasManyRemoveAssociationMixin<ContaPagar, number>;
  declare removeContasPagar: HasManyRemoveAssociationsMixin<ContaPagar, number>;
  declare hasContaPagar: HasManyHasAssociationMixin<ContaPagar, number>;
  declare hasContasPagar: HasManyHasAssociationsMixin<ContaPagar, number>;
  declare countContasPagar: HasManyCountAssociationsMixin;
  declare createContaPagar: HasManyCreateAssociationMixin<ContaPagar>;

  /**
   * Formata created_at para exibição (sem conversão de timezone)
   */
  getCreatedAtFormatada(): string | null {
    if (!this.created_at) return null;
    return formatCreatedAt(this.getDataValue('created_at'));
  }

  /**
   * Sobrescrever toJSON para incluir created_at_formatada
   */
  toJSON(): Record<string, unknown> {
    const json = this.get({ plain: true }) as Record<string, unknown>;
    json.created_at_formatada = this.getCreatedAtFormatada();
    return json;
  }
}

Fornecedor.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    tipo_pessoa: {
      type: DataTypes.ENUM('FISICA', 'JURIDICA'),
      allowNull: false
    },
    nome_razao_social: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 255]
      }
    },
    nome_fantasia: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    cpf_cnpj: {
      type: DataTypes.STRING(18),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
    },
    cep: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    logradouro: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    numero: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    complemento: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    bairro: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    cidade: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    estado: {
      type: DataTypes.STRING(2),
      allowNull: true
    },
    pais: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: 'Brasil'
    },
    observacoes: {
      type: DataTypes.TEXT,
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
    modelName: 'Fornecedor',
    tableName: 'financeiro_fornecedores',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['cpf_cnpj']
      },
      {
        fields: ['tipo_pessoa']
      },
      {
        fields: ['nome_razao_social']
      },
      {
        fields: ['cidade']
      },
      {
        fields: ['estado']
      }
    ]
  }
);

