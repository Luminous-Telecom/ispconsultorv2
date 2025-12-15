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
import { TermoContrato } from './TermoContrato';
import { Cliente } from './Cliente';

export class AssinaturaDigital extends Model<
  InferAttributes<AssinaturaDigital>,
  InferCreationAttributes<AssinaturaDigital>
> {
  declare id: CreationOptional<number>;
  declare termo_contrato_id: number | null;
  declare cliente_id: number | null;
  declare documento_tipo: 'termo' | 'contrato' | 'outro';
  declare documento_id: number | null;
  declare api_provider: 'assinafy' | 'zapsign' | 'govbr' | 'outro';
  declare api_document_id: string | null;
  declare api_signature_id: string | null;
  declare status: 'pendente' | 'enviado' | 'assinado' | 'cancelado' | 'expirado' | 'erro';
  declare url_assinatura: string | null;
  declare email_assinante: string | null;
  declare nome_assinante: string | null;
  declare cpf_cnpj_assinante: string | null;
  declare data_envio: Date | null;
  declare data_assinatura: Date | null;
  declare data_expiracao: Date | null;
  declare pdf_assinado_url: string | null;
  declare pdf_assinado_base64: string | null;
  declare metadata: string | null;
  declare erro_mensagem: string | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  // Relacionamentos
  declare getTermoContrato: BelongsToGetAssociationMixin<TermoContrato>;
  declare setTermoContrato: BelongsToSetAssociationMixin<TermoContrato, number>;

  declare getCliente: BelongsToGetAssociationMixin<Cliente>;
  declare setCliente: BelongsToSetAssociationMixin<Cliente, number>;

  // Métodos de instância
  async marcarComoAssinado(dataAssinatura?: Date): Promise<void> {
    this.status = 'assinado';
    this.data_assinatura = dataAssinatura || new Date();
    await this.save();
  }

  async marcarComoEnviado(): Promise<void> {
    this.status = 'enviado';
    this.data_envio = new Date();
    await this.save();
  }

  async marcarErro(mensagem: string): Promise<void> {
    this.status = 'erro';
    this.erro_mensagem = mensagem;
    await this.save();
  }

  static async findByTermoContrato(termoContratoId: number): Promise<AssinaturaDigital[]> {
    return this.findAll({
      where: { termo_contrato_id: termoContratoId },
      order: [['created_at', 'DESC']]
    });
  }

  static async findByCliente(clienteId: number): Promise<AssinaturaDigital[]> {
    return this.findAll({
      where: { cliente_id: clienteId },
      order: [['created_at', 'DESC']]
    });
  }

  static async findByStatus(status: AssinaturaDigital['status']): Promise<AssinaturaDigital[]> {
    return this.findAll({
      where: { status },
      order: [['created_at', 'DESC']]
    });
  }
}

AssinaturaDigital.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    termo_contrato_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'termos_contrato',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    cliente_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'clientes',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    documento_tipo: {
      type: DataTypes.ENUM('termo', 'contrato', 'outro'),
      allowNull: false,
      defaultValue: 'termo'
    },
    documento_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    api_provider: {
      type: DataTypes.ENUM('assinafy', 'zapsign', 'govbr', 'outro'),
      allowNull: false,
      defaultValue: 'assinafy'
    },
    api_document_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    api_signature_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pendente', 'enviado', 'assinado', 'cancelado', 'expirado', 'erro'),
      allowNull: false,
      defaultValue: 'pendente'
    },
    url_assinatura: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    email_assinante: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    nome_assinante: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    cpf_cnpj_assinante: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    data_envio: {
      type: DataTypes.DATE,
      allowNull: true
    },
    data_assinatura: {
      type: DataTypes.DATE,
      allowNull: true
    },
    data_expiracao: {
      type: DataTypes.DATE,
      allowNull: true
    },
    pdf_assinado_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    pdf_assinado_base64: {
      type: DataTypes.TEXT('long'),
      allowNull: true
    },
    metadata: {
      type: DataTypes.TEXT('long'),
      allowNull: true
    },
    erro_mensagem: {
      type: DataTypes.TEXT,
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
    modelName: 'AssinaturaDigital',
    tableName: 'assinaturas_digital',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['termo_contrato_id']
      },
      {
        fields: ['cliente_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['api_document_id']
      },
      {
        fields: ['api_signature_id']
      },
      {
        fields: ['email_assinante']
      }
    ]
  }
);
