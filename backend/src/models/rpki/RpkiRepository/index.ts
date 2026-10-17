import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from '../../../db/orm';
import { sequelize } from '../../../config/database';

export type RpkiRepositoryPublicationStatus = 'pending' | 'active' | 'error';

export class RpkiRepository extends Model<
  InferAttributes<RpkiRepository>,
  InferCreationAttributes<RpkiRepository>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number | null;
  declare ca_id: number;
  declare repository_name: string;
  declare publication_service_uri: string | null;
  declare rrdp_notify_uri: string | null;
  declare rsync_base_uri: string | null;
  declare publication_status: RpkiRepositoryPublicationStatus;
  declare last_publish_at: Date | null;
  declare last_error: string | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

RpkiRepository.init(
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
      references: { model: 'sistema_tenants', key: 'id' },
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
    repository_name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    publication_service_uri: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    rrdp_notify_uri: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    rsync_base_uri: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    publication_status: {
      type: DataTypes.ENUM('pending', 'active', 'error'),
      allowNull: false,
      defaultValue: 'pending',
    },
    last_publish_at: {
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
    modelName: 'RpkiRepository',
    tableName: 'rpki_repositories',
    timestamps: true,
    underscored: true,
  }
);

