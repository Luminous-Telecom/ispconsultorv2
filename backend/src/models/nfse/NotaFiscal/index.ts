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
import { Cliente } from '../../clientes/Cliente';
import { formatCreatedAt } from '../../../utils/dateUtils';

export class NotaFiscal extends Model<
  InferAttributes<NotaFiscal>,
  InferCreationAttributes<NotaFiscal>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number | null;
  declare cliente_id: number;
  declare titulo_id: number | null;
  declare numero: string | null;
  declare serie: string | null;
  declare chave_acesso: string | null;
  declare status: 'PENDENTE' | 'PROCESSANDO' | 'AUTORIZADA' | 'CANCELADA' | 'REJEITADA' | 'ERRO';
  declare tipo_operacao: 'ENTRADA' | 'SAIDA';
  declare modelo: number;
  declare natureza_operacao: string;
  declare data_emissao: Date;
  declare data_vencimento: Date | null;
  declare valor_total: number;
  declare valor_produtos: number;
  declare valor_servicos: number;
  declare valor_desconto: number;
  declare valor_icms: number;
  declare valor_iss: number;
  declare aliquota_iss: number;
  declare cst_icms: string | null;
  declare cfop: string | null;
  declare descricao: string | null;
  declare observacoes: string | null;
  declare xml: string | null;
  declare pdf_url: string | null;
  declare pdf_base64: string | null;
  declare danfe_url: string | null;
  declare protocolo: string | null;
  declare data_autorizacao: Date | null;
  declare mensagem_erro: string | null;
  declare codigo_erro: string | null;
  declare nfse_status: 'agendado' | 'emitida' | 'cancelada' | 'rejeitada' | 'erro' | null;
  declare asaas_invoice_id: string | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  // Relacionamentos
  declare getCliente: BelongsToGetAssociationMixin<Cliente>;
  declare setCliente: BelongsToSetAssociationMixin<Cliente, number>;

  /**
   * Formata created_at para exibição
   */
  getCreatedAtFormatada(): string | null {
    if (!this.created_at) return null;
    return formatCreatedAt(this.created_at);
  }

  /**
   * Verifica se a nota está autorizada
   */
  isAutorizada(): boolean {
    return this.status === 'AUTORIZADA';
  }

  /**
   * Verifica se a nota pode ser cancelada
   */
  podeCancelar(): boolean {
    return this.status === 'AUTORIZADA';
  }

  /**
   * Formata valor para exibição
   */
  getValorFormatado(): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(this.valor_total));
  }

  toJSON(): Record<string, unknown> {
    const json = super.toJSON() as Record<string, unknown>;
    json.created_at_formatada = this.getCreatedAtFormatada();
    json.valor_formatado = this.getValorFormatado();
    json.is_autorizada = this.isAutorizada();
    json.pode_cancelar = this.podeCancelar();
    return json;
  }
}

NotaFiscal.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    cliente_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'adm_clientes',
        key: 'id'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    },
    titulo_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'adm_titulos',
        key: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    },
    numero: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    serie: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    chave_acesso: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true
    },
    status: {
      type: DataTypes.ENUM('PENDENTE', 'PROCESSANDO', 'AUTORIZADA', 'CANCELADA', 'REJEITADA', 'ERRO'),
      allowNull: false,
      defaultValue: 'PENDENTE'
    },
    tipo_operacao: {
      type: DataTypes.ENUM('ENTRADA', 'SAIDA'),
      allowNull: false,
      defaultValue: 'SAIDA'
    },
    modelo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 55
    },
    natureza_operacao: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'PRESTAÇÃO DE SERVIÇOS'
    },
    data_emissao: {
      type: DataTypes.DATE,
      allowNull: false
      // Sem defaultValue para usar a data fornecida no código
    },
    data_vencimento: {
      type: DataTypes.DATE,
      allowNull: true
    },
    valor_total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: 0
      }
    },
    valor_produtos: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    valor_servicos: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    valor_desconto: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    valor_icms: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    valor_iss: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    aliquota_iss: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    cst_icms: {
      type: DataTypes.STRING(3),
      allowNull: true
    },
    cfop: {
      type: DataTypes.STRING(4),
      allowNull: true
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    xml: {
      type: DataTypes.TEXT('long'),
      allowNull: true
    },
    pdf_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    pdf_base64: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      comment: 'PDF da NFS-e em base64'
    },
    danfe_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    protocolo: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    data_autorizacao: {
      type: DataTypes.DATE,
      allowNull: true
    },
    mensagem_erro: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    codigo_erro: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    nfse_status: {
      type: DataTypes.ENUM('agendado', 'emitida', 'cancelada', 'rejeitada', 'erro'),
      allowNull: true,
      comment: 'Status da NFS-e: agendado, emitida, cancelada, rejeitada, erro'
    },
    asaas_invoice_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'ID da invoice no Asaas para vincular com webhooks'
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
    modelName: 'NotaFiscal',
    tableName: 'adm_notas_fiscais',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['chave_acesso']
      },
      {
        fields: ['cliente_id']
      },
      {
        fields: ['titulo_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['numero']
      },
      {
        fields: ['data_emissao']
      },
      {
        fields: ['nfse_status']
      },
      {
        fields: ['asaas_invoice_id']
      }
    ]
  }
);

