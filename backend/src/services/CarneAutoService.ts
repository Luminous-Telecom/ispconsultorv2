import { Carne } from '../models/Carne';
import { Cliente } from '../models/Cliente';
import { Plano } from '../models/Plano';
import { Banco } from '../models/Banco';
import { ParametroService } from './ParametroService';
import { logger } from '../utils/logger';

export class CarneAutoService {
  /**
   * Verificar se deve gerar automaticamente um novo carnê para o cliente
   */
  static async verificarEGerarCarneAutomatico(carneId: number): Promise<boolean> {
    try {
      // Verificar se geração automática está habilitada
      const geracaoAutomaticaEnabled = await ParametroService.isGeracaoAutomaticaCarneEnabled();
      const manterCarneClienteEnabled = await ParametroService.isManterCarneClienteEnabled();
      
      if (!geracaoAutomaticaEnabled || !manterCarneClienteEnabled) {
        return false;
      }

      const carne = await Carne.findByPk(carneId, {
        include: ['cliente', 'plano', 'banco', 'parcelas']
      });

      if (!carne) {
        logger.warn('Carnê não encontrado para geração automática', { carneId });
        return false;
      }

      // Verificar se o carnê está completamente pago (não parcial)
      const resumo = await carne.getResumo();
      if (resumo.parcelas_pagas !== resumo.total_parcelas) {
        return false; // Carnê não está completamente pago
      }

      // Verificar se já existe um carnê ativo para o cliente
      const carneAtivoExistente = await Carne.findOne({
        where: {
          cliente_id: carne.cliente_id,
          status: { [require('sequelize').Op.in]: ['ativo', 'pendente', 'registrado'] }
        },
        include: ['parcelas']
      });

      if (carneAtivoExistente) {
        // Verificar se o carnê existente tem parcelas não pagas
        const resumoExistente = await carneAtivoExistente.getResumo();
        if (resumoExistente.parcelas_pagas < resumoExistente.total_parcelas) {
          logger.info('Cliente já possui carnê ativo com parcelas pendentes', {
            cliente_id: carne.cliente_id,
            carne_ativo_id: carneAtivoExistente.id
          });
          return false;
        }
      }

      // Gerar novo carnê automaticamente
      const novoCarne = await this.gerarCarneAutomatico(carne);
      
      if (novoCarne) {
        logger.info('Novo carnê gerado automaticamente', {
          cliente_id: carne.cliente_id,
          carne_original_id: carne.id,
          novo_carne_id: novoCarne.id
        });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Erro ao verificar e gerar carnê automático', {
        carneId,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      return false;
    }
  }

  /**
   * Gerar novo carnê automaticamente baseado em um carnê existente
   */
  private static async gerarCarneAutomatico(carneOriginal: Carne): Promise<Carne | null> {
    try {
      const cliente = await carneOriginal.getCliente();
      const plano = await carneOriginal.getPlano();
      const banco = await carneOriginal.getBanco();

      if (!cliente || !plano || !banco) {
        logger.error('Dados incompletos para gerar carnê automático', {
          carne_id: carneOriginal.id,
          tem_cliente: !!cliente,
          tem_plano: !!plano,
          tem_banco: !!banco
        });
        return null;
      }

      // Calcular data de vencimento da primeira parcela (próximo mês)
      const dataVencimentoPrimeira = new Date();
      dataVencimentoPrimeira.setMonth(dataVencimentoPrimeira.getMonth() + 1);
      dataVencimentoPrimeira.setDate(1); // Primeiro dia do mês

      // Obter número padrão de parcelas
      const numeroParcelasPadrao = await ParametroService.getNumeroParcelasPadrao();
      
      // Calcular valor da parcela baseado no plano
      const valorParcela = parseFloat(plano.valor_mensal.toString());
      const valorTotal = valorParcela * numeroParcelasPadrao;

      // Gerar número único do carnê
      const numeroCarne = this.gerarNumeroCarne();

      // Criar novo carnê
      const novoCarne = await Carne.create({
        cliente_id: cliente.id,
        plano_id: plano.id,
        banco_id: banco.id,
        numero_carne: numeroCarne,
        valor_total: valorTotal,
        quantidade_parcelas: numeroParcelasPadrao,
        data_vencimento_primeira: dataVencimentoPrimeira,
        status: 'pendente',
        observacoes: `Carnê gerado automaticamente baseado no carnê ${carneOriginal.numero_carne}`
      });

      // Gerar parcelas automaticamente
      await novoCarne.gerarParcelas(valorParcela);

      logger.info('Carnê automático criado com sucesso', {
        novo_carne_id: novoCarne.id,
        numero_carne: numeroCarne,
        cliente_id: cliente.id,
        valor_total: valorTotal,
        quantidade_parcelas: numeroParcelasPadrao
      });

      return novoCarne;
    } catch (error) {
      logger.error('Erro ao gerar carnê automático', {
        carne_original_id: carneOriginal.id,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      return null;
    }
  }

  /**
   * Gerar número único do carnê
   */
  private static gerarNumeroCarne(): string {
    const ano = new Date().getFullYear();
    const rand = Math.floor(100000 + Math.random() * 899999).toString();
    return `CAR${ano}${rand}`;
  }

  /**
   * Verificar se um cliente precisa de um novo carnê
   */
  static async verificarNecessidadeNovoCarne(clienteId: number): Promise<boolean> {
    try {
      const manterCarneClienteEnabled = await ParametroService.isManterCarneClienteEnabled();
      
      if (!manterCarneClienteEnabled) {
        return false;
      }

      // Verificar se existe carnê ativo para o cliente
      const carneAtivo = await Carne.findOne({
        where: {
          cliente_id: clienteId,
          status: { [require('sequelize').Op.in]: ['ativo', 'pendente', 'registrado'] }
        },
        include: ['parcelas']
      });

      if (!carneAtivo) {
        return true; // Cliente não tem carnê ativo
      }

      // Verificar se o carnê tem parcelas não pagas
      const resumo = await carneAtivo.getResumo();
      return resumo.parcelas_pagas >= resumo.total_parcelas; // Carnê está completamente pago
    } catch (error) {
      logger.error('Erro ao verificar necessidade de novo carnê', {
        cliente_id: clienteId,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      return false;
    }
  }
}

export default CarneAutoService;