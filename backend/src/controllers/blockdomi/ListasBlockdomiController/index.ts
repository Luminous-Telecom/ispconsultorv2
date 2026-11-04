import { Request, Response } from 'express';
import { ListasBlockdomiService } from '../../../services/blockdomi/ListasBlockdomiService';
import { ADLIST_IP_PADRAO, ipv4AdlistValido } from '../../../services/blockdomi/mikrotikLista';
import { sendError } from '../../../utils/responseUtils';
import { parseTriStateBoolean, queryString } from '../../../utils/listQuery';

function filtrosTxt(req: Request) {
  const versao = queryString(req.query.versao);
  const ativo = parseTriStateBoolean(req.query.ativo) ?? true;
  return { versao: versao ?? undefined, ativo };
}

function enviarTexto(res: Response, txt: string): void {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(txt);
}

export class ListasBlockdomiController {
  /**
   * GET /domain/all - Lista domínios em texto (um por linha)
   * Query: versao (numero ou id), ativo (boolean, default true)
   */
  static async dominiosTxt(req: Request, res: Response): Promise<void> {
    try {
      const txt = await ListasBlockdomiService.listarDominiosTxt(filtrosTxt(req));
      enviarTexto(res, txt);
    } catch (error) {
      sendError(res, error, 'Erro ao listar domínios', 500, true, {
        context: 'ListasBlockdomiController',
        action: 'dominiosTxt'
      });
    }
  }

  /**
   * GET /v4/all - Lista IPv4 em texto (um por linha)
   */
  static async ipv4Txt(req: Request, res: Response): Promise<void> {
    try {
      const txt = await ListasBlockdomiService.listarIpv4Txt(filtrosTxt(req));
      enviarTexto(res, txt);
    } catch (error) {
      sendError(res, error, 'Erro ao listar IPv4', 500, true, {
        context: 'ListasBlockdomiController',
        action: 'ipv4Txt'
      });
    }
  }

  /**
   * GET /v6/all - Lista IPv6 em texto (um por linha)
   */
  static async ipv6Txt(req: Request, res: Response): Promise<void> {
    try {
      const txt = await ListasBlockdomiService.listarIpv6Txt(filtrosTxt(req));
      enviarTexto(res, txt);
    } catch (error) {
      sendError(res, error, 'Erro ao listar IPv6', 500, true, {
        context: 'ListasBlockdomiController',
        action: 'ipv6Txt'
      });
    }
  }

  /**
   * GET /domain/version - Retorna apenas o número da versão mais recente (texto puro)
   */
  static async versaoAtual(req: Request, res: Response): Promise<void> {
    try {
      const numero = await ListasBlockdomiService.getVersaoAtualNumero();
      enviarTexto(res, numero);
    } catch (error) {
      sendError(res, error, 'Erro ao obter versão atual', 500, true, {
        context: 'ListasBlockdomiController',
        action: 'versaoAtual'
      });
    }
  }

  /**
   * GET /domain/all/adlist e /domain/all/adlist/:ip
   * DNS Adlist do RouterOS v7. Sem IP, usa 0.0.0.0.
   */
  static async dominiosAdlist(req: Request, res: Response): Promise<void> {
    try {
      const ip = req.params.ip || ADLIST_IP_PADRAO;
      if (!ipv4AdlistValido(ip)) {
        res.status(400).setHeader('Content-Type', 'text/plain; charset=utf-8').send('# IP inválido');
        return;
      }

      const txt = await ListasBlockdomiService.listarDominiosAdlist(filtrosTxt(req), ip);
      enviarTexto(res, txt);
    } catch (error) {
      sendError(res, error, 'Erro ao listar adlist', 500, true, {
        context: 'ListasBlockdomiController',
        action: 'dominiosAdlist'
      });
    }
  }

  /**
   * GET /commands/mikrotik/v6
   * Script de DNS Static do RouterOS v6.
   */
  static async dominiosMikrotikV6(req: Request, res: Response): Promise<void> {
    try {
      const txt = await ListasBlockdomiService.listarDominiosMikrotikV6(filtrosTxt(req));
      enviarTexto(res, txt);
    } catch (error) {
      sendError(res, error, 'Erro ao listar script MikroTik v6', 500, true, {
        context: 'ListasBlockdomiController',
        action: 'dominiosMikrotikV6'
      });
    }
  }

}
