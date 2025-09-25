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
  HasManyCreateAssociationMixin,
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  BelongsToCreateAssociationMixin
} from 'sequelize';
import { sequelize } from '../config/database';
import { Carne } from './Carne';
import { Plano } from './Plano';
import { Banco } from './Banco';
import { ClientePlano } from './ClientePlano';

export class Cliente extends Model<
  InferAttributes<Cliente>,
  InferCreationAttributes<Cliente>
> {
  declare id: CreationOptional<number>;
  declare cnpj: string;
  declare razao_social: string;
  declare nome_fantasia: string | null;
  declare email: string;
  declare telefone: string | null;
  declare whatsapp: string | null;
  declare cep: string | null;
  declare endereco: string | null;
  declare numero: string | null;
  declare complemento: string | null;
  declare bairro: string | null;
  declare cidade: string | null;
  declare estado: string | null;
  declare observacoes: string | null;
  declare ativo: boolean;
  declare tipo_cobranca: string | null;
  declare valor_primeiro_titulo: string | null;
  declare isento_mensalidade: boolean;
  declare recebe_email: boolean;
  declare recebe_sms: boolean;
  declare recebe_whatsapp: boolean;
  declare dia_vencimento: number | null;
  declare conta_boleto: number | null;
  declare data_validade_desconto: Date | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  // Relacionamentos
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

  declare getPlanos: HasManyGetAssociationsMixin<Plano>;
  declare addPlano: HasManyAddAssociationMixin<Plano, number>;
  declare addPlanos: HasManyAddAssociationsMixin<Plano, number>;
  declare setPlanos: HasManySetAssociationsMixin<Plano, number>;
  declare removePlano: HasManyRemoveAssociationMixin<Plano, number>;
  declare removePlanos: HasManyRemoveAssociationsMixin<Plano, number>;
  declare hasPlano: HasManyHasAssociationMixin<Plano, number>;
  declare hasPlanos: HasManyHasAssociationsMixin<Plano, number>;
  declare countPlanos: HasManyCountAssociationsMixin;
  declare createPlano: HasManyCreateAssociationMixin<Plano>;

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

  declare getBancoBoleto: BelongsToGetAssociationMixin<Banco>;
  declare setBancoBoleto: BelongsToSetAssociationMixin<Banco, number>;
  declare createBancoBoleto: BelongsToCreateAssociationMixin<Banco>;

  // Métodos de instância
  static async findAtivos(): Promise<Cliente[]> {
    return this.findAll({
      where: { ativo: true },
      order: [['razao_social', 'ASC']]
    });
  }

  static async findByCnpj(cnpj: string): Promise<Cliente | null> {
    return this.findOne({
      where: { cnpj },
      include: [
        { association: 'carnes', include: ['parcelas'] },
        { association: 'planos' },
        { association: 'contratos' },
        { association: 'bancoBoleto' }
      ]
    });
  }

  async getTotalCarnes(): Promise<number> {
    return this.countCarnes();
  }

  async getCarnesAtivos(): Promise<Carne[]> {
    return this.getCarnes({
      where: { status: 'ativo' }
    });
  }

  async getCarnesPagados(): Promise<Carne[]> {
    return this.getCarnes({
      where: { status: 'pago' }
    });
  }

  async getCarnesPendentes(): Promise<Carne[]> {
    return this.getCarnes({
      where: { status: 'pendente' }
    });
  }
}

Cliente.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    cnpj: {
      type: DataTypes.STRING(18),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [14, 18]
      }
    },
    razao_social: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 255]
      }
    },
    nome_fantasia: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true,
        notEmpty: true
      }
    },
    telefone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    whatsapp: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    cep: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    endereco: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    numero: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    complemento: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    bairro: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    cidade: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    estado: {
      type: DataTypes.STRING(2),
      allowNull: true,
      validate: {
        len: [2, 2]
      }
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    tipo_cobranca: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    valor_primeiro_titulo: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Valor do primeiro título: total, proporcional ou valor numérico'
    },
    isento_mensalidade: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    recebe_email: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    recebe_sms: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    recebe_whatsapp: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    dia_vencimento: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 31
      }
    },
    conta_boleto: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'bancos',
        key: 'id'
      }
    },
    data_validade_desconto: {
      type: DataTypes.DATE,
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
    modelName: 'Cliente',
    tableName: 'clientes',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['cnpj']
      },
      {
        fields: ['ativo']
      },
      {
        fields: ['cidade']
      },
      {
        fields: ['estado']
      },
      {
        fields: ['razao_social']
      }
    ]
  }
);
