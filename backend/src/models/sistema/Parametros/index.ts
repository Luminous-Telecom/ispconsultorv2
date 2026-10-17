import { DataTypes, Model, Optional } from '../../../db/orm';
import { sequelize } from '../../../config/database';

interface ParametrosAttributes {
  id: number;
  validar_cpf_cnpj: boolean;
  validar_cep: boolean;
  titulos_vence_sabado: boolean;
  titulos_vence_domingo: boolean;
  central_assinante_metodo_login: string;
  /** Dias após vencimento para suspender contrato ativo. null/0 = desabilitado. */
  dias_suspender_atraso: number | null;
  empresa_id: number | null;
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
  public central_assinante_metodo_login!: string;
  public dias_suspender_atraso!: number | null;
  public empresa_id!: number | null;
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
    central_assinante_metodo_login: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'cnpj'
    },
    dias_suspender_atraso: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'empresa_id'
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
    tableName: 'sistema_parametros',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    // Ignorar colunas extras que não estão no modelo
    // Isso permite que o modelo funcione mesmo se houver colunas antigas no banco
    omitNull: false
  }
);

export default Parametros;

