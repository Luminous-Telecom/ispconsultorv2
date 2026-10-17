import { Titulo } from '../../../models/financeiro/Titulo';
import { Banco } from '../../../models/cadastros/Banco';

export type ResolvedTitulo = {
  titulo: Titulo;
  banco: Banco | null;
};

export type WebhookEmpresaScope = {
  /** ID do banco na URL do webhook */
  empresaIdentifier?: string;
};

/**
 * Resolve títulos do ERP para webhooks de pagamento.
 * O identificador na URL é o ID do banco.
 */
export class TituloWebhookResolver {
  static async findByChargeId(chargeId: string, scope?: WebhookEmpresaScope): Promise<ResolvedTitulo | null> {
    const bancoId = parseBancoId(scope?.empresaIdentifier);
    if (bancoId == null) return null;

    const TituloModel = await import('../../../models/financeiro/Titulo').then(m => m.Titulo);
    const titulo = await TituloModel.findOne({
      where: { charge_id: chargeId, banco_id: bancoId },
      include: [{ model: Banco, as: 'banco' }]
    }) as (Titulo & { banco?: Banco | null }) | null;

    if (!titulo) return null;
    return { titulo, banco: titulo.banco ?? null };
  }

  static async findByCustomId(customId: string, scope?: WebhookEmpresaScope): Promise<ResolvedTitulo | null> {
    const id = parseInt(customId, 10);
    if (Number.isNaN(id)) return null;
    const bancoId = parseBancoId(scope?.empresaIdentifier);
    if (bancoId == null) return null;

    const TituloModel = await import('../../../models/financeiro/Titulo').then(m => m.Titulo);
    const titulo = await TituloModel.findOne({
      where: { id, banco_id: bancoId },
      include: [{ model: Banco, as: 'banco' }]
    }) as (Titulo & { banco?: Banco | null }) | null;

    if (!titulo) return null;
    return { titulo, banco: titulo.banco ?? null };
  }
}

function parseBancoId(identifier: string | undefined): number | null {
  if (!identifier || !/^\d+$/.test(identifier)) return null;
  const bancoId = parseInt(identifier, 10);
  return Number.isInteger(bancoId) ? bancoId : null;
}
