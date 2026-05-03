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
import { Plano } from '../../cadastros/Plano';

export class ContratoPlanoAdicional extends Model<
  InferAttributes<ContratoPlanoAdicional>,
  InferCreationAttributes<ContratoPlanoAdicional>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number | null;
  declare contrato_id: number;
  declare plano_id: number;
  declare desconto_percentual: number | null;
  declare desconto_valor: number | null;
  declare valor_final: number | null;
  declare status: 'ativo' | 'inativo' | 'suspenso';
  declare observacoes: string | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  // Relacionamentos
  declare getContrato: BelongsToGetAssociationMixin<Contrato>;
  declare setContrato: BelongsToSetAssociationMixin<Contrato, number>;
  declare createContrato: BelongsToCreateAssociationMixin<Contrato>;

  declare getPlano: BelongsToGetAssociationMixin<Plano>;
  declare setPlano: BelongsToSetAssociationMixin<Plano, number>;
  declare createPlano: BelongsToCreateAssociationMixin<Plano>;

  async getValorFinal(): Promise<number> {
    // Retornar valor_final do banco se existir
    if (this.valor_final) {
      return parseFloat(this.valor_final.toString());
    }

    // Se não existe, calcular baseado no plano
    const plano = await this.getPlano();
    let valor = parseFloat(plano.valor_mensal.toString());

    // Sempre usar desconto em valor quando disponível (mais preciso)
    if (this.desconto_valor && this.desconto_valor > 0) {
      valor = Math.max(0, valor - parseFloat(this.desconto_valor.toString()));
    } else if (this.desconto_percentual && this.desconto_percentual > 0) {
      const descontoValor = valor * (parseFloat(this.desconto_percentual.toString()) / 100);
      valor = Math.max(0, valor - descontoValor);
    }

    // Arredondar para 2 casas decimais
    return Math.round(valor * 100) / 100;
  }
}

ContratoPlanoAdicional.init(
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
    contrato_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'adm_contratos_contratos',
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
    status: {
      type: DataTypes.ENUM('ativo', 'inativo', 'suspenso'),
      allowNull: false,
      defaultValue: 'ativo'
    },
    observacoes: {
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
    modelName: 'ContratoPlanoAdicional',
    tableName: 'adm_contratos_contrato_planos_adicionais',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['contrato_id']
      },
      {
        fields: ['plano_id']
      },
      {
        fields: ['status']
      }
    ]
  }
);

