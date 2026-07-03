import { Titulo } from '../../../models/financeiro/Titulo';
import { Banco } from '../../../models/cadastros/Banco';
import type SaasTitulo from '../../../models/saas/SaasTitulo';
import type SaasBanco from '../../../models/saas/SaasBanco';

export type ResolvedTitulo = {
  titulo: Titulo | InstanceType<typeof SaasTitulo>;
  saas: boolean;
  banco: Banco | InstanceType<typeof SaasBanco> | null;
};

export type WebhookEmpresaScope = {
  /** 'saas' = só saas_titulos; ID do banco (ex: 42) = só titulos admin; undefined = ambos */
  empresaIdentifier?: string;
};

/**
 * Centraliza a resolução de títulos para webhooks.
 * Busca em titulos (admin) e saas_titulos (SaaS).
 * @param scope.empresaIdentifier - 'saas' para só SaaS; ID do banco para só ERP; undefined para buscar em ambos
 */
export class TituloWebhookResolver {
  /**
   * Busca título por charge_id em titulos ou saas_titulos
   */
  static async findByChargeId(chargeId: string, scope?: WebhookEmpresaScope): Promise<ResolvedTitulo | null> {
    const identifier = scope?.empresaIdentifier?.toLowerCase();

    // Só admin/ERP: buscar em titulos
    if (identifier && identifier !== 'saas') {
      const TituloModel = await import('../../../models/financeiro/Titulo').then(m => m.Titulo);
      const tituloAdmin = await TituloModel.findOne({
        where: { charge_id: chargeId },
        include: [{ model: Banco, as: 'banco' }]
      }) as (Titulo & { banco?: Banco | null }) | null;

      if (tituloAdmin) {
        return {
          titulo: tituloAdmin,
          saas: false,
          banco: tituloAdmin.banco ?? null
        };
      }
      return null;
    }

    // Só SaaS: buscar em saas_titulos
    if (identifier === 'saas') {
      const { default: SaasTituloModel } = await import('../../../models/saas/SaasTitulo');
      const { default: SaasBancoModel } = await import('../../../models/saas/SaasBanco');
      const tituloSaas = await SaasTituloModel.findOne({
        where: { charge_id: chargeId },
        include: [{ model: SaasBancoModel, as: 'banco' }]
      }) as (InstanceType<typeof SaasTituloModel> & { banco?: InstanceType<typeof SaasBancoModel> | null }) | null;

      if (tituloSaas) {
        return {
          titulo: tituloSaas,
          saas: true,
          banco: tituloSaas.banco ?? null
        };
      }
      return null;
    }

    // Sem identificador: buscar em ambos (retrocompatível)
    const TituloModel = await import('../../../models/financeiro/Titulo').then(m => m.Titulo);
    const tituloAdmin = await TituloModel.findOne({
      where: { charge_id: chargeId },
      include: [{ model: Banco, as: 'banco' }]
    }) as (Titulo & { banco?: Banco | null }) | null;

    if (tituloAdmin) {
      return {
        titulo: tituloAdmin,
        saas: false,
        banco: tituloAdmin.banco ?? null
      };
    }

    const { default: SaasTituloModel } = await import('../../../models/saas/SaasTitulo');
    const { default: SaasBancoModel } = await import('../../../models/saas/SaasBanco');
    const tituloSaas = await SaasTituloModel.findOne({
      where: { charge_id: chargeId },
      include: [{ model: SaasBancoModel, as: 'banco' }]
    }) as (InstanceType<typeof SaasTituloModel> & { banco?: InstanceType<typeof SaasBancoModel> | null }) | null;

    if (tituloSaas) {
      return {
        titulo: tituloSaas,
        saas: true,
        banco: tituloSaas.banco ?? null
      };
    }

    return null;
  }

  /**
   * Busca título por id (custom_id) em titulos ou saas_titulos
   */
  static async findByCustomId(customId: string, scope?: WebhookEmpresaScope): Promise<ResolvedTitulo | null> {
    const id = parseInt(customId, 10);
    if (isNaN(id)) return null;

    const identifier = scope?.empresaIdentifier?.toLowerCase();

    if (identifier && identifier !== 'saas') {
      const TituloModel = await import('../../../models/financeiro/Titulo').then(m => m.Titulo);
      const tituloAdmin = await TituloModel.findByPk(id, {
        include: [{ model: Banco, as: 'banco' }]
      }) as (Titulo & { banco?: Banco | null }) | null;

      if (tituloAdmin) {
        return {
          titulo: tituloAdmin,
          saas: false,
          banco: tituloAdmin.banco ?? null
        };
      }
      return null;
    }

    if (identifier === 'saas') {
      const { default: SaasTituloModel } = await import('../../../models/saas/SaasTitulo');
      const { default: SaasBancoModel } = await import('../../../models/saas/SaasBanco');
      const tituloSaas = await SaasTituloModel.findByPk(id, {
        include: [{ model: SaasBancoModel, as: 'banco' }]
      }) as (InstanceType<typeof SaasTituloModel> & { banco?: InstanceType<typeof SaasBancoModel> | null }) | null;

      if (tituloSaas) {
        return {
          titulo: tituloSaas,
          saas: true,
          banco: tituloSaas.banco ?? null
        };
      }
      return null;
    }

    const TituloModel = await import('../../../models/financeiro/Titulo').then(m => m.Titulo);
    const tituloAdmin = await TituloModel.findByPk(id, {
      include: [{ model: Banco, as: 'banco' }]
    }) as (Titulo & { banco?: Banco | null }) | null;

    if (tituloAdmin) {
      return {
        titulo: tituloAdmin,
        saas: false,
        banco: tituloAdmin.banco ?? null
      };
    }

    const { default: SaasTituloModel } = await import('../../../models/saas/SaasTitulo');
    const { default: SaasBancoModel } = await import('../../../models/saas/SaasBanco');
    const tituloSaas = await SaasTituloModel.findByPk(id, {
      include: [{ model: SaasBancoModel, as: 'banco' }]
    }) as (InstanceType<typeof SaasTituloModel> & { banco?: InstanceType<typeof SaasBancoModel> | null }) | null;

    if (tituloSaas) {
      return {
        titulo: tituloSaas,
        saas: true,
        banco: tituloSaas.banco ?? null
      };
    }

    return null;
  }
}
