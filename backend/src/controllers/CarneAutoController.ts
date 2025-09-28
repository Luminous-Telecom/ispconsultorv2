import { Request, Response } from 'express';
import { CarneAutoService } from '../services/CarneAutoService';
import { ParametroService } from '../services/ParametroService';
import { logger } from '../utils/logger';

export class CarneAutoController {
  /**
   * Verificar se um cliente precisa de um novo carnê
   */
  static async verificarNecessidadeNovoCarne(req: Request, res: Response): Promise<void> {
    try {
      const { clienteId } = req.params;

      if (!clienteId) {
        res.status(400).json({ 
          success: false,
          error: 'ID do cliente é obrigatório' 
        });
        return;
      }

      const precisaNovoCarne = await CarneAutoService.verificarNecessidadeNovoCarne(parseInt(clienteId));

      res.json({
        success: true,
        data: {
          cliente_id: parseInt(clienteId),
          precisa_novo_carne: precisaNovoCarne
        }
      });
    } catch (error: any) {
      logger.error('Erro ao verificar necessidade de novo carnê', {
        cliente_id: req.params.clienteId,
        error: error.message
      });
      res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor',
        message: error.message 
      });
    }
  }

  /**
   * Obter configurações de auto carnê
   */
  static async getConfiguracoes(req: Request, res: Response): Promise<void> {
    try {
      const geracaoAutomatica = await ParametroService.isGeracaoAutomaticaCarneEnabled();
      const autoParcelas = await ParametroService.isAutoParcelasEnabled();
      const numeroParcelasPadrao = await ParametroService.getNumeroParcelasPadrao();
      const manterCarneCliente = await ParametroService.isManterCarneClienteEnabled();

      res.json({
        success: true,
        data: {
          geracao_automatica_carne: geracaoAutomatica,
          auto_parcelas_carne: autoParcelas,
          numero_parcelas_padrao: numeroParcelasPadrao,
          manter_carne_cliente: manterCarneCliente
        }
      });
    } catch (error: any) {
      logger.error('Erro ao obter configurações de auto carnê', {
        error: error.message
      });
      res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor',
        message: error.message 
      });
    }
  }

  /**
   * Forçar verificação e geração de carnê automático para um carnê específico
   */
  static async forcarGeracaoCarneAutomatico(req: Request, res: Response): Promise<void> {
    try {
      const { carneId } = req.params;

      if (!carneId) {
        res.status(400).json({ 
          success: false,
          error: 'ID do carnê é obrigatório' 
        });
        return;
      }

      const carnêGerado = await CarneAutoService.verificarEGerarCarneAutomatico(parseInt(carneId));

      res.json({
        success: true,
        data: {
          carne_id: parseInt(carneId),
          carnê_gerado: carnêGerado
        },
        message: carnêGerado 
          ? 'Carnê automático gerado com sucesso' 
          : 'Não foi necessário gerar carnê automático'
      });
    } catch (error: any) {
      logger.error('Erro ao forçar geração de carnê automático', {
        carne_id: req.params.carneId,
        error: error.message
      });
      res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor',
        message: error.message 
      });
    }
  }
}

export default CarneAutoController;