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
import { Banco } from './Banco';

type ConfiguracaoValor = string | number | boolean | null;

export class BancoConfiguracao extends Model<
  InferAttributes<BancoConfiguracao>,
  InferCreationAttributes<BancoConfiguracao>
> {
  declare id: CreationOptional<number>;
  declare banco_id: number;
  declare tipo_banco: string;
  declare configuracao: Record<string, ConfiguracaoValor>;
  declare ativo: boolean;
  declare observacoes: string | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  // Relacionamentos
  declare getBanco: BelongsToGetAssociationMixin<Banco>;
  declare setBanco: BelongsToSetAssociationMixin<Banco, number>;
  declare createBanco: BelongsToCreateAssociationMixin<Banco>;

  // Métodos de instância
  static async findAtivas(): Promise<BancoConfiguracao[]> {
    return this.findAll({
      where: { ativo: true },
      include: [{ association: 'banco' }],
      order: [['created_at', 'ASC']]
    });
  }

  static async findByTipo(tipoBanco: string): Promise<BancoConfiguracao[]> {
    return this.findAll({
      where: { 
        tipo_banco: tipoBanco,
        ativo: true 
      },
      include: [{ association: 'banco' }],
      order: [['created_at', 'ASC']]
    });
  }

  async getConfiguracaoPorChave(chave: string): Promise<ConfiguracaoValor> {
    return this.configuracao[chave];
  }

  async setConfiguracaoPorChave(chave: string, valor: ConfiguracaoValor): Promise<void> {
    const config = { ...this.configuracao };
    config[chave] = valor;
    await this.update({ configuracao: config });
  }

  async removeConfiguracaoPorChave(chave: string): Promise<void> {
    const config = { ...this.configuracao };
    delete config[chave];
    await this.update({ configuracao: config });
  }

  async validarConfiguracao(): Promise<{ valida: boolean; erros: string[] }> {
    const erros: string[] = [];
    
    switch (this.tipo_banco) {
      case 'efi':
        if (!this.configuracao.client_id) {
          erros.push('Client ID é obrigatório para Efi');
        }
        if (!this.configuracao.client_secret) {
          erros.push('Client Secret é obrigatório para Efi');
        }
        if (this.configuracao.sandbox === undefined) {
          erros.push('Configuração de sandbox é obrigatória para Efi');
        }
        break;
        
      case 'asaas':
        if (!this.configuracao.access_token) {
          erros.push('Access Token é obrigatório para Asaas');
        }
        if (!this.configuracao.webhook_token) {
          erros.push('Webhook Token é obrigatório para Asaas');
        }
        if (this.configuracao.sandbox === undefined) {
          erros.push('Configuração de sandbox é obrigatória para Asaas');
        }
        break;
        
      default:
        erros.push(`Tipo de banco ${this.tipo_banco} não suportado`);
    }
    
    return {
      valida: erros.length === 0,
      erros
    };
  }
}

BancoConfiguracao.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    banco_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'bancos',
        key: 'id'
      }
    },
    tipo_banco: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    configuracao: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {}
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
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
    modelName: 'BancoConfiguracao',
    tableName: 'banco_configuracoes',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['banco_id']
      },
      {
        fields: ['tipo_banco']
      },
      {
        fields: ['ativo']
      },
      {
        fields: ['banco_id', 'tipo_banco']
      }
    ]
  }
);
