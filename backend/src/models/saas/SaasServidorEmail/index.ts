import { Model, DataTypes, CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../../config/database';

export class SaasServidorEmail extends Model<
  InferAttributes<SaasServidorEmail>,
  InferCreationAttributes<SaasServidorEmail>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number;
  declare nome: string;
  declare host_smtp: string;
  declare porta: CreationOptional<number>;
  declare usuario: string;
  declare senha_criptografada: string;
  declare ssl: CreationOptional<boolean>;
  declare status: CreationOptional<'ativo' | 'inativo' | 'erro'>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

SaasServidorEmail.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    empresa_id: { type: DataTypes.INTEGER, allowNull: false },
    nome: { type: DataTypes.STRING(100), allowNull: false },
    host_smtp: { type: DataTypes.STRING(255), allowNull: false },
    porta: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 587 },
    usuario: { type: DataTypes.STRING(180), allowNull: false },
    senha_criptografada: { type: DataTypes.STRING(500), allowNull: false },
    ssl: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    status: { type: DataTypes.ENUM('ativo', 'inativo', 'erro'), allowNull: false, defaultValue: 'ativo' },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'saas_servidores_email',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default SaasServidorEmail;
