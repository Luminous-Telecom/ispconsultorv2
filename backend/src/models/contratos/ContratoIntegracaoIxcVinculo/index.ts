import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
} from 'sequelize';
import { sequelize } from '../../../config/database';
import { Contrato } from '../Contrato';
import { IntegracaoIxcProvedor } from '../../integracao/IntegracaoIxcProvedor';

export class ContratoIntegracaoIxcVinculo extends Model<
  InferAttributes<ContratoIntegracaoIxcVinculo>,
  InferCreationAttributes<ContratoIntegracaoIxcVinculo>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number | null;
  declare contrato_id: number;
  declare integracao_ixc_provedor_id: number;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  declare getContrato: BelongsToGetAssociationMixin<Contrato>;
  declare setContrato: BelongsToSetAssociationMixin<Contrato, number>;
  declare getIntegracaoIxcProvedor: BelongsToGetAssociationMixin<IntegracaoIxcProvedor>;
  declare setIntegracaoIxcProvedor: BelongsToSetAssociationMixin<IntegracaoIxcProvedor, number>;
}

ContratoIntegracaoIxcVinculo.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    contrato_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    integracao_ixc_provedor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
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
    modelName: 'ContratoIntegracaoIxcVinculo',
    tableName: 'adm_contratos_integracao_ixc_vinculos',
    timestamps: true,
    underscored: true,
  }
);
