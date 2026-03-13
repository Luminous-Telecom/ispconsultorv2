import { Request, Response } from 'express';
import { DiasVencimentoService } from '../../../services/cadastros/DiasVencimentoService';
import { registrarAtualizacao } from '../../../services/sistema/AuditoriaService/index';
import type { AuthenticatedRequest } from '../../../types/auth';
import { sendSuccess, sendError } from '../../../utils/responseUtils';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';

export class DiasVencimentoController {
  /**
   * Buscar configuração de dias de vencimento
   */
  static async get(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = getEmpresaIdOrNull(req);
      const dias = await DiasVencimentoService.list({ ativo: true }, empresaId);

      sendSuccess(res, dias, 'Dias de vencimento encontrados');
    } catch (error) {
      sendError(res, error, 'Erro ao buscar dias de vencimento', 500, true);
    }
  }

  /**
   * Atualizar configuração de dias de vencimento (apenas da empresa)
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { dias } = req.body ?? {};
      const empresaId = getEmpresaIdOrNull(req);
      const diasAntes = await DiasVencimentoService.list(undefined, empresaId);
      const dadosAnteriores = diasAntes.map(d => d.toJSON());

      await DiasVencimentoService.upsertDias(Array.isArray(dias) ? dias : [], empresaId);

      const diasDepois = await DiasVencimentoService.list(undefined, empresaId);
      const dadosNovos = diasDepois.map(d => d.toJSON());

      // Registrar auditoria para cada dia que mudou
      for (const diaNovo of dadosNovos) {
        const diaAntigo = dadosAnteriores.find((d) => d.dia === diaNovo.dia);
        if (!diaAntigo || diaAntigo.ativo !== diaNovo.ativo) {
          const dadosAnterioresAudit = diaAntigo 
            ? (diaAntigo as unknown as Record<string, unknown>)
            : ({ dia: diaNovo.dia, ativo: false } as Record<string, unknown>);
          
          const empresaIdAudit = empresaId ?? (diaNovo as { empresa_id?: number | null }).empresa_id ?? null;
          await registrarAtualizacao(
            req as AuthenticatedRequest,
            'DiasVencimento',
            diaNovo.id as number,
            dadosAnterioresAudit,
            diaNovo as unknown as Record<string, unknown>,
            undefined,
            empresaIdAudit
          );
        }
      }

      sendSuccess(res, undefined, 'Dias de vencimento atualizados com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao atualizar dias de vencimento', 500, true);
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { dias } = req.body ?? {};
      const empresaId = getEmpresaIdOrNull(req);
      await DiasVencimentoService.upsertDias(Array.isArray(dias) ? dias : [], empresaId);

      const diasDepois = await DiasVencimentoService.list({ ativo: true }, empresaId);
      for (const dia of diasDepois) {
        const empresaIdAudit = empresaId ?? dia.empresa_id ?? null;
        await registrarAtualizacao(
          req as AuthenticatedRequest,
          'DiasVencimento',
          dia.id,
          { dia: dia.dia, ativo: false } as unknown as Record<string, unknown>,
          dia.toJSON() as unknown as Record<string, unknown>,
          undefined,
          empresaIdAudit
        );
      }

      sendSuccess(res, undefined, 'Dias de vencimento criados com sucesso', 201);
    } catch (error) {
      sendError(res, error, 'Erro ao criar dias de vencimento', 500, true);
    }
  }

}
