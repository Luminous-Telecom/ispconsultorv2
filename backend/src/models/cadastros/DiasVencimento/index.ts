import { DataTypes, Model, Optional } from '../../../db/orm';
import { sequelize } from '../../../config/database';

interface DiasVencimentoAttributes {
  id: number;
  empresa_id?: number | null;
  dia?: number;
  dia_padrao: number;
  ativo: boolean;
  created_at?: Date;
  updated_at?: Date;
}

type DiasVencimentoCreationAttributes = Optional<DiasVencimentoAttributes, 'id' | 'created_at' | 'updated_at'>;

export class DiasVencimento extends Model<DiasVencimentoAttributes, DiasVencimentoCreationAttributes> implements DiasVencimentoAttributes {
  public id!: number;
  public empresa_id?: number | null;
  public dia?: number;
  public dia_padrao!: number;
  public ativo!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

DiasVencimento.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    dia: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    dia_padrao: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: 'cadastros_dias_vencimento',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['ativo'],
      },
    ],
  }
);
