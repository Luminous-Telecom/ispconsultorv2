import { Request, Response } from 'express';
import { ListasBlockdomiService } from '../../../services/blockdomi/ListasBlockdomiService';
import { sendError } from '../../../utils/responseUtils';

export class ListasBlockdomiController {
  /**
   * GET /listas/dominios - Lista domínios em texto (um por linha)
   * Query: versao (numero ou id), ativo (boolean, default true)
   */
  static async dominiosTxt(req: Request, res: Response): Promise<void> {
    try {
      const versao = req.query.versao as string | undefined;
      const ativo = req.query.ativo !== undefined ? req.query.ativo === 'true' : true;

      const txt = await ListasBlockdomiService.listarDominiosTxt({
        versao: versao ?? undefined,
        ativo
      });

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(txt);
    } catch (error) {
      sendError(res, error, 'Erro ao listar domínios', 500, true, {
        context: 'ListasBlockdomiController',
        action: 'dominiosTxt'
      });
    }
  }

  /**
   * GET /listas/ipv4 - Lista IPv4 em texto (um por linha)
   */
  static async ipv4Txt(req: Request, res: Response): Promise<void> {
    try {
      const versao = req.query.versao as string | undefined;
      const ativo = req.query.ativo !== undefined ? req.query.ativo === 'true' : true;

      const txt = await ListasBlockdomiService.listarIpv4Txt({
        versao: versao ?? undefined,
        ativo
      });

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(txt);
    } catch (error) {
      sendError(res, error, 'Erro ao listar IPv4', 500, true, {
        context: 'ListasBlockdomiController',
        action: 'ipv4Txt'
      });
    }
  }

  /**
   * GET /listas/ipv6 - Lista IPv6 em texto (um por linha)
   */
  static async ipv6Txt(req: Request, res: Response): Promise<void> {
    try {
      const versao = req.query.versao as string | undefined;
      const ativo = req.query.ativo !== undefined ? req.query.ativo === 'true' : true;

      const txt = await ListasBlockdomiService.listarIpv6Txt({
        versao: versao ?? undefined,
        ativo
      });

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(txt);
    } catch (error) {
      sendError(res, error, 'Erro ao listar IPv6', 500, true, {
        context: 'ListasBlockdomiController',
        action: 'ipv6Txt'
      });
    }
  }

  /**
   * GET /versao-atual - Retorna apenas o número da versão mais recente (texto puro)
   */
  static async versaoAtual(req: Request, res: Response): Promise<void> {
    try {
      const numero = await ListasBlockdomiService.getVersaoAtualNumero();
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(numero);
    } catch (error) {
      sendError(res, error, 'Erro ao obter versão atual', 500, true, {
        context: 'ListasBlockdomiController',
        action: 'versaoAtual'
      });
    }
  }

}
