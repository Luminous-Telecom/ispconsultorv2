import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes
} from 'sequelize';
import { sequelize } from '../../../config/database';
import { formatCreatedAt } from '../../../utils/dateUtils';

export class IPv6 extends Model<
  InferAttributes<IPv6>,
  InferCreationAttributes<IPv6>
> {
  declare id: CreationOptional<number>;
  declare ip: string;
  declare descricao: string | null;
  declare nome_oficio: string | null;
  declare data_inicio_bloqueio: string | null;
  declare data_fim_bloqueio: string | null;
  declare link_oficio_anatel: string | null;
  declare link_oficio_justica: string | null;
  declare link_planilha_dominios: string | null;
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

IPv6.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    ip: {
      type: DataTypes.STRING(45),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    nome_oficio: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    data_inicio_bloqueio: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    data_fim_bloqueio: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    link_oficio_anatel: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    link_oficio_justica: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    link_planilha_dominios: {
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
    modelName: 'IPv6',
    tableName: 'ipv6',
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
