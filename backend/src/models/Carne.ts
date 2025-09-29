import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  BelongsToCreateAssociationMixin,
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
import { Plano } from './Plano';
import { Banco } from './Banco';
import { CarneParcela } from './CarneParcela';

export class Carne extends Model<
  InferAttributes<Carne>,
  InferCreationAttributes<Carne>
> {
  declare id: CreationOptional<number>;
  declare cliente_id: number;
  declare plano_id: number;
  declare banco_id: number;
  declare numero_carne: string;
  declare carnet_id: string | null;
  declare valor_total: number;
  declare quantidade_parcelas: number;
  declare data_vencimento_primeira: Date;
  declare status: 'ativo' | 'pago' | 'cancelado' | 'parcial' | 'pendente' | 'registrado';
  declare observacoes: string | null;
  declare codigo_barras: string | null;
  declare linha_digitavel: string | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  // Relacionamentos
  declare getCliente: BelongsToGetAssociationMixin<Cliente>;
  declare setCliente: BelongsToSetAssociationMixin<Cliente, number>;
  declare createCliente: BelongsToCreateAssociationMixin<Cliente>;

  declare getPlano: BelongsToGetAssociationMixin<Plano>;
  declare setPlano: BelongsToSetAssociationMixin<Plano, number>;
  declare createPlano: BelongsToCreateAssociationMixin<Plano>;

  declare getBanco: BelongsToGetAssociationMixin<Banco>;
  declare setBanco: BelongsToSetAssociationMixin<Banco, number>;
  declare createBanco: BelongsToCreateAssociationMixin<Banco>;

  declare getParcelas: HasManyGetAssociationsMixin<CarneParcela>;
  declare addParcela: HasManyAddAssociationMixin<CarneParcela, number>;
  declare addParcelas: HasManyAddAssociationsMixin<CarneParcela, number>;
  declare setParcelas: HasManySetAssociationsMixin<CarneParcela, number>;
  declare removeParcela: HasManyRemoveAssociationMixin<CarneParcela, number>;
  declare removeParcelas: HasManyRemoveAssociationsMixin<CarneParcela, number>;
  declare hasParcela: HasManyHasAssociationMixin<CarneParcela, number>;
  declare hasParcelas: HasManyHasAssociationsMixin<CarneParcela, number>;
  declare countParcelas: HasManyCountAssociationsMixin;
  declare createParcela: HasManyCreateAssociationMixin<CarneParcela>;

  // Métodos de instância
  static async findAtivos(): Promise<Carne[]> {
    return this.findAll({
      where: { status: 'ativo' },
      include: [
        { association: 'cliente' },
        { association: 'plano' },
        { association: 'banco' },
        { association: 'parcelas' }
      ],
      order: [['created_at', 'DESC']]
    });
  }

  static async findByStatus(status: string): Promise<Carne[]> {
    return this.findAll({
      where: { status },
      include: [
        { association: 'cliente' },
        { association: 'plano' },
        { association: 'banco' },
        { association: 'parcelas' }
      ],
      order: [['created_at', 'DESC']]
    });
  }

  async getValorParcela(): Promise<number> {
    const parcelas = await this.getParcelas();
    if (parcelas.length > 0) {
      return parseFloat(parcelas[0].valor_parcela.toString());
    }
    
    const quantidadeParcelas = Math.max(1, this.quantidade_parcelas);
    return parseFloat(this.valor_total.toString()) / quantidadeParcelas;
  }

  async getParcelasPagasCount(): Promise<number> {
    return this.countParcelas({
      where: { pago: true }
    });
  }

  async getValorTotalCarne(): Promise<number> {
    const parcelas = await this.getParcelas();
    return parcelas.reduce((total, parcela) => {
      return total + parseFloat(parcela.valor_parcela.toString());
    }, 0);
  }

  async verificarEAtualizarStatus(): Promise<void> {
    try {
      const parcelas = await this.getParcelas();
      const totalParcelas = parcelas.length;
      const parcelasPagas = parcelas.filter(p => p.pago).length;
      const parcelasCanceladas = parcelas.filter(p => p.status === 'cancelado').length;
      const parcelasVencidas = parcelas.filter(p => p.status === 'vencido').length;
      
      let novoStatus: string;
      
      // Carnê é considerado pago APENAS se todas as parcelas estão pagas
      if (parcelasPagas === totalParcelas && totalParcelas > 0) {
        novoStatus = 'pago';
      } else if (parcelasCanceladas === totalParcelas && totalParcelas > 0) {
        // Carnê é cancelado APENAS se todas as parcelas estão canceladas
        novoStatus = 'cancelado';
      } else if (parcelasPagas > 0 || parcelasCanceladas > 0 || parcelasVencidas > 0) {
        // Se há parcelas pagas, canceladas ou vencidas = carnê parcial
        novoStatus = 'parcial';
      } else {
        // Todas as parcelas estão pendentes
        novoStatus = 'pendente';
      }
      
      if (this.status !== novoStatus) {
        const statusAnterior = this.status;
        await this.update({ status: novoStatus as any });
        
        console.log('Status do carnê atualizado', {
          carne_id: this.id,
          status: `${statusAnterior} -> ${novoStatus}`,
          parcelas_pagas: parcelasPagas,
          parcelas_canceladas: parcelasCanceladas,
          parcelas_vencidas: parcelasVencidas,
          total_parcelas: totalParcelas
        });
      }
    } catch (error) {
      console.error('Erro ao verificar status do carnê', {
        carne_id: this.id,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  async gerarParcelas(valorParcela?: number, data?: any): Promise<CarneParcela[]> {
    const parcelas: CarneParcela[] = [];
    const valor = valorParcela || await this.getValorParcela();
    
    // Verificar se auto parcelas está habilitado
    const { ParametroService } = await import('../services/ParametroService');
    const autoParcelasEnabled = await ParametroService.isAutoParcelasEnabled();
    
    // Se auto parcelas está habilitado e não foi especificado número de parcelas, usar o padrão
    let numeroParcelas = this.quantidade_parcelas;
    if (autoParcelasEnabled && (!this.quantidade_parcelas || this.quantidade_parcelas <= 0)) {
      numeroParcelas = await ParametroService.getNumeroParcelasPadrao();
      // Atualizar o carnê com o número de parcelas padrão
      await this.update({ quantidade_parcelas: numeroParcelas });
    }
    
    for (let i = 1; i <= numeroParcelas; i++) {
      const dataVencimento = new Date(this.data_vencimento_primeira);
      dataVencimento.setMonth(dataVencimento.getMonth() + (i - 1));
      
      // Garantir que não há problemas de fuso horário
      const dataVencimentoString = dataVencimento.getFullYear() + '-' + 
        String(dataVencimento.getMonth() + 1).padStart(2, '0') + '-' + 
        String(dataVencimento.getDate()).padStart(2, '0');
      
      const parcela = await this.createParcela({
        carne_id: this.id,
        plano_id: this.plano_id,
        numero_parcela: i,
        valor_parcela: valor,
        data_vencimento: dataVencimento,
        pago: false,
        status: 'pendente'
      });

      // Gerar nosso número automaticamente
      await parcela.gerarNossoNumero();
      
      // Gerar código de barras e linha digitável automaticamente
      await parcela.update({
        codigo_barras: await parcela.gerarCodigoBarras(),
        linha_digitavel: await parcela.gerarLinhaDigitavel()
      });
      
      parcelas.push(parcela);
    }
    
    return parcelas;
  }

  /**
   * Gerar código de barras para parcela
   */
  private gerarCodigoBarras(parcela: number): string {
    // Implementar geração de código de barras específico do banco
    return '237' + this.id.toString().padStart(8, '0') + parcela.toString().padStart(2, '0') + '00000000000';
  }

  /**
   * Gerar linha digitável para parcela
   */
  private gerarLinhaDigitavel(codigoBarras: string): string {
    // Implementar geração de linha digitável específica do banco
    return codigoBarras.substring(0, 5) + '.' + 
           codigoBarras.substring(5, 10) + ' ' + 
           codigoBarras.substring(10, 15) + '.' + 
           codigoBarras.substring(15, 21) + ' ' + 
           codigoBarras.substring(21, 26) + '.' + 
           codigoBarras.substring(26, 32) + ' ' + 
           codigoBarras.substring(32, 33) + ' ' + 
           codigoBarras.substring(33);
  }

  async getResumo(): Promise<{
    total_parcelas: number;
    parcelas_pagas: number;
    parcelas_pendentes: number;
    parcelas_vencidas: number;
    parcelas_canceladas: number;
    parcelas_finalizadas: number;
    valor_total: number;
    valor_pago: number;
    valor_pendente: number;
    percentual_pago: number;
  }> {
    const parcelas = await this.getParcelas();
    const totalParcelas = parcelas.length;
    const parcelasPagas = parcelas.filter(p => p.pago).length;
    const parcelasPendentes = parcelas.filter(p => p.status === 'pendente').length;
    const parcelasVencidas = parcelas.filter(p => p.status === 'vencido').length;
    const parcelasCanceladas = parcelas.filter(p => p.status === 'cancelado').length;
    const parcelasFinalizadas = parcelasPagas + parcelasCanceladas;
    
    const valorTotal = parcelas.reduce((total, p) => total + parseFloat(p.valor_parcela.toString()), 0);
    const valorPago = parcelas.filter(p => p.pago).reduce((total, p) => total + parseFloat(p.valor_parcela.toString()), 0);
    const valorPendente = valorTotal - valorPago;
    const percentualPago = totalParcelas > 0 ? (parcelasFinalizadas / totalParcelas) * 100 : 0;
    
    return {
      total_parcelas: totalParcelas,
      parcelas_pagas: parcelasPagas,
      parcelas_pendentes: parcelasPendentes,
      parcelas_vencidas: parcelasVencidas,
      parcelas_canceladas: parcelasCanceladas,
      parcelas_finalizadas: parcelasFinalizadas,
      valor_total: valorTotal,
      valor_pago: valorPago,
      valor_pendente: valorPendente,
      percentual_pago: percentualPago
    };
  }
}

Carne.init(
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
    banco_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'bancos',
        key: 'id'
      }
    },
    numero_carne: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    carnet_id: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    valor_total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0.01
      }
    },
    quantidade_parcelas: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 60
      }
    },
    data_vencimento_primeira: {
      type: DataTypes.DATE,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('ativo', 'pago', 'cancelado', 'parcial', 'pendente', 'registrado'),
      allowNull: false,
      defaultValue: 'ativo'
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    codigo_barras: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    linha_digitavel: {
      type: DataTypes.STRING(255),
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
    modelName: 'Carne',
    tableName: 'carnes',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['numero_carne']
      },
      {
        fields: ['status']
      },
      {
        fields: ['cliente_id']
      },
      {
        fields: ['plano_id']
      },
      {
        fields: ['banco_id']
      },
      {
        fields: ['data_vencimento_primeira']
      }
    ]
  }
);
