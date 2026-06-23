/**
 * Middleware que restringe acesso às rotas TXT do Blockdomi (dominios, versao, ipv4, ipv6)
 * somente para IPs cadastrados em ips_permitidos_blockdomi.
 * Registra log de acesso (IP, rota, status) em adm_sistema_logs_operacionais para requisições a essas rotas.
 */
import { Request, Response, NextFunction } from 'express';
import { IpPermitidoService } from '../../services/blockdomi/IpPermitidoService';
import { DadosEmpresaService } from '../../services/sistema/DadosEmpresaService';
import { BlockdomiLogAcessoService } from '../../services/blockdomi/BlockdomiLogAcessoService';
import { emitBlockdomiLog } from '../../socket/socketServer';
import { getClientIp } from '../../utils/requestUtils';

const BLOCKDOMI_TXT_PATHS = [
  /^\/domain\/version\/?$/i,
  /^\/domain\/all\/?$/i,
  /^\/v4\/all\/?$/i,
  /^\/v6\/all\/?$/i,
];

function isBlockdomiTxtRoute(path: string): boolean {
  return BLOCKDOMI_TXT_PATHS.some((re) => re.test(path));
}

function registerAccessLog(req: Request, res: Response, path: string): void {
  res.once('finish', () => {
    const statusCode = res.statusCode;
    const clientIp = getClientIp(req);
    const userAgent = (req.headers['user-agent'] as string) ?? null;
    let mensagemErro: string | null = null;
    if (statusCode === 403) mensagemErro = 'IP não autorizado';
    else if (statusCode >= 500) mensagemErro = `Erro interno (${statusCode})`;
    const payload = {
      ip: clientIp ?? null,
      rota: path,
      metodo: req.method,
      status_http: statusCode,
      sucesso: statusCode < 400,
      mensagem_erro: mensagemErro,
      user_agent: userAgent,
    };
    BlockdomiLogAcessoService.registrar(payload)
      .then((row) => emitBlockdomiLog(row))
      .catch(() => {});
  });
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

  registerAccessLog(req, res, path);

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
