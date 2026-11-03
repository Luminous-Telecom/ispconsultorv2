import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from '../../../db/orm';
import { sequelize } from '../../../config/database';

export class Vendedor extends Model<
  InferAttributes<Vendedor>,
  InferCreationAttributes<Vendedor>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number | null;
  declare nome: string;
  declare comissao_percentual: number | null;
  declare comissao_valor: number | null;
  declare cep: string | null;
  declare endereco: string | null;
  declare numero: string | null;
  declare complemento: string | null;
  declare bairro: string | null;
  declare cidade: string | null;
  declare estado: string | null;
  declare telefone: string | null;
  declare celular: string | null;
  declare cpf_cnpj: string | null;
  declare email: string | null;
  declare ativo: boolean;
  declare forma_recebimento: 'BOLETO' | 'DEBITO_CONTA' | 'TRANSFERENCIA' | 'PIX' | 'OUTRAS' | null;
  declare tipo_conta: 'CORRENTE' | 'POUPANCA' | null;
  declare banco_nome: string | null;
  declare codigo_banco: string | null;
  declare tipo_chave_pix: 'CPF' | 'CELULAR' | 'EMAIL' | 'ALEATORIA' | null;
  declare chave_pix: string | null;
  declare tipo_pessoa_titular: 'FISICA' | 'JURIDICA' | null;
  declare nome_titular: string | null;
  declare cpf_cnpj_titular: string | null;
  declare agencia: string | null;
  declare digito_agencia: string | null;
  declare conta: string | null;
  declare digito_conta: string | null;
  declare codigo_operacao: string | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Vendedor.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    empresa_id: { type: DataTypes.INTEGER, allowNull: true },
    nome: { type: DataTypes.STRING(255), allowNull: false },
    comissao_percentual: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    comissao_valor: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    cep: { type: DataTypes.STRING(10), allowNull: true },
    endereco: { type: DataTypes.STRING(255), allowNull: true },
    numero: { type: DataTypes.STRING(20), allowNull: true },
    complemento: { type: DataTypes.STRING(100), allowNull: true },
    bairro: { type: DataTypes.STRING(100), allowNull: true },
    cidade: { type: DataTypes.STRING(100), allowNull: true },
    estado: { type: DataTypes.STRING(2), allowNull: true },
    telefone: { type: DataTypes.STRING(20), allowNull: true },
    celular: { type: DataTypes.STRING(20), allowNull: true },
    cpf_cnpj: { type: DataTypes.STRING(18), allowNull: true },
    email: { type: DataTypes.STRING(180), allowNull: true },
    ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    forma_recebimento: { type: DataTypes.STRING(30), allowNull: true },
    tipo_conta: { type: DataTypes.STRING(20), allowNull: true },
    banco_nome: { type: DataTypes.STRING(100), allowNull: true },
    codigo_banco: { type: DataTypes.STRING(10), allowNull: true },
    tipo_chave_pix: { type: DataTypes.STRING(20), allowNull: true },
    chave_pix: { type: DataTypes.STRING(200), allowNull: true },
    tipo_pessoa_titular: { type: DataTypes.STRING(20), allowNull: true },
    nome_titular: { type: DataTypes.STRING(255), allowNull: true },
    cpf_cnpj_titular: { type: DataTypes.STRING(18), allowNull: true },
    agencia: { type: DataTypes.STRING(10), allowNull: true },
    digito_agencia: { type: DataTypes.STRING(2), allowNull: true },
    conta: { type: DataTypes.STRING(20), allowNull: true },
    digito_conta: { type: DataTypes.STRING(2), allowNull: true },
    codigo_operacao: { type: DataTypes.STRING(10), allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'Vendedor',
    tableName: 'cadastros_vendedores',
    timestamps: true,
    underscored: true,
  }
);
