import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../../config/database';

interface SaasParametrosAttributes {
  id: number;
  validar_cpf_cnpj: boolean;
  validar_cep: boolean;
  titulos_vence_sabado: boolean;
  titulos_vence_domingo: boolean;
  manter_numeros_titulos: boolean;
  quantidade_titulos_manter: number | null;
  central_assinante_metodo_login: string;
  created_at?: Date;
  updated_at?: Date;
}

type SaasParametrosCreationAttributes = Optional<SaasParametrosAttributes, 'id' | 'created_at' | 'updated_at'>;

class SaasParametros extends Model<SaasParametrosAttributes, SaasParametrosCreationAttributes> implements SaasParametrosAttributes {
  public id!: number;
  public validar_cpf_cnpj!: boolean;
  public validar_cep!: boolean;
  public titulos_vence_sabado!: boolean;
  public titulos_vence_domingo!: boolean;
  public manter_numeros_titulos!: boolean;
  public quantidade_titulos_manter!: number | null;
  public central_assinante_metodo_login!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

SaasParametros.init(
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
    manter_numeros_titulos: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    quantidade_titulos_manter: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 12
    },
    central_assinante_metodo_login: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'cnpj'
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
    tableName: 'saas_parametros',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    omitNull: false
  }
);

export default SaasParametros;
