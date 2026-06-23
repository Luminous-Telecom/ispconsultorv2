import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes
} from 'sequelize';
import { sequelize } from '../../../config/database';

export class SaasNFSeConfig extends Model<
  InferAttributes<SaasNFSeConfig>,
  InferCreationAttributes<SaasNFSeConfig>
> {
  declare id: CreationOptional<number>;
  declare codigo_servico_municipal: string | null;
  declare aliquota_iss: number;
  declare descricao_servico: string | null;
  declare serie_nf: string | null;
  declare numero_dps: number | null;
  declare portal_nacional_username: string | null;
  declare portal_nacional_password: string | null;
  declare portal_nacional_base_url: string | null;
  declare portal_nacional_ambiente: 'HOMOLOGACAO' | 'PRODUCAO';
  declare asaas_api_key: string | null;
  declare asaas_sandbox: boolean;
  declare provider: 'PORTAL_NACIONAL' | 'ASAAS';
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

SaasNFSeConfig.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    codigo_servico_municipal: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    aliquota_iss: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    descricao_servico: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    serie_nf: {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: '80000'
    },
    numero_dps: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1
    },
    portal_nacional_username: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    portal_nacional_password: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    portal_nacional_base_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      defaultValue: 'https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional'
    },
    portal_nacional_ambiente: {
      type: DataTypes.ENUM('HOMOLOGACAO', 'PRODUCAO'),
      allowNull: false,
      defaultValue: 'HOMOLOGACAO'
    },
    asaas_api_key: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    asaas_sandbox: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    provider: {
      type: DataTypes.ENUM('PORTAL_NACIONAL', 'ASAAS'),
      allowNull: false,
      defaultValue: 'PORTAL_NACIONAL'
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
    tableName: 'saas_nfse_config',
    timestamps: true,
    underscored: true
  }
);
