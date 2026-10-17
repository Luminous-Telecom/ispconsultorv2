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
} from '../../../db/orm';
import { sequelize } from '../../../config/database';
import { Plano } from '../../cadastros/Plano';
import { Contrato } from '../../contratos/Contrato';
import { Titulo } from '../../financeiro/Titulo';
import { NotaFiscal } from '../../nfse/NotaFiscal';
import { formatCreatedAt } from '../../../utils/dateUtils';

export class Cliente extends Model<
  InferAttributes<Cliente>,
  InferCreationAttributes<Cliente>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number | null;
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
  declare tipo_cobranca: 'titulo' | 'carne' | null;
  declare valor_primeiro_titulo: string | null;
  declare recebe_email: boolean;
  declare recebe_sms: boolean;
  declare recebe_whatsapp: boolean;
  declare central_assinante_senha: string | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  // Relacionamentos

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

  declare getNotasFiscais: HasManyGetAssociationsMixin<NotaFiscal>;
  declare addNotaFiscal: HasManyAddAssociationMixin<NotaFiscal, number>;
  declare addNotasFiscais: HasManyAddAssociationsMixin<NotaFiscal, number>;
  declare setNotasFiscais: HasManySetAssociationsMixin<NotaFiscal, number>;
  declare removeNotaFiscal: HasManyRemoveAssociationMixin<NotaFiscal, number>;
  declare removeNotasFiscais: HasManyRemoveAssociationsMixin<NotaFiscal, number>;
  declare hasNotaFiscal: HasManyHasAssociationMixin<NotaFiscal, number>;
  declare hasNotasFiscais: HasManyHasAssociationsMixin<NotaFiscal, number>;
  declare countNotasFiscais: HasManyCountAssociationsMixin;
  declare createNotaFiscal: HasManyCreateAssociationMixin<NotaFiscal>;


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
        { association: 'titulos' },
        { association: 'planos' },
        { association: 'contratos' }
      ]
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
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [8, 10]
      }
    },
    endereco: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [3, 255]
      }
    },
    numero: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    complemento: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    bairro: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100]
      }
    },
    cidade: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100]
      }
    },
    estado: {
      type: DataTypes.STRING(2),
      allowNull: false,
      validate: {
        notEmpty: true,
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
      type: DataTypes.ENUM('titulo', 'carne'),
      allowNull: false,
      defaultValue: 'titulo'
    },
    valor_primeiro_titulo: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'total',
      comment: 'Valor do primeiro título: total, proporcional ou valor numérico'
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
    central_assinante_senha: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Senha hash para acesso à central do assinante'
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
