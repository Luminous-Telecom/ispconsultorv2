import { Request, Response } from 'express';
import { DiasVencimento } from '../models/DiasVencimento';
import { logger } from '../utils/logger';

export class DiasVencimentoController {
  /**
   * Buscar configuração de dias de vencimento
   */
  static async get(req: Request, res: Response): Promise<void> {
    try {
      const configuracao = await DiasVencimento.findOne({
        where: { ativo: true },
        order: [['created_at', 'DESC']],
      });

      if (!configuracao) {
        res.status(404).json({
          success: false,
          message: 'Configuração de dias de vencimento não encontrada'
        });
        return;
      }

      res.json({
        success: true,
        data: configuracao,
        message: 'Configuração encontrada'
      });
    } catch (error) {
      logger.error('Erro ao buscar configuração de dias de vencimento:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Atualizar configuração de dias de vencimento
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const configuracaoData = req.body;

      // Buscar configuração ativa ou criar uma nova
      let configuracao = await DiasVencimento.findOne({
        where: { ativo: true },
      });

      if (!configuracao) {
        // Criar nova configuração se não existir
        configuracao = await DiasVencimento.create({
          ...configuracaoData,
          ativo: true,
        });
      } else {
        // Atualizar configuração existente
        await configuracao.update(configuracaoData);
      }

      res.json({
        success: true,
        data: configuracao,
        message: 'Configuração de dias de vencimento atualizada com sucesso'
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao atualizar configuração de dias de vencimento:', error);
      
      if (error.name === 'SequelizeValidationError') {
        res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: error.errors.map((err: any) => err.message)
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Criar nova configuração de dias de vencimento
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const configuracaoData = req.body;

      // Desativar configurações anteriores
      await DiasVencimento.update(
        { ativo: false },
        { where: { ativo: true } }
      );

      // Criar nova configuração ativa
      const configuracao = await DiasVencimento.create({
        ...configuracaoData,
        ativo: true,
      });

      res.status(201).json({
        success: true,
        data: configuracao,
        message: 'Configuração de dias de vencimento criada com sucesso'
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao criar configuração de dias de vencimento:', error);
      
      if (error.name === 'SequelizeValidationError') {
        res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: error.errors.map((err: any) => err.message)
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Listar histórico de configurações
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const configuracoes = await DiasVencimento.findAll({
        order: [['created_at', 'DESC']],
      });

      res.json({
        success: true,
        data: configuracoes,
        message: 'Histórico de configurações listado com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao listar histórico de configurações:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Calcular próximo vencimento baseado na configuração
   */
  static async calculateNextDueDate(req: Request, res: Response): Promise<void> {
    try {
      const { data_referencia, dia_personalizado } = req.body;

      if (!data_referencia) {
        res.status(400).json({
          success: false,
          message: 'Data de referência é obrigatória'
        });
        return;
      }

      const configuracao = await DiasVencimento.findOne({
        where: { ativo: true },
      });

      if (!configuracao) {
        res.status(404).json({
          success: false,
          message: 'Configuração de dias de vencimento não encontrada'
        });
        return;
      }

      const dataRef = new Date(data_referencia);
      const diaVencimento = dia_personalizado || configuracao.dia_padrao;

      // Calcular próxima data de vencimento
      let proximoVencimento = new Date(dataRef.getFullYear(), dataRef.getMonth(), diaVencimento);

      // Se a data já passou no mês atual, usar o próximo mês
      if (proximoVencimento <= dataRef) {
        proximoVencimento = new Date(dataRef.getFullYear(), dataRef.getMonth() + 1, diaVencimento);
      }

      // Verificar se deve considerar fins de semana e feriados
      if (!configuracao.vence_sabado && proximoVencimento.getDay() === 6) {
        // Se vence no sábado e não é permitido, mover para segunda
        proximoVencimento.setDate(proximoVencimento.getDate() + 2);
      }

      if (!configuracao.vence_domingo && proximoVencimento.getDay() === 0) {
        // Se vence no domingo e não é permitido, mover para segunda
        proximoVencimento.setDate(proximoVencimento.getDate() + 1);
      }

      res.json({
        success: true,
        data: {
          proximo_vencimento: proximoVencimento.toISOString().split('T')[0],
          configuracao_utilizada: {
            dia_padrao: configuracao.dia_padrao,
            vence_sabado: configuracao.vence_sabado,
            vence_domingo: configuracao.vence_domingo,
            dias_tolerancia: configuracao.dias_tolerancia
          }
        },
        message: 'Próximo vencimento calculado com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao calcular próximo vencimento:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Validar data de vencimento
   */
  static async validateDueDate(req: Request, res: Response): Promise<void> {
    try {
      const { data_vencimento } = req.body;

      if (!data_vencimento) {
        res.status(400).json({
          success: false,
          message: 'Data de vencimento é obrigatória'
        });
        return;
      }

      const configuracao = await DiasVencimento.findOne({
        where: { ativo: true },
      });

      if (!configuracao) {
        res.status(404).json({
          success: false,
          message: 'Configuração de dias de vencimento não encontrada'
        });
        return;
      }

      const dataVencimento = new Date(data_vencimento);
      const diaSemana = dataVencimento.getDay(); // 0 = domingo, 6 = sábado

      let valido = true;
      const problemas: string[] = [];

      // Verificar se é sábado
      if (diaSemana === 6 && !configuracao.vence_sabado) {
        valido = false;
        problemas.push('Vencimento não é permitido aos sábados');
      }

      // Verificar se é domingo
      if (diaSemana === 0 && !configuracao.vence_domingo) {
        valido = false;
        problemas.push('Vencimento não é permitido aos domingos');
      }

      res.json({
        success: true,
        data: {
          data_vencimento: data_vencimento,
          valido: valido,
          problemas: problemas,
          configuracao: {
            vence_sabado: configuracao.vence_sabado,
            vence_domingo: configuracao.vence_domingo
          }
        },
        message: valido ? 'Data de vencimento válida' : 'Data de vencimento inválida'
      });
    } catch (error) {
      logger.error('Erro ao validar data de vencimento:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}
