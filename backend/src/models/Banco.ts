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
  HasOneGetAssociationMixin,
  HasOneSetAssociationMixin,
  HasOneCreateAssociationMixin
} from 'sequelize';
import { sequelize } from '../config/database';
import { Cliente } from './Cliente';
import { BancoConfiguracao } from './BancoConfiguracao';
import { Titulo } from './Titulo';

interface DadosTesteConexao {
  sandbox: boolean;
  url: string;
}

type ConfiguracaoValor = string | number | boolean | null;

export class Banco extends Model<
  InferAttributes<Banco>,
  InferCreationAttributes<Banco>
> {
  declare id: CreationOptional<number>;
  declare nome: string;
  declare codigo: string | null;
  declare descricao: string | null;
  declare ativo: boolean;
  declare tipo_banco: 'efi' | 'asaas' | 'bancario' | 'outros';
  declare api_url: string | null;
  declare api_key: string | null;
  declare api_secret: string | null;
  declare sandbox: boolean;
  declare identificador_conta: string | null;
  declare client_id_producao: string | null;
  declare client_secret_producao: string | null;
  declare url_retorno: string | null;
  declare repassar_email_cliente: boolean;
  declare percentual_multa: number | null;
  declare percentual_juros: number | null;
  declare desconto_tipo: string | null;
  declare desconto_valor: number | null;
  declare contra_apresentacao: boolean;
  declare recalcular_segunda_via: boolean;
  declare maximo_dias_recalcular: number | null;
  declare layout_web: string | null;
  declare layout_pdf: string | null;
  declare local_pagamento: string | null;
  declare dados_avalista: string | null;
  declare exibir_mes_referente: boolean;
  declare taxa_cobranca: number | null;
  declare incluir_taxa: boolean;
  declare observacao_linha_1: string | null;
  declare observacao_linha_2: string | null;
  declare observacao_linha_3: string | null;
  declare observacao_linha_4: string | null;
  declare instrucao_linha_1: string | null;
  declare instrucao_linha_2: string | null;
  declare instrucao_linha_3: string | null;
  declare instrucao_linha_4: string | null;
  declare instrucao_linha_5: string | null;
  declare configuracoes: Record<string, ConfiguracaoValor> | null;
  declare logo: string | null;
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


  declare getConfiguracoes: HasManyGetAssociationsMixin<BancoConfiguracao>;
  declare addConfiguracao: HasManyAddAssociationMixin<BancoConfiguracao, number>;
  declare addConfiguracoes: HasManyAddAssociationsMixin<BancoConfiguracao, number>;
  declare setConfiguracoes: HasManySetAssociationsMixin<BancoConfiguracao, number>;
  declare removeConfiguracao: HasManyRemoveAssociationMixin<BancoConfiguracao, number>;
  declare removeConfiguracoes: HasManyRemoveAssociationsMixin<BancoConfiguracao, number>;
  declare hasConfiguracao: HasManyHasAssociationMixin<BancoConfiguracao, number>;
  declare hasConfiguracoes: HasManyHasAssociationsMixin<BancoConfiguracao, number>;
  declare countConfiguracoes: HasManyCountAssociationsMixin;
  declare createConfiguracao: HasManyCreateAssociationMixin<BancoConfiguracao>;

  declare getConfiguracaoPrincipal: HasOneGetAssociationMixin<BancoConfiguracao>;
  declare setConfiguracaoPrincipal: HasOneSetAssociationMixin<BancoConfiguracao, number>;
  declare createConfiguracaoPrincipal: HasOneCreateAssociationMixin<BancoConfiguracao>;

  // Métodos de instância
  static async findAtivos(): Promise<Banco[]> {
    return this.findAll({
      where: { ativo: true },
      order: [['nome', 'ASC']]
    });
  }

  static async findByTipo(tipoBanco: string): Promise<Banco[]> {
    return this.findAll({
      where: { 
        tipo_banco: tipoBanco,
        ativo: true 
      },
      order: [['nome', 'ASC']]
    });
  }

  async getUrlPadrao(): Promise<string> {
    const urlsPadrao = {
      efi: 'https://api-pix-h.efipay.com.br',
      asaas: 'https://www.asaas.com/api/v3',
      bancario: '',
      outros: ''
    };
    
    return this.api_url || urlsPadrao[this.tipo_banco] || '';
  }

  async testarConexao(): Promise<{ sucesso: boolean; mensagem: string; dados?: DadosTesteConexao }> {
    try {
      // Implementar teste de conexão baseado no tipo de banco
      switch (this.tipo_banco) {
        case 'efi':
          return await this.testarConexaoEfi();
        case 'asaas':
          return await this.testarConexaoAsaas();
        default:
          return {
            sucesso: false,
            mensagem: 'Tipo de banco não suportado para teste de conexão'
          };
      }
    } catch (error) {
      return {
        sucesso: false,
        mensagem: `Erro ao testar conexão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }

  private async testarConexaoEfi(): Promise<{ sucesso: boolean; mensagem: string; dados?: DadosTesteConexao }> {
    // Implementar teste específico para Efi
    // Por enquanto, retorna sucesso se tem client_id e client_secret
    if (!this.client_id_producao || !this.client_secret_producao) {
      return {
        sucesso: false,
        mensagem: 'Client ID e Client Secret são obrigatórios para Efi'
      };
    }

    return {
      sucesso: true,
      mensagem: 'Conexão com Efi configurada com sucesso',
      dados: {
        sandbox: this.sandbox,
        url: await this.getUrlPadrao()
      }
    };
  }

  private async testarConexaoAsaas(): Promise<{ sucesso: boolean; mensagem: string; dados?: DadosTesteConexao }> {
    // Implementar teste específico para Asaas
    // Por enquanto, retorna sucesso se tem access_token
    if (!this.api_key) {
      return {
        sucesso: false,
        mensagem: 'Access Token é obrigatório para Asaas'
      };
    }

    return {
      sucesso: true,
      mensagem: 'Conexão com Asaas configurada com sucesso',
      dados: {
        sandbox: this.sandbox,
        url: await this.getUrlPadrao()
      }
    };
  }

  async aplicarConfiguracoesPadrao(): Promise<void> {
    // Aplicar configurações padrão baseadas no tipo de banco
    const configuracoesPadrao = {
      efi: {
        percentual_multa: 2.00,
        percentual_juros: 1.00,
        contra_apresentacao: false,
        recalcular_segunda_via: true,
        maximo_dias_recalcular: 30,
        exibir_mes_referente: true,
        incluir_taxa: true,
        taxa_cobranca: 3.50
      },
      asaas: {
        percentual_multa: 2.00,
        percentual_juros: 1.00,
        contra_apresentacao: false,
        recalcular_segunda_via: true,
        maximo_dias_recalcular: 30,
        exibir_mes_referente: true,
        incluir_taxa: true,
        taxa_cobranca: 3.50
      },
      bancario: {
        percentual_multa: 2.00,
        percentual_juros: 1.00,
        contra_apresentacao: true,
        recalcular_segunda_via: false,
        exibir_mes_referente: false,
        incluir_taxa: false
      },
      outros: {
        percentual_multa: 2.00,
        percentual_juros: 1.00,
        contra_apresentacao: false,
        recalcular_segunda_via: false,
        exibir_mes_referente: false,
        incluir_taxa: false
      }
    };

    const config = configuracoesPadrao[this.tipo_banco];
    if (config) {
      Object.assign(this, config);
    }
  }
}

Banco.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nome: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 255]
      }
    },
    codigo: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    tipo_banco: {
      type: DataTypes.ENUM('efi', 'asaas', 'bancario', 'outros'),
      allowNull: false,
      defaultValue: 'bancario'
    },
    api_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    api_key: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    api_secret: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    sandbox: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    identificador_conta: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    client_id_producao: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    client_secret_producao: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    url_retorno: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    repassar_email_cliente: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    percentual_multa: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 2.00
    },
    percentual_juros: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 1.00
    },
    desconto_tipo: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    desconto_valor: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    contra_apresentacao: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    recalcular_segunda_via: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    maximo_dias_recalcular: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 30
    },
    layout_web: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    layout_pdf: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    local_pagamento: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    dados_avalista: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    exibir_mes_referente: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    taxa_cobranca: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    incluir_taxa: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    observacao_linha_1: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    observacao_linha_2: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    observacao_linha_3: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    observacao_linha_4: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    instrucao_linha_1: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    instrucao_linha_2: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    instrucao_linha_3: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    instrucao_linha_4: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    instrucao_linha_5: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    configuracoes: {
      type: DataTypes.JSON,
      allowNull: true
    },
    logo: {
      type: DataTypes.STRING(500),
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
    modelName: 'Banco',
    tableName: 'bancos',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['ativo']
      },
      {
        fields: ['tipo_banco']
      },
      {
        fields: ['nome']
      }
    ],
    hooks: {
      beforeCreate: async (banco: Banco) => {
        await banco.aplicarConfiguracoesPadrao();
        
        // Preencher código do banco automaticamente baseado no tipo
        const { BancoApiService } = await import('../services/BancoApiService');
        const codigoBanco = BancoApiService.getCodigoBanco(banco.tipo_banco);
        if (codigoBanco) {
          banco.codigo = codigoBanco;
        }
      },
      beforeUpdate: async (banco: Banco) => {
        // Atualizar código se o tipo_banco mudou
        if (banco.changed('tipo_banco')) {
          const { BancoApiService } = await import('../services/BancoApiService');
          const codigoBanco = BancoApiService.getCodigoBanco(banco.tipo_banco);
          if (codigoBanco) {
            banco.codigo = codigoBanco;
          }
        }
      }
    }
  }
);
