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
  declare empresa_id: number | null;
  declare ip: string;
  declare descricao: string | null;
  declare nome_oficio: string | null;
  declare data_inicio_bloqueio: string | null;
  declare data_fim_bloqueio: string | null;
  declare link_oficio_anatel: string | null;
  declare link_oficio_justica: string | null;
  declare link_planilha_dominios: string | null;
  declare numero_sei_anatel_id: number | null;
  declare ativo: boolean;
  declare versao_id: number | null;
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
   * Sobrescrever toJSON para incluir created_at_formatada e versao (numero)
   */
  toJSON(): Record<string, unknown> {
    const json = this.get({ plain: true }) as Record<string, unknown>;
    json.created_at_formatada = this.getCreatedAtFormatada();
    const versaoRef = (this as unknown as { versaoRef?: { numero: string } }).versaoRef;
    json.versao = versaoRef?.numero ?? null;
    const numeroSeiRef = (this as unknown as { numeroSeiRef?: { numero: string } }).numeroSeiRef;
    json.numero_sei_anatel = numeroSeiRef?.numero ?? null;
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
  empresa_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
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
    numero_sei_anatel_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'adm_blockdomi_numeros_sei_anatel', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    versao_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'adm_blockdomi_versoes', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
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
    tableName: 'adm_blockdomi_ipv4',
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
