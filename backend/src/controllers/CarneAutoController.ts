import { Request, Response } from 'express';
import { CarneAutoService } from '../services/CarneAutoService';

export class CarneAutoController {
  /**
   * Verifica todos os carnês pagos e gera novos automaticamente
   */
  static async verificarTodos(req: Request, res: Response): Promise<void> {
    try {
      const novosCarnes = await CarneAutoService.verificarTodosCarnesPagos();
      
      res.json({
        success: true,
        message: `Verificação concluída. ${novosCarnes.length} novo(s) carnê(s) gerado(s).`,
        data: {
          novos_carnes: novosCarnes.map(carne => ({
            id: carne.id,
            numero_carne: carne.numero_carne,
            cliente_id: carne.cliente_id,
            plano_id: carne.plano_id,
            status: carne.status,
            valor_total: carne.valor_total,
            quantidade_parcelas: carne.quantidade_parcelas,
            data_vencimento_primeira: carne.data_vencimento_primeira
          }))
        }
      });
    } catch (error) {
      console.error('Erro ao verificar carnês automaticamente:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Verifica um carnê específico e gera novo se necessário
   */
  static async verificarCarne(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const carneId = parseInt(id);

      if (isNaN(carneId)) {
        res.status(400).json({
          success: false,
          error: 'ID do carnê inválido'
        });
        return;
      }

      const novoCarne = await CarneAutoService.verificarEGerarCarneAutomatico(carneId);
      
      if (novoCarne) {
        res.json({
          success: true,
          message: `Novo carnê ${novoCarne.numero_carne} gerado automaticamente.`,
          data: {
            novo_carne: {
              id: novoCarne.id,
              numero_carne: novoCarne.numero_carne,
              cliente_id: novoCarne.cliente_id,
              plano_id: novoCarne.plano_id,
              status: novoCarne.status,
              valor_total: novoCarne.valor_total,
              quantidade_parcelas: novoCarne.quantidade_parcelas,
              data_vencimento_primeira: novoCarne.data_vencimento_primeira
            }
          }
        });
      } else {
        res.json({
          success: true,
          message: 'Nenhum novo carnê foi gerado. O carnê pode não estar pago ou já existe um carnê ativo.',
          data: {
            novo_carne: null
          }
        });
      }
    } catch (error) {
      console.error('Erro ao verificar carnê automaticamente:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Obtém configurações de geração automática
   */
  static async getConfiguracao(req: Request, res: Response): Promise<void> {
    try {
      const config = await CarneAutoService.getConfiguracaoAuto();
      
      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      console.error('Erro ao obter configuração automática:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Atualiza configurações de geração automática
   */
  static async setConfiguracao(req: Request, res: Response): Promise<void> {
    try {
      const { ativo, dias_antes_vencimento, gerar_apos_pagamento } = req.body;

      if (typeof ativo !== 'boolean') {
        res.status(400).json({
          success: false,
          error: 'Campo "ativo" deve ser um boolean'
        });
        return;
      }

      if (typeof dias_antes_vencimento !== 'number' || dias_antes_vencimento < 0) {
        res.status(400).json({
          success: false,
          error: 'Campo "dias_antes_vencimento" deve ser um número positivo'
        });
        return;
      }

      if (typeof gerar_apos_pagamento !== 'boolean') {
        res.status(400).json({
          success: false,
          error: 'Campo "gerar_apos_pagamento" deve ser um boolean'
        });
        return;
      }

      await CarneAutoService.setConfiguracaoAuto({
        ativo,
        dias_antes_vencimento,
        gerar_apos_pagamento
      });

      res.json({
        success: true,
        message: 'Configuração atualizada com sucesso',
        data: {
          ativo,
          dias_antes_vencimento,
          gerar_apos_pagamento
        }
      });
    } catch (error) {
      console.error('Erro ao atualizar configuração automática:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
}
