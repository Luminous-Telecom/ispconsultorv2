import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  BelongsToGetAssociationMixin,
} from '../../../db/orm';
import { sequelize } from '../../../config/database';
import { isTituloVencida } from '../../../utils/tituloVencimentoUtils';
import { SaasPlano } from '../SaasPlano';
import { SaasBanco } from '../SaasBanco';
import { SaasContrato } from '../SaasContrato';

export type SaasTituloStatus =
  | 'pendente'
  | 'pago'
  | 'vencido'
  | 'cancelado'
  | 'parcial'
  | 'pago_atraso';

export class SaasTitulo extends Model<
  InferAttributes<SaasTitulo>,
  InferCreationAttributes<SaasTitulo>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number;
  declare plano_id: number;
  declare banco_id: number;
  declare contrato_id: CreationOptional<number | null>;
  declare numero_titulo: string;
  declare valor: number;
  declare data_vencimento: Date;
  declare status: SaasTituloStatus;
  declare pago: boolean;
  declare data_pagamento: CreationOptional<Date | null>;
  declare valor_pago: CreationOptional<number | null>;
  declare valor_aberto: CreationOptional<number | null>;
  declare codigo_barras: CreationOptional<string | null>;
  declare linha_digitavel: CreationOptional<string | null>;
  declare qrcode: CreationOptional<string | null>;
  declare qrcode_image: CreationOptional<string | null>;
  declare observacoes: CreationOptional<string | null>;
  declare desconto_percentual: CreationOptional<number | null>;
  declare desconto_valor: CreationOptional<number | null>;
  declare acrescimo_percentual: CreationOptional<number | null>;
  declare acrescimo_valor: CreationOptional<number | null>;
  declare valor_final: CreationOptional<number | null>;
  declare descricao: CreationOptional<string | null>;
  declare charge_id: CreationOptional<string | null>;
  declare url_boleto: CreationOptional<string | null>;
  declare nosso_numero: CreationOptional<string | null>;
  declare is_avulso: boolean;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  declare getPlano: BelongsToGetAssociationMixin<SaasPlano>;
  declare getBanco: BelongsToGetAssociationMixin<SaasBanco>;
  declare getContrato: BelongsToGetAssociationMixin<SaasContrato>;

  toJSON(): Record<string, unknown> {
    const json = this.get({ plain: true }) as Record<string, unknown>;
    json.vencida = isTituloVencida({ status: this.status, data_vencimento: this.data_vencimento });
    return json;
  }
}

SaasTitulo.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    empresa_id: { type: DataTypes.INTEGER, allowNull: false },
    plano_id: { type: DataTypes.INTEGER, allowNull: false },
    banco_id: { type: DataTypes.INTEGER, allowNull: false },
    contrato_id: { type: DataTypes.INTEGER, allowNull: true },
    numero_titulo: { type: DataTypes.STRING(100), allowNull: false },
    valor: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    data_vencimento: { type: DataTypes.DATE, allowNull: false },
    status: {
      type: DataTypes.ENUM(
        'pendente',
        'pago',
        'vencido',
        'cancelado',
        'parcial',
        'pago_atraso'
      ),
      allowNull: false,
      defaultValue: 'pendente',
    },
    pago: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    data_pagamento: { type: DataTypes.DATE, allowNull: true },
    valor_pago: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    valor_aberto: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    codigo_barras: { type: DataTypes.STRING(255), allowNull: true },
    linha_digitavel: { type: DataTypes.STRING(255), allowNull: true },
    qrcode: { type: DataTypes.TEXT, allowNull: true },
    qrcode_image: { type: DataTypes.TEXT, allowNull: true },
    observacoes: { type: DataTypes.TEXT, allowNull: true },
    desconto_percentual: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    desconto_valor: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    acrescimo_percentual: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    acrescimo_valor: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    valor_final: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    descricao: { type: DataTypes.TEXT, allowNull: true },
    charge_id: { type: DataTypes.STRING(100), allowNull: true },
    url_boleto: { type: DataTypes.STRING(500), allowNull: true },
    nosso_numero: { type: DataTypes.STRING(50), allowNull: true },
    is_avulso: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'saas_titulos',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default SaasTitulo;
