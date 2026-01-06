import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin
} from 'sequelize';
import { sequelize } from '../../../config/database';
import { Fornecedor } from '../Fornecedor';
import { Usuario } from '../../cadastros/Usuario';

export class FornecedorHistorico extends Model<
  InferAttributes<FornecedorHistorico>,
  InferCreationAttributes<FornecedorHistorico>
> {
  declare id: CreationOptional<number>;
  declare fornecedor_id: number;
  declare data: Date;
  declare usuario_id: number | null;
  declare descricao: string;
  declare tipo: 'criacao' | 'atualizacao' | 'exclusao' | 'pagamento' | 'outro';
  declare created_at: CreationOptional<Date>;

  // Relacionamentos
  declare getFornecedor: BelongsToGetAssociationMixin<Fornecedor>;
  declare setFornecedor: BelongsToSetAssociationMixin<Fornecedor, number>;
  declare getUsuario: BelongsToGetAssociationMixin<Usuario>;
  declare setUsuario: BelongsToSetAssociationMixin<Usuario, number>;
}

FornecedorHistorico.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    fornecedor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'fornecedores',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    data: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    tipo: {
      type: DataTypes.ENUM('criacao', 'atualizacao', 'exclusao', 'pagamento', 'outro'),
      allowNull: false,
      defaultValue: 'outro'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    modelName: 'FornecedorHistorico',
    tableName: 'fornecedor_historicos',
    timestamps: false, // Usamos created_at manualmente
    underscored: true,
    indexes: [
      {
        fields: ['fornecedor_id']
      },
      {
        fields: ['data']
      },
      {
        fields: ['usuario_id']
      },
      {
        fields: ['tipo']
      }
    ]
  }
);

