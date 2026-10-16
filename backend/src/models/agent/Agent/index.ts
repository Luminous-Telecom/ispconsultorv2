import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../../config/database';

export class Agent extends Model<
  InferAttributes<Agent>,
  InferCreationAttributes<Agent>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number | null;
  declare cliente_id: number | null;
  declare name: string;
  declare token_hash: string;
  declare token_hint: string | null;
  declare description: string | null;
  declare is_active: CreationOptional<boolean>;
  declare last_seen_at: Date | null;
  declare version: string | null;
  declare hostname: string | null;
  declare os_info: string | null;
  declare ip_address: string | null;
  declare connection_mode: CreationOptional<string>;
  declare mikrotik_host: string | null;
  declare mikrotik_api_port: number | null;
  declare mikrotik_api_tls: CreationOptional<boolean>;
  declare mikrotik_username: string | null;
  declare mikrotik_password: string | null;
  declare wg_listen_port: number | null;
  declare wg_lan_cidrs: string | null;
  declare wg_interface_name: string | null;
  declare wg_our_public_key: string | null;
  declare wg_our_private_key: string | null;
  declare wg_peer_public_key: string | null;
  declare wg_address_ours: string | null;
  declare wg_address_peer: string | null;
  declare wg_status: CreationOptional<string>;
  declare wg_last_handshake_at: Date | null;
  declare wg_last_error: string | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Agent.init(
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
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { notEmpty: true, len: [2, 100] },
    },
    token_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
    token_hint: {
      type: DataTypes.STRING(12),
      allowNull: true,
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
    last_seen_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    version: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    hostname: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    os_info: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    connection_mode: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'socket',
    },
    mikrotik_host: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    mikrotik_api_port: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    mikrotik_api_tls: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    mikrotik_username: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    mikrotik_password: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    wg_listen_port: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    wg_lan_cidrs: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    wg_interface_name: {
      type: DataTypes.STRING(15),
      allowNull: true,
    },
    wg_our_public_key: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    wg_our_private_key: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    wg_peer_public_key: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    wg_address_ours: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    wg_address_peer: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    wg_status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'idle',
    },
    wg_last_handshake_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    wg_last_error: {
      type: DataTypes.STRING(500),
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
    modelName: 'Agent',
    tableName: 'agent_agents',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['is_active'] },
      { fields: ['token_hash'] },
      { fields: ['empresa_id'] },
      { fields: ['cliente_id'] },
    ],
  }
);
