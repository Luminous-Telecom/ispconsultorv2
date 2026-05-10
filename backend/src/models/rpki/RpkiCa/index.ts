import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../../config/database';

export type RpkiCaStatus = 'pending' | 'active' | 'error' | 'disabled';

export class RpkiCa extends Model<
  InferAttributes<RpkiCa>,
  InferCreationAttributes<RpkiCa>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number | null;
  declare cliente_id: number | null;
  declare nome: string;
  declare handle: string;
  declare status: RpkiCaStatus;
  declare ca_cert_pem: string | null;
  declare private_key_pem: string | null;
  /** Certificado de recurso emitido pelo parent via RFC 6492 (PEM). */
  declare resource_cert_pem: string | null;
  /** Chave privada do par de chaves do certificado de recurso. */
  declare resource_key_pem: string | null;
  /** URL do certificado de recurso publicado pelo parent (AIA caIssuers). */
  declare resource_cert_url: string | null;
  /** Nome da classe de recursos do parent (RFC 6492 class_name). */
  declare resource_class_name: string | null;
  /** Número monotônico do manifesto para esta CA (incrementado a cada publicação). */
  declare manifest_number: CreationOptional<number>;
  /** Número monotônico da CRL para esta CA. */
  declare crl_number: CreationOptional<number>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

RpkiCa.init(
  {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'adm_sistema_dados_empresa', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    cliente_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'adm_clientes_clientes', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    nome: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    handle: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'active', 'error', 'disabled'),
      allowNull: false,
      defaultValue: 'pending',
    },
    ca_cert_pem: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    private_key_pem: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    resource_cert_pem: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    resource_key_pem: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    resource_cert_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    resource_class_name: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    manifest_number: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    crl_number: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'RpkiCa',
    tableName: 'rpki_cas',
    timestamps: true,
    underscored: true,
  }
);

