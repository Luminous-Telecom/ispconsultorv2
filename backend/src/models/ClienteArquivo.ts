import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin
} from 'sequelize';
import { sequelize } from '../config/database';
import { Cliente } from './Cliente';

export class ClienteArquivo extends Model<
  InferAttributes<ClienteArquivo>,
  InferCreationAttributes<ClienteArquivo>
> {
  declare id: CreationOptional<number>;
  declare cliente_id: number;
  declare nome: string;
  declare tipo: 'documento' | 'foto' | 'assinatura' | 'outro';
  declare caminho: string;
  declare tamanho: number | null;
  declare mime_type: string | null;
  declare descricao: string | null;
  declare origem: 'manual' | 'assinatura_digital' | 'sistema';
  declare referencia_id: number | null; // ID de referência (ex: assinatura_digital_id)
  declare referencia_tipo: string | null; // Tipo de referência (ex: 'assinatura_digital')
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  // Relacionamentos
  declare getCliente: BelongsToGetAssociationMixin<Cliente>;
  declare setCliente: BelongsToSetAssociationMixin<Cliente, number>;
}

ClienteArquivo.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    cliente_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'clientes',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    nome: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    tipo: {
      type: DataTypes.ENUM('documento', 'foto', 'assinatura', 'outro'),
      allowNull: false,
      defaultValue: 'documento'
    },
    caminho: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    tamanho: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    origem: {
      type: DataTypes.ENUM('manual', 'assinatura_digital', 'sistema'),
      allowNull: false,
      defaultValue: 'manual'
    },
    referencia_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    referencia_tipo: {
      type: DataTypes.STRING(100),
      allowNull: true
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
    modelName: 'ClienteArquivo',
    tableName: 'cliente_arquivos',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['cliente_id']
      },
      {
        fields: ['tipo']
      },
      {
        fields: ['origem']
      },
      {
        fields: ['referencia_tipo', 'referencia_id']
      }
    ]
  }
);
