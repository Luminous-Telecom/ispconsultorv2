import { Request, Response } from 'express';
import { ImportarListaBlockdomiService } from '../../../services/blockdomi/ImportarListaBlockdomiService';
import { VersaoBlockdomiService } from '../../../services/blockdomi/VersaoBlockdomiService';
import { sendSuccess, sendError, sendValidationError } from '../../../utils/responseUtils';

export class ImportarListaBlockdomiController {
  static async importar(req: Request, res: Response): Promise<void> {
    try {
      const {
        dominios = [],
        ipv4 = [],
        ipv6 = [],
        nome_oficio,
        data_inicio_bloqueio,
        data_fim_bloqueio,
        link_oficio_anatel,
        link_oficio_justica,
        link_planilha_dominios
      } = req.body;

      const dominiosArr = Array.isArray(dominios) ? dominios : [];
      const ipv4Arr = Array.isArray(ipv4) ? ipv4 : [];
      const ipv6Arr = Array.isArray(ipv6) ? ipv6 : [];

      const total = dominiosArr.length + ipv4Arr.length + ipv6Arr.length;
      if (total === 0) {
        sendValidationError(res, 'Informe ao menos um item em dominios, ipv4 ou ipv6.');
        return;
      }

      const dataInicio = data_inicio_bloqueio != null ? String(data_inicio_bloqueio).trim() : '';
      if (!dataInicio) {
        sendValidationError(res, 'Data início bloqueio é obrigatória no importe em lote.');
        return;
      }

      const result = await ImportarListaBlockdomiService.importar({
        dominios: dominiosArr,
        ipv4: ipv4Arr,
        ipv6: ipv6Arr,
        nome_oficio: nome_oficio ?? null,
        data_inicio_bloqueio: data_inicio_bloqueio ?? null,
        data_fim_bloqueio: data_fim_bloqueio ?? null,
        link_oficio_anatel: link_oficio_anatel ?? null,
        link_oficio_justica: link_oficio_justica ?? null,
        link_planilha_dominios: link_planilha_dominios ?? null
      });

      const parts = [`Lista versão ${result.versao_lista}`];
      if (result.dominios.created + result.dominios.updated > 0) {
        parts.push(`Domínios: ${result.dominios.created} criado(s), ${result.dominios.updated} atualizado(s)`);
      }
      if (result.ipv4.created + result.ipv4.updated > 0) {
        parts.push(`IPv4: ${result.ipv4.created} criado(s), ${result.ipv4.updated} atualizado(s)`);
      }
      if (result.ipv6.created + result.ipv6.updated > 0) {
        parts.push(`IPv6: ${result.ipv6.created} criado(s), ${result.ipv6.updated} atualizado(s)`);
      }

      sendSuccess(res, result, parts.join('. ') + '.', 201);
    } catch (error) {
      sendError(res, error, 'Erro ao importar lista blockdomi', 500, true, {
        context: 'ImportarListaBlockdomiController',
        action: 'importar',
        body: req.body
      });
    }
  }

  /**
   * Gera uma nova versão sem vincular a nenhuma entidade.
   * Não altera versões existentes.
   */
  static async gerarVersao(req: Request, res: Response): Promise<void> {
    try {
      const versao = await VersaoBlockdomiService.criarVersao();
      sendSuccess(res, versao, `Versão ${versao.numero} gerada.`, 201);
    } catch (error) {
      sendError(res, error, 'Erro ao gerar versão', 500, true, {
        context: 'ImportarListaBlockdomiController',
        action: 'gerarVersao'
      });
    }
  }
}
