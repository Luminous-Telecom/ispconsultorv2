import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes
} from 'sequelize';
import { sequelize } from '../../../config/database';

export class NFSeConfig extends Model<
  InferAttributes<NFSeConfig>,
  InferCreationAttributes<NFSeConfig>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number | null;
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

NFSeConfig.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    codigo_servico_municipal: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Código de serviço municipal para NFS-e'
    },
    aliquota_iss: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: 'Alíquota padrão de ISS para NFS-e (%)'
    },
    descricao_servico: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descrição padrão do serviço para NFS-e'
    },
    serie_nf: {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: '80000',
      comment: 'Série da NF (permitida: 80000 a 89999)'
    },
    numero_dps: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
      comment: 'Número do DPS (Documento de Prestação de Serviços)'
    },
    portal_nacional_username: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Usuário do Portal Nacional NFS-e'
    },
    portal_nacional_password: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Senha do Portal Nacional NFS-e'
    },
    portal_nacional_base_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      defaultValue: 'https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional',
      comment: 'URL base da API do Portal Nacional NFS-e (Homologação: https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional, Produção: https://sefin.nfse.gov.br/SefinNacional)'
    },
    portal_nacional_ambiente: {
      type: DataTypes.ENUM('HOMOLOGACAO', 'PRODUCAO'),
      allowNull: false,
      defaultValue: 'HOMOLOGACAO',
      comment: 'Ambiente do Portal Nacional (HOMOLOGACAO ou PRODUCAO)'
    },
    asaas_api_key: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'API Key do Asaas para emissão de NFS-e'
    },
    asaas_sandbox: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Usar ambiente sandbox do Asaas'
    },
    provider: {
      type: DataTypes.ENUM('PORTAL_NACIONAL', 'ASAAS'),
      allowNull: false,
      defaultValue: 'PORTAL_NACIONAL',
      comment: 'Provedor de NFS-e (PORTAL_NACIONAL, ASAAS)'
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
    tableName: 'adm_nfse_config',
    timestamps: true,
    underscored: true
  }
);

