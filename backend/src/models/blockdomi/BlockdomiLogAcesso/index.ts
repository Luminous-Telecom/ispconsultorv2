import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../../config/database';
import { formatCreatedAt } from '../../../utils/dateUtils';

export class BlockdomiLogAcesso extends Model<
  InferAttributes<BlockdomiLogAcesso>,
  InferCreationAttributes<BlockdomiLogAcesso>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number | null;
  declare ip: string | null;
  declare rota: string;
  declare metodo: string;
  declare status_http: number | null;
  declare sucesso: boolean;
  declare mensagem_erro: string | null;
  declare user_agent: string | null;
  declare created_at: CreationOptional<Date>;

  toJSON(): Record<string, unknown> {
    const json = this.get({ plain: true }) as Record<string, unknown>;
    json.created_at_formatada = formatCreatedAt(this.getDataValue('created_at'));
    return json;
  }
}

BlockdomiLogAcesso.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'adm_sistema_tenants', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    ip: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    rota: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    metodo: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'GET',
    },
    status_http: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    sucesso: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    mensagem_erro: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'BlockdomiLogAcesso',
    tableName: 'adm_blockdomi_log_acesso',
    timestamps: true,
    updatedAt: false,
    createdAt: 'created_at',
    underscored: true,
  }
);
