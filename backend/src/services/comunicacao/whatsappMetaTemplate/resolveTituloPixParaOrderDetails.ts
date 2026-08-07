import { Cliente } from '../../../models/clientes/Cliente';
import { Titulo } from '../../../models/financeiro/Titulo';
import type { TituloComRelacoes } from '../../../controllers/titulos/TituloHelpers/types';
import { logger } from '../../../utils/logger';
import type { TemplateBuildContext } from './types';

/** Garante qrcode PIX no título (registra no banco se necessário) para order_details. */
export async function resolveTituloPixParaOrderDetails(
  titulo: TemplateBuildContext['titulo'],
  cliente?: TemplateBuildContext['cliente']
): Promise<TemplateBuildContext['titulo']> {
  if ((titulo.qrcode || '').trim()) {
    return titulo;
  }
  if (!titulo.id) return titulo;

  try {
    const full = await Titulo.findByPk(titulo.id, {
      include: [
        { model: Cliente, as: 'cliente' },
        { association: 'banco' },
        { association: 'contrato' },
        { association: 'plano' },
      ],
    });
    if (!full) return titulo;

    const { TituloPDFService } = await import('../../titulos/TituloPDFService');
    const enriched = await TituloPDFService.registrarTituloNoBancoSeNecessario(
      full as unknown as TituloComRelacoes
    );

    if (!(enriched.qrcode || '').trim()) {
      logger.warn('[WhatsApp Template] Título sem QR Code PIX após registro no banco', {
        titulo_id: titulo.id,
        charge_id: enriched.charge_id ?? null,
        banco_id: enriched.banco_id ?? null,
      });
      return {
        ...titulo,
        qrcode: enriched.qrcode ?? titulo.qrcode,
        linha_digitavel: enriched.linha_digitavel ?? titulo.linha_digitavel,
        empresa_id: enriched.empresa_id ?? titulo.empresa_id ?? cliente?.empresa_id ?? null,
      };
    }

    logger.info('[WhatsApp Template] PIX obtido para order_details', {
      titulo_id: titulo.id,
      charge_id: enriched.charge_id ?? null,
    });

    return {
      ...titulo,
      qrcode: enriched.qrcode,
      linha_digitavel: enriched.linha_digitavel ?? titulo.linha_digitavel,
      empresa_id: enriched.empresa_id ?? titulo.empresa_id ?? cliente?.empresa_id ?? null,
      valor_final: enriched.valor_final ?? titulo.valor_final,
      valor: enriched.valor ?? titulo.valor,
      numero_titulo: enriched.numero_titulo ?? titulo.numero_titulo,
      descricao: enriched.descricao ?? titulo.descricao,
    };
  } catch (error) {
    logger.warn('[WhatsApp Template] Falha ao obter PIX do título', {
      titulo_id: titulo.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return titulo;
  }
}
