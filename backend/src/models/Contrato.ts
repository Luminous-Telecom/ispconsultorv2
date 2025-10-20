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
import { Cliente } from './Cliente';
import { Plano } from './Plano';
import { Banco } from './Banco';

export class Contrato extends Model<
  InferAttributes<Contrato>,
  InferCreationAttributes<Contrato>
> {
  declare id: CreationOptional<number>;
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
  declare dia_vencimento: number | null;
  declare conta_boleto: number | null;
  declare data_validade_desconto: Date | null;
  declare modelo_contrato_id: number | null;
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
    if (this.valor_final) {
      return parseFloat(this.valor_final.toString());
    }

    const plano = await this.getPlano();
    let valor = parseFloat(plano.valor_mensal.toString());

    if (this.desconto_percentual && this.desconto_percentual > 0) {
      valor = valor * (1 - this.desconto_percentual / 100);
    }

    if (this.desconto_valor && this.desconto_valor > 0) {
      valor = Math.max(0, valor - this.desconto_valor);
    }

    return valor;
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
}

Contrato.init(
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
      }
    },
    plano_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'planos',
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
    dia_vencimento: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Dia do mês para vencimento da mensalidade',
      validate: {
        min: 1,
        max: 31
      }
    },
    conta_boleto: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID do banco para geração de boleto',
      references: {
        model: 'bancos',
        key: 'id'
      }
    },
    data_validade_desconto: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Data de validade do desconto aplicado'
    },
    modelo_contrato_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID do modelo de contrato a ser utilizado',
      references: {
        model: 'documentos_sistema',
        key: 'id'
      }
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
    tableName: 'contratos',
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
