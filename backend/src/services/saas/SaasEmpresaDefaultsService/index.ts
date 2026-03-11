/**
 * Cria dia de vencimento padrão global (obrigatório para geração de títulos).
 * Dias de vencimento SaaS são globais, sem empresa_id.
 * Banco deve ser configurado manualmente (requer credenciais API).
 */

import { SaasDiasVencimento } from '../../../models/saas/SaasDiasVencimento';
import { logger } from '../../../utils/logger';

export class SaasEmpresaDefaultsService {
  static async createMandatoryRecords(_empresaId: number): Promise<void> {
    const diaExistente = await SaasDiasVencimento.findOne({
      where: { ativo: true },
    });

    if (!diaExistente) {
      await SaasDiasVencimento.create({
        dia: 10,
        dia_padrao: 10,
        ativo: true,
      });
      logger.info('SaasEmpresaDefaultsService - Dia de vencimento padrão criado (config global)');
    }
  }
}
