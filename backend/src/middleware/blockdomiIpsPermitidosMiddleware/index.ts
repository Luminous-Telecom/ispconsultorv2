/**
 * Middleware que restringe acesso às rotas TXT do Blockdomi (dominios, versao, ipv4, ipv6)
 * somente para IPs cadastrados em ips_permitidos_blockdomi.
 */
import { Request, Response, NextFunction } from 'express';
import { IpPermitidoService } from '../../services/blockdomi/IpPermitidoService';
import { DadosEmpresaService } from '../../services/sistema/DadosEmpresaService';

const BLOCKDOMI_TXT_PATHS = [
  /^\/api\/blockdomi\/versao-atual\/?$/i,
  /^\/api\/blockdomi\/listas\/dominios\/?$/i,
  /^\/api\/blockdomi\/listas\/ipv4\/?$/i,
  /^\/api\/blockdomi\/listas\/ipv6\/?$/i,
];

function getClientIp(req: Request): string | null {
  const cfConnectingIp = req.headers['cf-connecting-ip'] as string;
  if (cfConnectingIp) return cfConnectingIp.trim();

  const xForwardedFor = req.headers['x-forwarded-for'] as string;
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }

  const xRealIp = req.headers['x-real-ip'] as string;
  if (xRealIp) return xRealIp.trim();

  const trueClientIp = req.headers['true-client-ip'] as string;
  if (trueClientIp) return trueClientIp.trim();

  const remoteAddress = req.socket.remoteAddress;
  if (remoteAddress) {
    return remoteAddress.replace(/^::ffff:/, '');
  }

  return null;
}

function isBlockdomiTxtRoute(path: string): boolean {
  return BLOCKDOMI_TXT_PATHS.some((re) => re.test(path));
}

export const blockdomiIpsPermitidosMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const path = req.originalUrl.split('?')[0];

  if (!isBlockdomiTxtRoute(path)) {
    return next();
  }

  const clientIp = getClientIp(req);
  const allowed = await IpPermitidoService.isIpAllowed(clientIp);

  if (!allowed) {
    const dadosEmpresa = await DadosEmpresaService.findOne();
    const contato = dadosEmpresa?.celular?.trim()
      || dadosEmpresa?.telefone?.trim()
      || dadosEmpresa?.email?.trim()
      || '';
    const msgContato = contato
      ? `Entre em contato para liberação ${contato}.`
      : 'Entre em contato para liberação.';
    res.status(403).setHeader('Content-Type', 'text/plain; charset=utf-8').send(
      `# Seu IP não está autorizado #\n${msgContato}`
    );
    return;
  }

  next();
};
