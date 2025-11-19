import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface ParametrosAttributes {
  id: number;
  validar_cpf_cnpj: boolean;
  validar_cep: boolean;
  titulos_vence_sabado: boolean;
  titulos_vence_domingo: boolean;
  auto_lancamento_titulos: boolean;
  total_titulos_financeiro: number;
  created_at?: Date;
  updated_at?: Date;
}

type ParametrosCreationAttributes = Optional<ParametrosAttributes, 'id' | 'created_at' | 'updated_at'>;

class Parametros extends Model<ParametrosAttributes, ParametrosCreationAttributes> implements ParametrosAttributes {
  public id!: number;
  public validar_cpf_cnpj!: boolean;
  public validar_cep!: boolean;
  public titulos_vence_sabado!: boolean;
  public titulos_vence_domingo!: boolean;
  public auto_lancamento_titulos!: boolean;
  public total_titulos_financeiro!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Parametros.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    validar_cpf_cnpj: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    validar_cep: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    titulos_vence_sabado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    titulos_vence_domingo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    auto_lancamento_titulos: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    total_titulos_financeiro: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 12
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    }
  },
  {
    sequelize,
    tableName: 'parametros',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

export default Parametros;

