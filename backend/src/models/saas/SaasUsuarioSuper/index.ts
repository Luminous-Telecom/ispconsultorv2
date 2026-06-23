import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../../config/database';

export type SaasNivelAcesso = 'super' | 'admin' | 'suporte';

export class SaasUsuarioSuper extends Model<
  InferAttributes<SaasUsuarioSuper>,
  InferCreationAttributes<SaasUsuarioSuper>
> {
  declare id: CreationOptional<number>;
  declare nome: string;
  declare email: string;
  declare senha_hash: string;
  declare nivel_acesso: CreationOptional<SaasNivelAcesso>;
  declare precisa_trocar_senha: CreationOptional<boolean>;
  declare ultimo_login: CreationOptional<Date | null>;
  declare ativo: CreationOptional<boolean>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

SaasUsuarioSuper.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nome: { type: DataTypes.STRING(150), allowNull: false },
    email: { type: DataTypes.STRING(180), allowNull: false, unique: true },
    senha_hash: { type: DataTypes.STRING(255), allowNull: false },
    nivel_acesso: {
      type: DataTypes.ENUM('super', 'admin', 'suporte'),
      allowNull: false,
      defaultValue: 'admin',
    },
    precisa_trocar_senha: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    ultimo_login: { type: DataTypes.DATE, allowNull: true },
    ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'saas_usuarios_super',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    defaultScope: {
      attributes: { exclude: ['senha_hash'] },
    },
    scopes: {
      withPassword: {
        attributes: { include: ['senha_hash'] },
      },
    },
  }
);

export default SaasUsuarioSuper;
