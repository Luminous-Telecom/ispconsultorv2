import { Op } from 'sequelize';
import { Carne } from '../../models/Carne';
import { Cliente } from '../../models/Cliente';
import { Plano } from '../../models/Plano';
import { Banco } from '../../models/Banco';
import { CarneAutoService } from '../CarneAutoService';

export interface GeracaoTitulosConfig {
  clientes_ids?: number[]; // IDs específicos de clientes (opcional)
  planos_ids?: number[]; // IDs específicos de planos (opcional)
  bancos_ids?: number[]; // IDs específicos de bancos (opcional)
  incluir_inativos?: boolean; // Se deve incluir clientes inativos
  quantidade_parcelas?: number; // Número de parcelas (padrão: 12)
  valor_mensal?: number; // Valor mensal (se não usar do plano)
  data_vencimento_primeira?: string; // Data da primeira parcela (YYYY-MM-DD)
  observacoes?: string; // Observações para o carnê
  auto_gerar_proximo?: boolean; // Se deve gerar próximo carnê automaticamente
}

export class GeracaoTitulosRoutine {
  /**
   * Executa a rotina de geração de títulos
   */
  public async execute(config: GeracaoTitulosConfig): Promise<any> {
    console.log('Iniciando rotina de geração de títulos...');
    
    const resultado = {
      total_clientes_processados: 0,
      carnês_gerados: 0,
      carnês_erro: 0,
      detalhes: [] as any[]
    };

    try {
      // Buscar clientes baseado na configuração
      const clientes = await this.buscarClientes(config);
      resultado.total_clientes_processados = clientes.length;

      console.log(`Processando ${clientes.length} clientes...`);

      for (const cliente of clientes) {
        try {
          const carneGerado = await this.gerarCarneParaCliente(cliente, config);
          
          if (carneGerado) {
            resultado.carnês_gerados++;
            resultado.detalhes.push({
              cliente_id: cliente.id,
              cliente_nome: cliente.razao_social,
              carne_id: carneGerado.id,
              numero_carne: carneGerado.numero_carne,
              status: 'sucesso'
            });
          }
        } catch (error: any) {
          resultado.carnês_erro++;
          resultado.detalhes.push({
            cliente_id: cliente.id,
            cliente_nome: cliente.razao_social,
            status: 'erro',
            erro: error.message
          });
          console.error(`Erro ao gerar carnê para cliente ${cliente.id}:`, error);
        }
      }

      console.log(`Rotina concluída: ${resultado.carnês_gerados} carnês gerados, ${resultado.carnês_erro} erros`);
      return resultado;

    } catch (error: any) {
      console.error('Erro na rotina de geração de títulos:', error);
      throw error;
    }
  }

  /**
   * Busca clientes baseado na configuração
   */
  private async buscarClientes(config: GeracaoTitulosConfig): Promise<Cliente[]> {
    const whereClause: any = {};

    // Filtrar por IDs específicos de clientes
    if (config.clientes_ids && config.clientes_ids.length > 0) {
      whereClause.id = { [Op.in]: config.clientes_ids };
    }

    // Filtrar por status (ativo/inativo)
    if (!config.incluir_inativos) {
      whereClause.ativo = true;
    }

    // Buscar clientes com seus planos
    const clientes = await Cliente.findAll({
      where: whereClause,
      include: [
        {
          model: Plano,
          as: 'planos',
          where: config.planos_ids && config.planos_ids.length > 0 
            ? { id: { [Op.in]: config.planos_ids } }
            : undefined,
          required: true
        }
      ]
    });

    return clientes;
  }

  /**
   * Gera carnê para um cliente específico
   */
  private async gerarCarneParaCliente(cliente: Cliente, config: GeracaoTitulosConfig): Promise<Carne | null> {
    // Buscar o plano ativo do cliente
    const planoAtivo = await this.buscarPlanoAtivo(cliente.id);
    if (!planoAtivo) {
      throw new Error('Cliente não possui plano ativo');
    }

    // Buscar banco padrão ou específico
    const banco = await this.buscarBanco(config.bancos_ids);
    if (!banco) {
      throw new Error('Nenhum banco disponível para geração de carnês');
    }

    // Verificar se já existe carnê ativo para este cliente/plano
    const carneExistente = await Carne.findOne({
      where: {
        cliente_id: cliente.id,
        plano_id: planoAtivo.id,
        status: { [Op.in]: ['pendente', 'ativo'] }
      }
    });

    if (carneExistente) {
      console.log(`Cliente ${cliente.id} já possui carnê ativo (ID: ${carneExistente.id})`);
      return null;
    }

    // Gerar número do carnê
    const numeroCarne = await this.gerarNumeroCarne();

    // Calcular data de vencimento da primeira parcela
    const dataVencimentoPrimeira = config.data_vencimento_primeira 
      ? new Date(config.data_vencimento_primeira)
      : this.calcularDataVencimentoPrimeira();

    // Criar o carnê
    const carne = await Carne.create({
      numero_carne: numeroCarne,
      cliente_id: cliente.id,
      plano_id: planoAtivo.id,
      banco_id: banco.id,
      valor_total: config.valor_mensal || planoAtivo.valor_mensal,
      quantidade_parcelas: config.quantidade_parcelas || 12,
      data_vencimento_primeira: dataVencimentoPrimeira,
      observacoes: config.observacoes || `Carnê gerado automaticamente em ${new Date().toLocaleDateString('pt-BR')}`,
      status: 'pendente'
    });

    // Gerar parcelas do carnê
    await this.gerarParcelas(carne);

    console.log(`Carnê gerado para cliente ${cliente.id}: ${numeroCarne}`);
    return carne;
  }

  /**
   * Busca o plano ativo do cliente
   */
  private async buscarPlanoAtivo(clienteId: number): Promise<Plano | null> {
    // Implementar lógica para buscar plano ativo do cliente
    // Por enquanto, vamos buscar o primeiro plano disponível
    const planos = await Plano.findAll({
      where: { status: 'ativo' },
      limit: 1
    });

    return planos.length > 0 ? planos[0] : null;
  }

  /**
   * Busca banco para geração de carnês
   */
  private async buscarBanco(bancosIds?: number[]): Promise<Banco | null> {
    const whereClause: any = { ativo: true };

    if (bancosIds && bancosIds.length > 0) {
      whereClause.id = { [Op.in]: bancosIds };
    }

    const bancos = await Banco.findAll({
      where: whereClause,
      limit: 1
    });

    return bancos.length > 0 ? bancos[0] : null;
  }

  /**
   * Gera número único para o carnê
   */
  private async gerarNumeroCarne(): Promise<string> {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `CARNE-${timestamp}-${random}`;
  }

  /**
   * Calcula data de vencimento da primeira parcela
   */
  private calcularDataVencimentoPrimeira(): Date {
    const hoje = new Date();
    const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
    return proximoMes;
  }

  /**
   * Gera parcelas do carnê
   */
  private async gerarParcelas(carne: Carne): Promise<void> {
    const parcelas = [];
    const valorParcela = carne.valor_total / carne.quantidade_parcelas;
    
    for (let i = 1; i <= carne.quantidade_parcelas; i++) {
      const dataVencimento = new Date(carne.data_vencimento_primeira);
      dataVencimento.setMonth(dataVencimento.getMonth() + (i - 1));

      parcelas.push({
        carne_id: carne.id,
        numero_parcela: i,
        valor_parcela: valorParcela,
        data_vencimento: dataVencimento,
        status: 'pendente' as const,
        pago: false
      });
    }

    // Inserir parcelas em lote
    const { CarneParcela } = await import('../../models');
    await CarneParcela.bulkCreate(parcelas);
  }
}
