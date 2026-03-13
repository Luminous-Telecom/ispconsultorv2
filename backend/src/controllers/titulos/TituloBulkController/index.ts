import { Request, Response } from 'express';
import { Titulo } from '../../../models/financeiro/Titulo';
import { TituloService } from '../../../services/financeiro/TituloService';
import { ClienteService } from '../../../services/clientes/ClienteService';
import { PlanoService } from '../../../services/cadastros/PlanoService';
import { BancoService } from '../../../services/cadastros/BancoService';
import { Transaction } from 'sequelize';
import { logger } from '../../../utils/logger';
import { normalizeDateForDb } from '../../../utils/dateUtils';
import { titulosBulkCreateSchema } from '../../../validators/titulo.validator';
import { withTransaction } from '../../../utils/transaction';
import { registrarCriacao } from '../../../services/sistema/AuditoriaService/index';
import { FinancialCalculationsService } from '../../../services/FinancialCalculationsService';
import type { AuthenticatedRequest } from '../../../types/auth';
import { sendSuccess, sendError, sendValidationError } from '../../../utils/responseUtils';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';

export class TituloBulkController {
  
  /**
   * Cria múltiplos títulos em lote
   */
  public static async createBulk(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = titulosBulkCreateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });

      if (error) {
        // Converter para Record<string, string[]> esperado pelo sendValidationError
        const errorsByField: Record<string, string[]> = error.details.reduce((acc, detail) => {
          const field = detail.path.join('.') || 'general';
          if (!acc[field]) {
            acc[field] = [];
          }
          acc[field].push(detail.message);
          return acc;
        }, {} as Record<string, string[]>);
        sendValidationError(res, 'Dados inválidos', errorsByField);
        return;
      }

      const { titulos } = value;

      const titulosCriados = await withTransaction(async (transaction: Transaction) => {
        const resultados: Titulo[] = [];

        for (const dadosTitulo of titulos) {
          const cliente = await ClienteService.getById(dadosTitulo.cliente_id);
          if (!cliente || !cliente.ativo) {
            throw new Error(`Cliente ${dadosTitulo.cliente_id} não encontrado ou inativo`);
          }

          const plano = await PlanoService.getById(dadosTitulo.plano_id);
          if (!plano) {
            throw new Error(`Plano ${dadosTitulo.plano_id} não encontrado`);
          }

          const banco = await BancoService.getById(dadosTitulo.banco_id);
          if (!banco || !banco.ativo) {
            throw new Error(`Banco ${dadosTitulo.banco_id} não encontrado ou inativo`);
          }

          const numeroTitulo = `TIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

          const valorFinal = FinancialCalculationsService.calcularValorFinal(
            parseFloat(String(plano.valor_mensal)),
            {
              desconto_valor: dadosTitulo.desconto_valor ? parseFloat(dadosTitulo.desconto_valor.toString()) : undefined,
              desconto_percentual: dadosTitulo.desconto_percentual ? parseFloat(dadosTitulo.desconto_percentual.toString()) : undefined
            },
            {
              acrescimo_valor: dadosTitulo.acrescimo_valor ? parseFloat(dadosTitulo.acrescimo_valor.toString()) : undefined,
              acrescimo_percentual: dadosTitulo.acrescimo_percentual ? parseFloat(dadosTitulo.acrescimo_percentual.toString()) : undefined
            }
          );

          const titulo = await TituloService.create({
            empresa_id: cliente.empresa_id ?? null,
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
          }, transaction);

          resultados.push(titulo);
        }

        return resultados;
      });

      // Registrar auditoria para cada título criado (já registra no Elasticsearch internamente)
      for (const titulo of titulosCriados) {
        const tituloData = titulo.toJSON() as Record<string, unknown>;
        try {
          const empresaIdAudit = getEmpresaIdOrNull(req) ?? titulo.empresa_id ?? null;
          await registrarCriacao(req as AuthenticatedRequest, 'Titulo', titulo.id, tituloData, undefined, empresaIdAudit);
        } catch (auditError) {
          // Não interromper o fluxo
        }
      }

      const { metrics, isMetricsEnabled } = await import('../../../utils/metrics');
      if (isMetricsEnabled() && metrics && titulosCriados.length > 0) {
        metrics.businessTitulosGerados.inc(titulosCriados.length);
      }

      sendSuccess(res, titulosCriados, `${titulosCriados.length} título(s) criado(s) com sucesso`, 201);
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao criar títulos em lote', 500, true, {
        context: 'TituloBulkController',
        action: 'createBulk'
      });
    }
  }
}

