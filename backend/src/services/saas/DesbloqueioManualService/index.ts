import { prisma } from '../../../db/prisma';

export interface DesbloqueioManualResult {
  success: boolean;
  message: string;
  data?: { data_fim_desbloqueio_manual: string };
}

/**
 * Desbloqueia manualmente um tenant bloqueado por atraso.
 * O prazo vem de parâmetros SaaS, que não têm tabela neste schema.
 */
export class DesbloqueioManualService {
  static async desbloquear(empresaId: number): Promise<DesbloqueioManualResult> {
    const empresa = await prisma.sistema_tenants.findUnique({
      where: { id: empresaId },
      select: { id: true, bloqueado_por_atraso: true },
    });

    if (!empresa) {
      return { success: false, message: 'Empresa não encontrada' };
    }

    if (!empresa.bloqueado_por_atraso) {
      return { success: false, message: 'Empresa não está bloqueada por atraso' };
    }

    return {
      success: false,
      message: 'Configure "Dias para desbloqueio manual" em Parâmetros > Recursos do Sistema',
    };
  }
}
