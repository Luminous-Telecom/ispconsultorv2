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
import { sequelize } from '../../config/database';
import { Cliente } from '../Cliente';
import { Contrato } from '../Contrato';
import { Titulo } from '../Titulo';
import { formatCreatedAt } from '../../utils/dateUtils';

export class Plano extends Model<
  InferAttributes<Plano>,
  InferCreationAttributes<Plano>
> {
  declare id: CreationOptional<number>;
  declare nome_plano: string;
  declare descricao: string | null;
  declare tipo_servico: 'infraestrutura' | 'consultoria';
  declare servicos_inclusos: string[] | null;
  declare quantidade_usuarios: number | null;
  declare valor_mensal: number;
  declare periodicidade: 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'bimestral' | 'quinzenal' | 'semanal' | null;
  declare renovacao_automatica: boolean;
  declare data_inicio: Date | null;
  declare data_fim: Date | null;
  declare status: 'ativo' | 'inativo';
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

  declare getTitulos: HasManyGetAssociationsMixin<Titulo>;
  declare addTitulo: HasManyAddAssociationMixin<Titulo, number>;
  declare addTitulos: HasManyAddAssociationsMixin<Titulo, number>;
  declare setTitulos: HasManySetAssociationsMixin<Titulo, number>;
  declare removeTitulo: HasManyRemoveAssociationMixin<Titulo, number>;
  declare removeTitulos: HasManyRemoveAssociationsMixin<Titulo, number>;
  declare hasTitulo: HasManyHasAssociationMixin<Titulo, number>;
  declare hasTitulos: HasManyHasAssociationsMixin<Titulo, number>;
  declare countTitulos: HasManyCountAssociationsMixin;
  declare createTitulo: HasManyCreateAssociationMixin<Titulo>;


  declare getContratos: HasManyGetAssociationsMixin<Contrato>;
  declare addContrato: HasManyAddAssociationMixin<Contrato, number>;
  declare addContratos: HasManyAddAssociationsMixin<Contrato, number>;
  declare setContratos: HasManySetAssociationsMixin<Contrato, number>;
  declare removeContrato: HasManyRemoveAssociationMixin<Contrato, number>;
  declare removeContratos: HasManyRemoveAssociationsMixin<Contrato, number>;
  declare hasContrato: HasManyHasAssociationMixin<Contrato, number>;
  declare hasContratos: HasManyHasAssociationsMixin<Contrato, number>;
  declare countContratos: HasManyCountAssociationsMixin;
  declare createContrato: HasManyCreateAssociationMixin<Contrato>;

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

  async getTotalClientes(): Promise<number> {
    return this.countClientes();
  }

  async getClientesAtivos(): Promise<Cliente[]> {
    return this.getClientes({
      where: { ativo: true }
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
      type: DataTypes.ENUM('infraestrutura', 'consultoria'),
      allowNull: false,
      defaultValue: 'consultoria'
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
      type: DataTypes.ENUM('ativo', 'inativo'),
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
