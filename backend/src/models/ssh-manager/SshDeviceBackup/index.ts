import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from 'sequelize';
import { sequelize } from '../../../config/database';

export class SshDeviceBackup extends Model<
  InferAttributes<SshDeviceBackup>,
  InferCreationAttributes<SshDeviceBackup>
> {
  declare id: CreationOptional<string>;
  declare ssh_device_id: string;
  declare file_name: string;
  declare size_bytes: number;
  /** Início da execução do backup (antes de comandos HTTP/SSH). */
  declare started_at: Date;
  /** Fim da execução (após gravar o arquivo). */
  declare finished_at: Date;
  declare created_at: CreationOptional<Date>;
}

SshDeviceBackup.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ssh_device_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'adm_ssh_devices', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    file_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    size_bytes: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    finished_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'SshDeviceBackup',
    tableName: 'adm_ssh_device_backups',
    timestamps: false,
    underscored: true,
  }
);
