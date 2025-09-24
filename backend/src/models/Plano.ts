import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  HasManyGetAssociationsMixin,
  HasManyAddAssociationMixin,
  HasManyAddAssociationsMixin,
  HasManySetAssociationsMixin,
  HasManyRemoveAssociationMixin,
  HasManyRemoveAssociationsMixin,
  HasManyHasAssociationMixin,
  HasManyHasAssociationsMixin,
  HasManyCountAssociationsMixin,
  HasManyCreateAssociationMixin
} from 'sequelize';
import { sequelize } from '../config/database';
import { Cliente } from './Cliente';
import { Carne } from './Carne';
import { ClientePlano } from './ClientePlano';

export class Plano extends Model<
  InferAttributes<Plano>,
  InferCreationAttributes<Plano>
> {
  declare id: CreationOptional<number>;
  declare nome_plano: string;
  declare descricao: string | null;
  declare tipo_servico: 'internet' | 'telefonia' | 'tv' | 'suporte' | 'infraestrutura' | 'consultoria' | 'outros';
  declare servicos_inclusos: string[] | null;
  declare quantidade_usuarios: number | null;
  declare valor_mensal: number;
  declare desconto_percentual: number | null;
  declare desconto_valor: number | null;
  declare desconto_ativo: boolean;
  declare periodicidade: 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'bimestral' | 'quinzenal' | 'semanal' | null;
  declare renovacao_automatica: boolean;
  declare data_inicio: Date | null;
  declare data_fim: Date | null;
  declare status: 'ativo' | 'inativo' | 'suspenso';
  declare observacoes: string | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  // Relacionamentos
  declare getClientes: HasManyGetAssociationsMixin<Cliente>;
  declare addCliente: HasManyAddAssociationMixin<Cliente, number>;
  declare addClientes: HasManyAddAssociationsMixin<Cliente, number>;
  declare setClientes: HasManySetAssociationsMixin<Cliente, number>;
  declare removeCliente: HasManyRemoveAssociationMixin<Cliente, number>;
  declare removeClientes: HasManyRemoveAssociationsMixin<Cliente, number>;
  declare hasCliente: HasManyHasAssociationMixin<Cliente, number>;
  declare hasClientes: HasManyHasAssociationsMixin<Cliente, number>;
  declare countClientes: HasManyCountAssociationsMixin;
  declare createCliente: HasManyCreateAssociationMixin<Cliente>;

  declare getCarnes: HasManyGetAssociationsMixin<Carne>;
  declare addCarne: HasManyAddAssociationMixin<Carne, number>;
  declare addCarnes: HasManyAddAssociationsMixin<Carne, number>;
  declare setCarnes: HasManySetAssociationsMixin<Carne, number>;
  declare removeCarne: HasManyRemoveAssociationMixin<Carne, number>;
  declare removeCarnes: HasManyRemoveAssociationsMixin<Carne, number>;
  declare hasCarne: HasManyHasAssociationMixin<Carne, number>;
  declare hasCarnes: HasManyHasAssociationsMixin<Carne, number>;
  declare countCarnes: HasManyCountAssociationsMixin;
  declare createCarne: HasManyCreateAssociationMixin<Carne>;

  declare getContratos: HasManyGetAssociationsMixin<ClientePlano>;
  declare addContrato: HasManyAddAssociationMixin<ClientePlano, number>;
  declare addContratos: HasManyAddAssociationsMixin<ClientePlano, number>;
  declare setContratos: HasManySetAssociationsMixin<ClientePlano, number>;
  declare removeContrato: HasManyRemoveAssociationMixin<ClientePlano, number>;
  declare removeContratos: HasManyRemoveAssociationsMixin<ClientePlano, number>;
  declare hasContrato: HasManyHasAssociationMixin<ClientePlano, number>;
  declare hasContratos: HasManyHasAssociationsMixin<ClientePlano, number>;
  declare countContratos: HasManyCountAssociationsMixin;
  declare createContrato: HasManyCreateAssociationMixin<ClientePlano>;

  // Métodos de instância
  static async findAtivos(): Promise<Plano[]> {
    return this.findAll({
      where: { status: 'ativo' },
      order: [['nome_plano', 'ASC']]
    });
  }

  static async findByTipoServico(tipoServico: string): Promise<Plano[]> {
    return this.findAll({
      where: { 
        tipo_servico: tipoServico,
        status: 'ativo' 
      },
      order: [['nome_plano', 'ASC']]
    });
  }

  async getValorComDesconto(): Promise<number> {
    if (!this.desconto_ativo) {
      return this.valor_mensal;
    }

    if (this.desconto_percentual && this.desconto_percentual > 0) {
      return this.valor_mensal * (1 - this.desconto_percentual / 100);
    }

    if (this.desconto_valor && this.desconto_valor > 0) {
      return Math.max(0, this.valor_mensal - this.desconto_valor);
    }

    return this.valor_mensal;
  }

  async getTotalClientes(): Promise<number> {
    return this.countClientes();
  }

  async getClientesAtivos(): Promise<Cliente[]> {
    return this.getClientes({
      where: { ativo: true }
    });
  }

  async getCarnesAtivos(): Promise<Carne[]> {
    return this.getCarnes({
      where: { status: 'ativo' }
    });
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

Plano.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nome_plano: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 255]
      }
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    tipo_servico: {
      type: DataTypes.ENUM('internet', 'telefonia', 'tv', 'suporte', 'infraestrutura', 'consultoria', 'outros'),
      allowNull: false,
      defaultValue: 'internet'
    },
    servicos_inclusos: {
      type: DataTypes.JSON,
      allowNull: true
    },
    quantidade_usuarios: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0
      }
    },
    valor_mensal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
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
    desconto_ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    periodicidade: {
      type: DataTypes.ENUM('mensal', 'trimestral', 'semestral', 'anual', 'bimestral', 'quinzenal', 'semanal'),
      allowNull: true,
      defaultValue: 'mensal'
    },
    renovacao_automatica: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
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
    modelName: 'Plano',
    tableName: 'planos',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['status']
      },
      {
        fields: ['tipo_servico']
      },
      {
        fields: ['nome_plano']
      },
      {
        fields: ['data_inicio']
      },
      {
        fields: ['data_fim']
      }
    ]
  }
);
