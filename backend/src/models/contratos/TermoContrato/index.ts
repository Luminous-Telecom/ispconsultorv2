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
import { sequelize } from '../../../config/database';
import { Contrato } from '../Contrato';
import { ModeloDocumento } from '../../documentos/ModeloDocumento';

export class TermoContrato extends Model<
  InferAttributes<TermoContrato>,
  InferCreationAttributes<TermoContrato>
> {
  declare id: CreationOptional<number>;
  declare contrato_id: number;
  declare modelo_documento_id: number | null;
  declare tipo_termo: 'adesao' | 'permanencia' | 'cancelamento' | 'alteracao';
  declare conteudo: string;
  declare assinado: 'SIM' | 'NAO';
  declare data_aceite: Date | null;
  declare aceito_por: string | null;
  declare observacoes: string | null;
  declare ativo: boolean;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  // Relacionamentos
  declare getContrato: BelongsToGetAssociationMixin<Contrato>;
  declare setContrato: BelongsToSetAssociationMixin<Contrato, number>;
  declare createContrato: BelongsToCreateAssociationMixin<Contrato>;

  declare getModeloDocumento: BelongsToGetAssociationMixin<ModeloDocumento>;
  declare setModeloDocumento: BelongsToSetAssociationMixin<ModeloDocumento, number>;
  declare createModeloDocumento: BelongsToCreateAssociationMixin<ModeloDocumento>;

  // Métodos de instância
  static async findByContrato(contratoId: number): Promise<TermoContrato[]> {
    return this.findAll({
      where: { contrato_id: contratoId },
      include: [
        {
          association: 'modeloDocumento',
          attributes: ['id', 'nome', 'tipo']
        }
      ],
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
    this.assinado = 'SIM';
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
    modelo_documento_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'modelo_documento',
        key: 'id'
      }
    },
    tipo_termo: {
      type: DataTypes.ENUM('adesao', 'permanencia', 'cancelamento', 'alteracao'),
      allowNull: false
    },
    conteudo: {
      type: DataTypes.TEXT('long'),
      allowNull: false
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
    observacoes: {
      type: DataTypes.TEXT,
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
        fields: ['modelo_documento_id']
      },
      {
        fields: ['ativo']
      }
    ]
  }
);
