import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../../config/database';

export class AtendimentoTecnico extends Model<
  InferAttributes<AtendimentoTecnico>,
  InferCreationAttributes<AtendimentoTecnico>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number | null;
  declare integracao_ixc_provedor_id: number | null;
  declare nome: string;
  declare ixc_id: string | null;
  declare ixc: boolean;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

AtendimentoTecnico.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'sistema_tenants',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    integracao_ixc_provedor_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'integracao_ixc_provedor',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    nome: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    ixc_id: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    ixc: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
    modelName: 'AtendimentoTecnico',
    tableName: 'atendimentos_tecnicos',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['empresa_id'] },
      { fields: ['integracao_ixc_provedor_id'] },
      { fields: ['ixc_id'] },
      { fields: ['ixc'] },
      { unique: true, fields: ['integracao_ixc_provedor_id', 'ixc_id'] },
    ],
  }
);
