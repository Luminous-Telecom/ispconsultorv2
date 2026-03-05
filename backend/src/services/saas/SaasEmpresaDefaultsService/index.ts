/**
 * Cria dia de vencimento padrão para empresa (obrigatório para geração de títulos).
 * Banco deve ser configurado manualmente (requer credenciais API).
 */

import { SaasDiasVencimento } from '../../../models/saas/SaasDiasVencimento';
import { logger } from '../../../utils/logger';

export class SaasEmpresaDefaultsService {
  static async createMandatoryRecords(empresaId: number): Promise<void> {
    const diaExistente = await SaasDiasVencimento.findOne({
      where: { empresa_id: empresaId, ativo: true },
    });

    if (!diaExistente) {
      await SaasDiasVencimento.create({
        empresa_id: empresaId,
        dia: 10,
        dia_padrao: 10,
        ativo: true,
      });
      logger.info('SaasEmpresaDefaultsService - Dia de vencimento criado para empresa', { empresaId });
    }
  }
}
