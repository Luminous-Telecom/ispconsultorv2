import { Model, DataTypes, CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../../config/database';
import { formatCreatedAt } from '../../../utils/dateUtils';

export class SaasBanco extends Model<
  InferAttributes<SaasBanco>,
  InferCreationAttributes<SaasBanco>
> {
  declare id: CreationOptional<number>;
  declare nome: string;
  declare banco: string;
  declare codigo: CreationOptional<string | null>;
  declare descricao: CreationOptional<string | null>;
  declare tipo_banco: 'efi' | 'asaas' | 'bancario' | 'outros';
  declare agencia: CreationOptional<string | null>;
  declare conta: CreationOptional<string | null>;
  declare tipo_conta: CreationOptional<'corrente' | 'poupanca' | 'pagamento'>;
  declare pix_chave: CreationOptional<string | null>;
  declare pix_tipo: CreationOptional<'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria' | null>;
  declare ativo: CreationOptional<boolean>;
  declare api_url: CreationOptional<string | null>;
  declare api_key: CreationOptional<string | null>;
  declare api_secret: CreationOptional<string | null>;
  declare sandbox: CreationOptional<boolean>;
  declare identificador_conta: CreationOptional<string | null>;
  declare client_id_producao: CreationOptional<string | null>;
  declare client_secret_producao: CreationOptional<string | null>;
  declare url_retorno: CreationOptional<string | null>;
  declare webhook_secret: CreationOptional<string | null>;
  declare repassar_email_cliente: CreationOptional<boolean>;
  declare percentual_multa: CreationOptional<number | null>;
  declare percentual_juros: CreationOptional<number | null>;
  declare desconto_tipo: CreationOptional<string | null>;
  declare desconto_valor: CreationOptional<number | null>;
  declare contra_apresentacao: CreationOptional<boolean>;
  declare recalcular_segunda_via: CreationOptional<boolean>;
  declare maximo_dias_recalcular: CreationOptional<number | null>;
  declare layout_web: CreationOptional<string | null>;
  declare layout_pdf: CreationOptional<string | null>;
  declare local_pagamento: CreationOptional<string | null>;
  declare dados_avalista: CreationOptional<string | null>;
  declare exibir_mes_referente: CreationOptional<boolean>;
  declare taxa_cobranca: CreationOptional<number | null>;
  declare incluir_taxa: CreationOptional<boolean>;
  declare observacao_linha_1: CreationOptional<string | null>;
  declare observacao_linha_2: CreationOptional<string | null>;
  declare observacao_linha_3: CreationOptional<string | null>;
  declare observacao_linha_4: CreationOptional<string | null>;
  declare instrucao_linha_1: CreationOptional<string | null>;
  declare instrucao_linha_2: CreationOptional<string | null>;
  declare instrucao_linha_3: CreationOptional<string | null>;
  declare instrucao_linha_4: CreationOptional<string | null>;
  declare instrucao_linha_5: CreationOptional<string | null>;
  declare configuracoes: CreationOptional<Record<string, unknown> | null>;
  declare logo: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  getCreatedAtFormatada(): string | null {
    if (!this.created_at) return null;
    return formatCreatedAt(this.getDataValue('created_at'));
  }

  toJSON(): Record<string, unknown> {
    const {
      api_key: _apiKey,
      api_secret: _apiSecret,
      client_secret_producao: _clientSecretProducao,
      ...safeValues
    } = { ...this.get() } as Record<string, unknown>;

    return {
      ...safeValues,
      api_key: this.getDataValue('api_key'),
      has_api_key: !!this.getDataValue('api_key'),
      has_api_secret: !!this.getDataValue('api_secret'),
      has_client_secret_producao: !!this.getDataValue('client_secret_producao'),
      created_at_formatada: this.getCreatedAtFormatada(),
    };
  }
}

SaasBanco.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nome: { type: DataTypes.STRING(255), allowNull: false, defaultValue: 'Banco' },
    banco: { type: DataTypes.STRING(100), allowNull: false },
    codigo: { type: DataTypes.STRING(10), allowNull: true },
    descricao: { type: DataTypes.TEXT, allowNull: true },
    tipo_banco: {
      type: DataTypes.ENUM('efi', 'asaas', 'bancario', 'outros'),
      allowNull: false,
      defaultValue: 'bancario',
    },
    agencia: { type: DataTypes.STRING(20), allowNull: true },
    conta: { type: DataTypes.STRING(30), allowNull: true },
    tipo_conta: {
      type: DataTypes.ENUM('corrente', 'poupanca', 'pagamento'),
      allowNull: false,
      defaultValue: 'corrente',
    },
    pix_chave: { type: DataTypes.STRING(255), allowNull: true },
    pix_tipo: {
      type: DataTypes.ENUM('cpf', 'cnpj', 'email', 'telefone', 'aleatoria'),
      allowNull: true,
    },
    ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    api_url: { type: DataTypes.STRING(500), allowNull: true },
    api_key: { type: DataTypes.STRING(255), allowNull: true },
    api_secret: { type: DataTypes.STRING(255), allowNull: true },
    sandbox: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    identificador_conta: { type: DataTypes.STRING(100), allowNull: true },
    client_id_producao: { type: DataTypes.STRING(255), allowNull: true },
    client_secret_producao: { type: DataTypes.STRING(255), allowNull: true },
    url_retorno: { type: DataTypes.STRING(500), allowNull: true },
    webhook_secret: { type: DataTypes.STRING(255), allowNull: true },
    repassar_email_cliente: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    percentual_multa: { type: DataTypes.DECIMAL(5, 2), allowNull: true, defaultValue: 2.0 },
    percentual_juros: { type: DataTypes.DECIMAL(5, 2), allowNull: true, defaultValue: 1.0 },
    desconto_tipo: { type: DataTypes.STRING(50), allowNull: true },
    desconto_valor: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    contra_apresentacao: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    recalcular_segunda_via: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    maximo_dias_recalcular: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 30 },
    layout_web: { type: DataTypes.TEXT, allowNull: true },
    layout_pdf: { type: DataTypes.TEXT, allowNull: true },
    local_pagamento: { type: DataTypes.STRING(255), allowNull: true },
    dados_avalista: { type: DataTypes.TEXT, allowNull: true },
    exibir_mes_referente: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    taxa_cobranca: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    incluir_taxa: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    observacao_linha_1: { type: DataTypes.STRING(255), allowNull: true },
    observacao_linha_2: { type: DataTypes.STRING(255), allowNull: true },
    observacao_linha_3: { type: DataTypes.STRING(255), allowNull: true },
    observacao_linha_4: { type: DataTypes.STRING(255), allowNull: true },
    instrucao_linha_1: { type: DataTypes.STRING(255), allowNull: true },
    instrucao_linha_2: { type: DataTypes.STRING(255), allowNull: true },
    instrucao_linha_3: { type: DataTypes.STRING(255), allowNull: true },
    instrucao_linha_4: { type: DataTypes.STRING(255), allowNull: true },
    instrucao_linha_5: { type: DataTypes.STRING(255), allowNull: true },
    configuracoes: { type: DataTypes.JSON, allowNull: true },
    logo: { type: DataTypes.STRING(500), allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'saas_bancos',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeCreate: (instance: SaasBanco) => {
        if (!instance.nome) instance.nome = instance.banco || 'Banco';
      },
    },
  }
);

export default SaasBanco;
