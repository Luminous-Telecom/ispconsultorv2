import { Titulo } from '../../../models/financeiro/Titulo';
import { Banco } from '../../../models/cadastros/Banco';

export type ResolvedTitulo = {
  titulo: Titulo;
  banco: Banco | null;
};

export type WebhookEmpresaScope = {
  /**
   * Segmento da URL do webhook:
   * - ID numérico do banco (`/webhook/efi/12`)
   * - ou `identificador_conta` / payee_code da Efi (`/webhook/efi/56108d60...`)
   */
  empresaIdentifier?: string;
};

/**
 * Resolve títulos do ERP para webhooks de pagamento.
 * Na URL: ID do banco **ou** identificador da conta Efi (payee_code).
 */
export class TituloWebhookResolver {
  /**
   * Resolve o banco a partir do segmento da URL do webhook.
   * Numérico → `id`; caso contrário → `identificador_conta` (Efi).
   */
  static async resolveBancoFromWebhookIdentifier(
    identifier: string | undefined,
    tipoBanco?: 'efi' | 'asaas'
  ): Promise<Banco | null> {
    const raw = identifier?.trim();
    if (!raw) return null;

    if (/^\d+$/.test(raw)) {
      const bancoId = parseInt(raw, 10);
      if (!Number.isInteger(bancoId)) return null;
      return Banco.findOne({
        where: {
          id: bancoId,
          ativo: true,
          ...(tipoBanco ? { tipo_banco: tipoBanco } : {}),
        },
      });
    }

    // payee_code / identificador_conta (não numérico)
    return Banco.findOne({
      where: {
        identificador_conta: raw,
        ativo: true,
        tipo_banco: tipoBanco ?? 'efi',
      },
    });
  }

  static async resolveBancoId(
    scope?: WebhookEmpresaScope,
    tipoBanco?: 'efi' | 'asaas'
  ): Promise<number | null> {
    const banco = await this.resolveBancoFromWebhookIdentifier(scope?.empresaIdentifier, tipoBanco);
    return banco?.id ?? null;
  }

  static async findByChargeId(chargeId: string, scope?: WebhookEmpresaScope): Promise<ResolvedTitulo | null> {
    // Sem filtrar tipo: Asaas e Efi usam ID numérico; payee_code não numérico resolve como Efi.
    const bancoId = await this.resolveBancoId(scope);
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
    const bancoId = await this.resolveBancoId(scope);
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
