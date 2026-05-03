import { Model, DataTypes, CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../../config/database';

export class SaasServidorWhatsapp extends Model<
  InferAttributes<SaasServidorWhatsapp>,
  InferCreationAttributes<SaasServidorWhatsapp>
> {
  declare id: CreationOptional<number>;
  declare nome: string;
  declare url_api: string;
  declare token: CreationOptional<string | null>;
  declare numero: CreationOptional<string | null>;
  declare status: CreationOptional<'ativo' | 'inativo' | 'erro'>;
  declare limite_mensagens: CreationOptional<number | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

SaasServidorWhatsapp.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nome: { type: DataTypes.STRING(100), allowNull: false },
    url_api: { type: DataTypes.STRING(500), allowNull: false },
    token: { type: DataTypes.STRING(500), allowNull: true },
    numero: { type: DataTypes.STRING(30), allowNull: true },
    status: { type: DataTypes.ENUM('ativo', 'inativo', 'erro'), allowNull: false, defaultValue: 'ativo' },
    limite_mensagens: { type: DataTypes.INTEGER, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'saas_saas_servidores_whatsapp',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default SaasServidorWhatsapp;
