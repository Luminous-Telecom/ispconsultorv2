import { Request, Response } from 'express';
import Parametros from '../models/Parametros';
import Joi from 'joi';

export class ParametrosController {
  // Schema de validação
  private static updateSchema = Joi.object({
    validar_cpf_cnpj: Joi.boolean().optional(),
    validar_cep: Joi.boolean().optional(),
    titulos_vence_sabado: Joi.boolean().optional(),
    titulos_vence_domingo: Joi.boolean().optional(),
    auto_lancamento_titulos: Joi.boolean().optional(),
    total_titulos_financeiro: Joi.number().integer().min(1).max(24).optional()
  }).min(1);

  // Obter parâmetros (sempre retorna o primeiro registro)
  static async get(req: Request, res: Response): Promise<Response> {
    try {
      let parametros = await Parametros.findOne();

      // Se não existir, criar com valores padrão
      if (!parametros) {
        parametros = await Parametros.create({
          validar_cpf_cnpj: true,
          validar_cep: false,
          titulos_vence_sabado: false,
          titulos_vence_domingo: false,
          auto_lancamento_titulos: false,
          total_titulos_financeiro: 12
        });
      }

      return res.json({
        success: true,
        data: parametros
      });
    } catch (error) {
      console.error('Erro ao obter parâmetros:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao obter parâmetros do sistema'
      });
    }
  }

  // Atualizar parâmetros
  static async update(req: Request, res: Response): Promise<Response> {
    try {
      // Validação
      const { error } = ParametrosController.updateSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      let parametros = await Parametros.findOne();

      // Se não existir, criar
      if (!parametros) {
        parametros = await Parametros.create({
          validar_cpf_cnpj: req.body.validar_cpf_cnpj ?? true,
          validar_cep: req.body.validar_cep ?? false,
          titulos_vence_sabado: req.body.titulos_vence_sabado ?? false,
          titulos_vence_domingo: req.body.titulos_vence_domingo ?? false,
          auto_lancamento_titulos: req.body.auto_lancamento_titulos ?? false,
          total_titulos_financeiro: req.body.total_titulos_financeiro ?? 12
        });
      } else {
        // Atualizar
        await parametros.update(req.body);
      }

      return res.json({
        success: true,
        message: 'Parâmetros atualizados com sucesso',
        data: parametros
      });
    } catch (error) {
      console.error('Erro ao atualizar parâmetros:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao atualizar parâmetros do sistema'
      });
    }
  }
}

