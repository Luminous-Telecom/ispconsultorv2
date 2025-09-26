import { Carne } from '../models/Carne';
import { CarneParcela } from '../models/CarneParcela';
import { Cliente } from '../models/Cliente';
import { Plano } from '../models/Plano';
import { Banco } from '../models/Banco';
import { Op } from 'sequelize';

export class CarneAutoService {
  /**
   * Verifica se um carnê foi completamente pago e gera um novo automaticamente
   */
  static async verificarEGerarCarneAutomatico(carneId: number): Promise<Carne | null> {
    try {
      const carne = await Carne.findByPk(carneId, {
        include: [
          { association: 'cliente' },
          { association: 'plano' },
          { association: 'banco' },
          { association: 'parcelas' }
        ]
      });

      if (!carne) {
        console.log('Carnê não encontrado para verificação automática:', carneId);
        return null;
      }

      // Verificar se o carnê está completamente pago
      if (carne.status !== 'pago') {
        console.log('Carnê não está pago, não gerando novo:', {
          carne_id: carneId,
          status: carne.status
        });
        return null;
      }

      // Verificar se já existe um carnê ativo para o mesmo cliente e plano
      const carneExistente = await Carne.findOne({
        where: {
          cliente_id: carne.cliente_id,
          plano_id: carne.plano_id,
          banco_id: carne.banco_id,
          status: {
            [Op.in]: ['ativo', 'pendente', 'registrado']
          }
        }
      });

      if (carneExistente) {
        console.log('Já existe carnê ativo para cliente e plano:', {
          cliente_id: carne.cliente_id,
          plano_id: carne.plano_id,
          carne_existente_id: carneExistente.id
        });
        return null;
      }

      // Gerar novo carnê automaticamente
      const novoCarne = await this.gerarNovoCarne(carne);
      
      console.log('Novo carnê gerado automaticamente:', {
        carne_original_id: carneId,
        novo_carne_id: novoCarne.id,
        cliente_id: carne.cliente_id,
        plano_id: carne.plano_id
      });

      return novoCarne;
    } catch (error) {
      console.error('Erro ao verificar e gerar carnê automático:', {
        carne_id: carneId,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      return null;
    }
  }

  /**
   * Gera um novo carnê baseado no carnê anterior
   */
  private static async gerarNovoCarne(carneAnterior: Carne): Promise<Carne> {
    const cliente = await carneAnterior.getCliente();
    const plano = await carneAnterior.getPlano();
    const banco = await carneAnterior.getBanco();

    // Calcular próxima data de vencimento (1 mês após a última parcela)
    const parcelas = await carneAnterior.getParcelas();
    const ultimaParcela = parcelas.sort((a, b) => 
      new Date(b.data_vencimento).getTime() - new Date(a.data_vencimento).getTime()
    )[0];

    const proximaDataVencimento = new Date(ultimaParcela.data_vencimento);
    proximaDataVencimento.setMonth(proximaDataVencimento.getMonth() + 1);

    // Gerar número do carnê
    const numeroCarne = await this.gerarNumeroCarne(cliente.id, plano.id);

    // Criar novo carnê
    const novoCarne = await Carne.create({
      cliente_id: carneAnterior.cliente_id,
      plano_id: carneAnterior.plano_id,
      banco_id: carneAnterior.banco_id,
      numero_carne: numeroCarne,
      valor_total: carneAnterior.valor_total,
      quantidade_parcelas: carneAnterior.quantidade_parcelas,
      data_vencimento_primeira: proximaDataVencimento,
      status: 'ativo',
      observacoes: `Gerado automaticamente após carnê ${carneAnterior.numero_carne}`
    });

    // Gerar parcelas automaticamente
    await novoCarne.gerarParcelas();

    return novoCarne;
  }

  /**
   * Gera um número único para o carnê
   */
  private static async gerarNumeroCarne(clienteId: number, planoId: number): Promise<string> {
    const timestamp = Date.now().toString().slice(-6);
    const clienteStr = clienteId.toString().padStart(3, '0');
    const planoStr = planoId.toString().padStart(2, '0');
    
    let numeroCarne = `AUTO-${clienteStr}-${planoStr}-${timestamp}`;
    
    // Verificar se já existe e incrementar se necessário
    let contador = 1;
    while (await Carne.findOne({ where: { numero_carne: numeroCarne } })) {
      numeroCarne = `AUTO-${clienteStr}-${planoStr}-${timestamp}-${contador}`;
      contador++;
    }

    return numeroCarne;
  }

  /**
   * Verifica todos os carnês pagos e gera novos automaticamente
   */
  static async verificarTodosCarnesPagos(): Promise<Carne[]> {
    try {
      const carnesPagos = await Carne.findAll({
        where: { status: 'pago' },
        include: [
          { association: 'cliente' },
          { association: 'plano' },
          { association: 'banco' }
        ],
        order: [['updated_at', 'DESC']]
      });

      const novosCarnes: Carne[] = [];

      for (const carne of carnesPagos) {
        const novoCarne = await this.verificarEGerarCarneAutomatico(carne.id);
        if (novoCarne) {
          novosCarnes.push(novoCarne);
        }
      }

      console.log('Verificação automática concluída:', {
        carnes_verificados: carnesPagos.length,
        novos_carnes_gerados: novosCarnes.length
      });

      return novosCarnes;
    } catch (error) {
      console.error('Erro ao verificar todos os carnês pagos:', error);
      return [];
    }
  }

  /**
   * Configurações para geração automática
   */
  static async getConfiguracaoAuto(): Promise<{
    ativo: boolean;
    dias_antes_vencimento: number;
    gerar_apos_pagamento: boolean;
  }> {
    // Por enquanto, retorna configuração padrão
    // Futuramente pode ser salva no banco de dados
    return {
      ativo: true,
      dias_antes_vencimento: 7,
      gerar_apos_pagamento: true
    };
  }

  /**
   * Ativa/desativa geração automática
   */
  static async setConfiguracaoAuto(config: {
    ativo: boolean;
    dias_antes_vencimento: number;
    gerar_apos_pagamento: boolean;
  }): Promise<void> {
    // Por enquanto, apenas log
    // Futuramente salvar no banco de dados
    console.log('Configuração de geração automática atualizada:', config);
  }
}
