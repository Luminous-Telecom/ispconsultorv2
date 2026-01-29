import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes
} from 'sequelize';
import { sequelize } from '../../../config/database';
import { formatCreatedAt } from '../../../utils/dateUtils';

export class IPv4 extends Model<
  InferAttributes<IPv4>,
  InferCreationAttributes<IPv4>
> {
  declare id: CreationOptional<number>;
  declare ip: string;
  declare descricao: string | null;
  declare ativo: boolean;
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

IPv4.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    ip: {
      type: DataTypes.STRING(15),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    modelName: 'IPv4',
    tableName: 'ipv4',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['ip']
      },
      {
        fields: ['ativo']
      }
    ]
  }
);
