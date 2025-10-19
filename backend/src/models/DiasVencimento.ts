import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface DiasVencimentoAttributes {
  id: number;
  dia_padrao: number;
  dias_tolerancia: number;
  percentual_multa: number;
  juros_por_dia: number;
  vence_sabado: boolean;
  vence_domingo: boolean;
  considera_feriados: boolean;
  feriados_fixos?: string; // JSON string com feriados fixos
  feriados_moveis?: string; // JSON string com regras de feriados móveis
  ativo: boolean;
  created_at?: Date;
  updated_at?: Date;
}

interface DiasVencimentoCreationAttributes extends Optional<DiasVencimentoAttributes, 'id' | 'created_at' | 'updated_at'> {}

export class DiasVencimento extends Model<DiasVencimentoAttributes, DiasVencimentoCreationAttributes> implements DiasVencimentoAttributes {
  public id!: number;
  public dia_padrao!: number;
  public dias_tolerancia!: number;
  public percentual_multa!: number;
  public juros_por_dia!: number;
  public vence_sabado!: boolean;
  public vence_domingo!: boolean;
  public considera_feriados!: boolean;
  public feriados_fixos?: string;
  public feriados_moveis?: string;
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
    dia_padrao: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
      validate: {
        min: 1,
        max: 31,
      },
    },
    dias_tolerancia: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
      validate: {
        min: 0,
        max: 30,
      },
    },
    percentual_multa: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 2.00,
      validate: {
        min: 0,
        max: 100,
      },
    },
    juros_por_dia: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.33,
      validate: {
        min: 0,
        max: 10,
      },
    },
    vence_sabado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    vence_domingo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    considera_feriados: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    feriados_fixos: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    feriados_moveis: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: 'dias_vencimento',
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
