import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../../config/database';
import { formatCreatedAt } from '../../../utils/dateUtils';

export class Usuario extends Model<
  InferAttributes<Usuario>,
  InferCreationAttributes<Usuario>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number | null;
  declare nome: string;
  declare email: string;
  declare password_hash: string;
  declare role: string;
  declare ativo: CreationOptional<boolean>;
  declare precisa_trocar_senha: CreationOptional<boolean>;
  declare ultimo_login: CreationOptional<Date | null>;
  declare webhook_secret: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  /**
   * Formata created_at para exibição (sem conversão de timezone)
   */
  getCreatedAtFormatada(): string | null {
    if (!this.created_at) return null;
    return formatCreatedAt(this.getDataValue('created_at'));
  }

  /**
   * Sobrescrever toJSON para incluir created_at_formatada
   */
  toJSON(): Record<string, unknown> {
    const json = this.get({ plain: true }) as Record<string, unknown>;
    json.created_at_formatada = this.getCreatedAtFormatada();
    return json;
  }
}

Usuario.init(
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
    },
    nome: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(180),
      allowNull: false,
      unique: true,
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'admin',
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    precisa_trocar_senha: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    ultimo_login: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    webhook_secret: {
      type: DataTypes.STRING(255),
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
    tableName: 'cadastros_usuarios',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    defaultScope: {
      attributes: {
        exclude: ['password_hash'],
      },
    },
    scopes: {
      withPassword: {
        attributes: {
          include: ['password_hash'],
        },
      },
    },
  }
);

export default Usuario;

