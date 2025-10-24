import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  BelongsToCreateAssociationMixin
} from 'sequelize';
import { sequelize } from '../config/database';
import { Contrato } from './Contrato';

export class TermoContrato extends Model<
  InferAttributes<TermoContrato>,
  InferCreationAttributes<TermoContrato>
> {
  declare id: CreationOptional<number>;
  declare contrato_id: number;
  declare modelo_termo_id: number | null;
  declare assinado: 'SIM' | 'NAO';
  declare data_aceite: Date | null;
  declare aceito_por: string | null;
  declare ativo: boolean;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  // Relacionamentos
  declare getContrato: BelongsToGetAssociationMixin<Contrato>;
  declare setContrato: BelongsToSetAssociationMixin<Contrato, number>;
  declare createContrato: BelongsToCreateAssociationMixin<Contrato>;

  // Métodos de instância
  static async findByContrato(contratoId: number): Promise<TermoContrato[]> {
    return this.findAll({
      where: { contrato_id: contratoId },
      order: [['created_at', 'DESC']]
    });
  }

  static async findAtivosByContrato(contratoId: number): Promise<TermoContrato[]> {
    return this.findAll({
      where: { 
        contrato_id: contratoId,
        ativo: true 
      },
      order: [['created_at', 'DESC']]
    });
  }

  async marcarComoAceito(aceitoPor: string): Promise<void> {
    this.data_aceite = new Date();
    this.aceito_por = aceitoPor;
    await this.save();
  }
}

TermoContrato.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    contrato_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'contratos',
        key: 'id'
      }
    },
    modelo_termo_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'modelos_termo',
        key: 'id'
      }
    },
    assinado: {
      type: DataTypes.ENUM('SIM', 'NAO'),
      allowNull: false,
      defaultValue: 'NAO'
    },
    data_aceite: {
      type: DataTypes.DATE,
      allowNull: true
    },
    aceito_por: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
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
    modelName: 'TermoContrato',
    tableName: 'termos_contrato',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['contrato_id']
      },
      {
        fields: ['modelo_termo_id']
      },
      {
        fields: ['ativo']
      }
    ]
  }
);
