import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../../config/database';

export type RpkiCaParentProvisioningStatus = 'pending' | 'active' | 'error';

export class RpkiCaParent extends Model<
  InferAttributes<RpkiCaParent>,
  InferCreationAttributes<RpkiCaParent>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number | null;
  declare ca_id: number;
  declare parent_name: string;
  declare service_uri: string;
  declare parent_handle: string | null;
  declare child_handle: string | null;
  declare publication_referrer: string | null;
  declare publication_referral_token: string | null;
  /** XML completo recebido na importação (para extrair/reextrair &lt;referral&gt;). */
  declare parent_response_xml: string | null;
  declare provisioning_status: RpkiCaParentProvisioningStatus;
  declare last_sync_at: Date | null;
  declare last_error: string | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

RpkiCaParent.init(
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
      references: { model: 'adm_sistema_tenants', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    ca_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'rpki_cas', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    parent_name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    service_uri: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    parent_handle: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    child_handle: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    publication_referrer: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    publication_referral_token: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    parent_response_xml: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    provisioning_status: {
      type: DataTypes.ENUM('pending', 'active', 'error'),
      allowNull: false,
      defaultValue: 'pending',
    },
    last_sync_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    last_error: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    modelName: 'RpkiCaParent',
    tableName: 'rpki_ca_parents',
    timestamps: true,
    underscored: true,
  }
);

