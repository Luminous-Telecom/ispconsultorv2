import { Request, Response } from 'express';
import { Titulo } from '../../models/Titulo';
import { Cliente } from '../../models/Cliente';
import { Plano } from '../../models/Plano';
import { Banco } from '../../models/Banco';
import { Transaction } from 'sequelize';
import { logger } from '../../utils/logger';
import { normalizeDateForDb } from '../../utils/dateUtils';
import { titulosBulkCreateSchema } from '../../validators/titulo.validator';
import { withTransaction } from '../../utils/transaction';
import { registrarCriacao } from '../../services/AuditoriaService';
import type { AuthenticatedRequest } from '../../types/auth';

export class TituloBulkController {
  
  /**
   * Cria múltiplos títulos em lote
   */
  public static async createBulk(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = titulosBulkCreateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });

      if (error) {
        res.status(400).json({ success: false, message: 'Dados inválidos', errors: error.details.map(detail => detail.message) });
        return;
      }

      const { titulos } = value;

      const titulosCriados = await withTransaction(async (transaction: Transaction) => {
        const resultados: Titulo[] = [];

        for (const dadosTitulo of titulos) {
          const cliente = await Cliente.findByPk(dadosTitulo.cliente_id, { transaction });
          if (!cliente || !cliente.ativo) {
            throw new Error(`Cliente ${dadosTitulo.cliente_id} não encontrado ou inativo`);
          }

          const plano = await Plano.findByPk(dadosTitulo.plano_id, { transaction });
          if (!plano) {
            throw new Error(`Plano ${dadosTitulo.plano_id} não encontrado`);
          }

          const banco = await Banco.findByPk(dadosTitulo.banco_id, { transaction });
          if (!banco || !banco.ativo) {
            throw new Error(`Banco ${dadosTitulo.banco_id} não encontrado ou inativo`);
          }

          const numeroTitulo = `TIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

          let valorFinal = parseFloat(plano.valor_mensal.toString());
          const desconto_percentual = dadosTitulo.desconto_percentual ? parseFloat(dadosTitulo.desconto_percentual.toString()) : null;
          const desconto_valor = dadosTitulo.desconto_valor ? parseFloat(dadosTitulo.desconto_valor.toString()) : null;
          const acrescimo_percentual = dadosTitulo.acrescimo_percentual ? parseFloat(dadosTitulo.acrescimo_percentual.toString()) : null;
          const acrescimo_valor = dadosTitulo.acrescimo_valor ? parseFloat(dadosTitulo.acrescimo_valor.toString()) : null;

          if (desconto_valor && desconto_valor > 0) {
            valorFinal = valorFinal - desconto_valor;
          } else if (desconto_percentual && desconto_percentual > 0) {
            valorFinal = valorFinal * (1 - (desconto_percentual / 100));
          }

          if (acrescimo_percentual && acrescimo_percentual > 0) {
            valorFinal = valorFinal * (1 + (acrescimo_percentual / 100));
          }

          if (acrescimo_valor && acrescimo_valor > 0) {
            valorFinal = valorFinal + acrescimo_valor;
          }

          valorFinal = Math.max(0.01, valorFinal);

          const titulo = await Titulo.create({
            cliente_id: dadosTitulo.cliente_id,
            plano_id: dadosTitulo.plano_id,
            banco_id: dadosTitulo.banco_id,
            contrato_id: dadosTitulo.contrato_id || null,
            numero_titulo: numeroTitulo,
            valor: valorFinal,
            valor_final: valorFinal,
            data_vencimento: normalizeDateForDb(dadosTitulo.data_vencimento) || new Date(dadosTitulo.data_vencimento),
            observacoes: dadosTitulo.observacoes || null,
            desconto_percentual: dadosTitulo.desconto_percentual || null,
            desconto_valor: dadosTitulo.desconto_valor || null,
            acrescimo_percentual: dadosTitulo.acrescimo_percentual || null,
            acrescimo_valor: dadosTitulo.acrescimo_valor || null,
            descricao: dadosTitulo.descricao || null,
            status: dadosTitulo.status || 'pendente',
            pago: dadosTitulo.pago || false,
            is_avulso: dadosTitulo.is_avulso === true
          }, { transaction });

          resultados.push(titulo);
        }

        return resultados;
      });

      // Registrar auditoria para cada título criado
      for (const titulo of titulosCriados) {
        await registrarCriacao(
          req as AuthenticatedRequest,
          'Titulo',
          titulo.id,
          titulo.toJSON() as Record<string, unknown>
        );
      }

      const { metrics, isMetricsEnabled } = await import('../../utils/metrics');
      if (isMetricsEnabled() && metrics && titulosCriados.length > 0) {
        metrics.businessTitulosGerados.inc(titulosCriados.length);
      }

      res.status(201).json({ success: true, message: `${titulosCriados.length} título(s) criado(s) com sucesso`, data: titulosCriados });
    } catch (error: unknown) {
      logger.error('Erro ao criar títulos em lote', { context: 'TituloBulkController', action: 'createBulk', error });
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      res.status(500).json({ success: false, message: errorMessage });
    }
  }
}

