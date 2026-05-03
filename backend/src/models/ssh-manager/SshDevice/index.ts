import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from 'sequelize';
import { sequelize } from '../../../config/database';

export type SshDeviceType = 'mikrotik' | 'cisco' | 'huawei' | 'swos';

export class SshDevice extends Model<
  InferAttributes<SshDevice>,
  InferCreationAttributes<SshDevice>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number | null;
  declare cliente_id: number | null;
  declare agent_id: number | null;
  declare name: string;
  declare host: string;
  declare port: CreationOptional<number>;
  declare username: string;
  declare password: string;
  declare private_key: string | null;
  declare device_type: SshDeviceType;
  declare description: string | null;
  declare is_active: CreationOptional<boolean>;
  declare backup_enabled: CreationOptional<boolean>;
  declare tags: string[] | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  toJSON(): Record<string, unknown> {
    const values = super.toJSON() as Record<string, unknown>;
    delete values['password'];
    delete values['private_key'];
    return values;
  }
}

SshDevice.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'DadosEmpresa', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    cliente_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Cliente', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    agent_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Agent', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { notEmpty: true, len: [2, 100] },
    },
    host: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: { notEmpty: true },
    },
    port: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 22,
    },
    username: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { notEmpty: true },
    },
    password: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: 'Criptografado com AES-256-CBC',
    },
    private_key: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Chave privada PEM criptografada com AES-256-CBC',
    },
    device_type: {
      type: DataTypes.ENUM('mikrotik', 'cisco', 'huawei', 'swos'),
      allowNull: false,
      defaultValue: 'mikrotik',
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    backup_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Incluir equipamento em rotinas de backup automático',
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array de strings para agrupamento',
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
    modelName: 'SshDevice',
    tableName: 'adm_ssh_manager_ssh_devices',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['empresa_id'] },
      { fields: ['cliente_id'] },
      { fields: ['agent_id'] },
      { fields: ['is_active'] },
      { fields: ['device_type'] },
      { fields: ['backup_enabled'] },
    ],
  }
);
