import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  BelongsToCreateAssociationMixin,
  HasManyGetAssociationsMixin,
  HasManySetAssociationsMixin,
  HasManyAddAssociationMixin,
  HasManyAddAssociationsMixin,
  HasManyCreateAssociationMixin,
  HasManyRemoveAssociationMixin,
  HasManyRemoveAssociationsMixin,
  HasManyHasAssociationMixin,
  HasManyHasAssociationsMixin,
  HasManyCountAssociationsMixin
} from 'sequelize';
import { sequelize } from '../../../config/database';
import { Cliente } from '../../clientes/Cliente';
import { Plano } from '../../cadastros/Plano';
import { Banco } from '../../cadastros/Banco';
import { TipoCobrancaContrato } from '../../cadastros/TipoCobrancaContrato';
import { TermoContrato } from '../TermoContrato';
import { ModeloDocumento } from '../../documentos/ModeloDocumento';
import { IntegracaoIxcProvedor } from '../../integracao/IntegracaoIxcProvedor';
import { formatCreatedAt } from '../../../utils/dateUtils';

export class Contrato extends Model<
  InferAttributes<Contrato>,
  InferCreationAttributes<Contrato>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number | null;
  declare cliente_id: number;
  declare plano_id: number;
  declare desconto_percentual: number | null;
  declare desconto_valor: number | null;
  declare valor_final: number | null;
  declare data_inicio: Date | null;
  declare data_fim: Date | null;
  declare status: 'ativo' | 'inativo' | 'suspenso';
  declare observacoes: string | null;
  declare isento_mensalidade: boolean;
  declare dia_vencimento_id: number | null;
  declare conta_boleto: number | null;
  declare tipo_cobranca_contrato_id: number;
  declare data_validade_desconto: Date | null;
  declare modelo_documento_id: number | null;
  declare integracao_ixc_provedor_id: number | null;
  declare endereco: string | null;
  declare numero: string | null;
  declare complemento: string | null;
  declare bairro: string | null;
  declare cidade: string | null;
  declare estado: string | null;
  declare usar_endereco_cliente: boolean;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  // Relacionamentos
  declare getCliente: BelongsToGetAssociationMixin<Cliente>;
  declare setCliente: BelongsToSetAssociationMixin<Cliente, number>;
  declare createCliente: BelongsToCreateAssociationMixin<Cliente>;

  declare getPlano: BelongsToGetAssociationMixin<Plano>;
  declare setPlano: BelongsToSetAssociationMixin<Plano, number>;
  declare createPlano: BelongsToCreateAssociationMixin<Plano>;

  declare getBancoBoleto: BelongsToGetAssociationMixin<Banco>;
  declare setBancoBoleto: BelongsToSetAssociationMixin<Banco, number>;
  declare createBancoBoleto: BelongsToCreateAssociationMixin<Banco>;

  declare getTipoCobrancaContrato: BelongsToGetAssociationMixin<TipoCobrancaContrato>;
  declare setTipoCobrancaContrato: BelongsToSetAssociationMixin<TipoCobrancaContrato, number>;
  declare createTipoCobrancaContrato: BelongsToCreateAssociationMixin<TipoCobrancaContrato>;

  declare getIntegracaoIxcProvedor: BelongsToGetAssociationMixin<IntegracaoIxcProvedor>;
  declare setIntegracaoIxcProvedor: BelongsToSetAssociationMixin<IntegracaoIxcProvedor, number>;

  // Relacionamentos com Termos
  declare getTermos: HasManyGetAssociationsMixin<TermoContrato>;
  declare setTermos: HasManySetAssociationsMixin<TermoContrato, number>;
  declare addTermo: HasManyAddAssociationMixin<TermoContrato, number>;
  declare addTermos: HasManyAddAssociationsMixin<TermoContrato, number>;
  declare createTermo: HasManyCreateAssociationMixin<TermoContrato>;
  declare removeTermo: HasManyRemoveAssociationMixin<TermoContrato, number>;
  declare removeTermos: HasManyRemoveAssociationsMixin<TermoContrato, number>;
  declare hasTermo: HasManyHasAssociationMixin<TermoContrato, number>;
  declare hasTermos: HasManyHasAssociationsMixin<TermoContrato, number>;
  declare countTermos: HasManyCountAssociationsMixin;

  // Métodos de instância
  static async findAtivos(): Promise<Contrato[]> {
    return this.findAll({
      where: { status: 'ativo' },
      include: [
        { association: 'cliente' },
        { association: 'plano' }
      ],
      order: [['created_at', 'DESC']]
    });
  }

  async getValorFinal(): Promise<number> {
    // Retornar valor_final do banco se existir
    if (this.valor_final) {
      return parseFloat(this.valor_final.toString());
    }

    // Se não existe, calcular baseado no plano atual
    const plano = await this.getPlano();
    const valorOriginal = parseFloat(plano.valor_mensal.toString());

    const { FinancialCalculationsService } = await import('../../../services/FinancialCalculationsService');
    
    const resultado = FinancialCalculationsService.calcularDesconto(valorOriginal, {
      desconto_valor: this.desconto_valor,
      desconto_percentual: this.desconto_percentual
    });

    return resultado.valorFinal;
  }

  async isVigente(): Promise<boolean> {
    const agora = new Date();
    
    if (this.data_inicio && this.data_inicio > agora) {
      return false; // Ainda não começou
    }
    
    if (this.data_fim && this.data_fim < agora) {
      return false; // Já expirou
    }
    
    return this.status === 'ativo';
  }

  async getDiasRestantes(): Promise<number | null> {
    if (!this.data_fim) {
      return null; // Sem data de fim
    }
    
    const agora = new Date();
    const diferenca = this.data_fim.getTime() - agora.getTime();
    const dias = Math.ceil(diferenca / (1000 * 60 * 60 * 24));
    
    return dias > 0 ? dias : 0;
  }

  // Métodos para gerenciar termos
  async getTermosAtivos(): Promise<TermoContrato[]> {
    return TermoContrato.findAtivosByContrato(this.id);
  }

  async adicionarTermo(modeloDocumentoId: number, tipoTermo: 'adesao' | 'permanencia' | 'cancelamento' | 'alteracao' = 'adesao', assinado: 'SIM' | 'NAO' = 'NAO'): Promise<TermoContrato> {
    const modeloDocumento = await ModeloDocumento.findByPk(modeloDocumentoId);
    if (!modeloDocumento) {
      throw new Error('Modelo de documento não encontrado');
    }
    
    return this.createTermo({
      contrato_id: this.id,
      modelo_documento_id: modeloDocumentoId,
      tipo_termo: tipoTermo,
      conteudo: modeloDocumento.conteudo,
      assinado: assinado,
      ativo: true
    });
  }

  /**
   * Formata created_at para exibição (sem conversão de timezone)
   */
  getCreatedAtFormatada(): string | null {
    if (!this.created_at) return null;
    return formatCreatedAt(this.getDataValue('created_at'));
  }

  /**
   * Sobrescrever toJSON para incluir created_at_formatada
   */
  toJSON(): Record<string, unknown> {
    const json = this.get({ plain: true }) as Record<string, unknown>;
    json.created_at_formatada = this.getCreatedAtFormatada();
    return json;
  }
}

Contrato.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    cliente_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'adm_clientes_clientes',
        key: 'id'
      }
    },
    plano_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'adm_cadastros_planos',
        key: 'id'
      }
    },
    desconto_percentual: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    },
    desconto_valor: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0
      }
    },
    valor_final: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    data_inicio: {
      type: DataTypes.DATE,
      allowNull: true
    },
    data_fim: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('ativo', 'inativo', 'suspenso'),
      allowNull: false,
      defaultValue: 'ativo'
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isento_mensalidade: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Se o cliente está isento de mensalidade'
    },
    dia_vencimento_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID do dia de vencimento configurado',
      references: {
        model: 'adm_cadastros_dias_vencimento',
        key: 'id'
      }
    },
    conta_boleto: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID do banco para geração de boleto',
      references: {
        model: 'adm_cadastros_bancos',
        key: 'id'
      }
    },
    tipo_cobranca_contrato_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Tipo de cobrança (quantidade de títulos e periodicidade)',
      references: {
        model: 'adm_cadastros_tipos_cobranca_contrato',
        key: 'id'
      }
    },
    data_validade_desconto: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Data de validade do desconto aplicado'
    },
    modelo_documento_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID do modelo de documento a ser utilizado',
      references: {
        model: 'adm_documentos_modelo_documento',
        key: 'id'
      }
    },
    integracao_ixc_provedor_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Integração IXC Provedor vinculada ao contrato',
      references: {
        model: 'adm_integracao_ixc_provedor',
        key: 'id',
      },
    },
    endereco: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Endereço do contrato'
    },
    numero: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Número do endereço do contrato'
    },
    complemento: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Complemento do endereço do contrato'
    },
    bairro: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Bairro do endereço do contrato'
    },
    cidade: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Cidade do endereço do contrato'
    },
    estado: {
      type: DataTypes.STRING(2),
      allowNull: true,
      comment: 'Estado do endereço do contrato'
    },
    usar_endereco_cliente: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Se verdadeiro, usa o endereço do cadastro do cliente'
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
    modelName: 'Contrato',
    tableName: 'adm_contratos_contratos',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['cliente_id']
      },
      {
        fields: ['plano_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['cliente_id', 'plano_id'],
        unique: true
      }
    ]
  }
);
