/**
 * Restringe as listas TXT do Blockdomi aos IPs cadastrados.
 * Grava o log da API assim que a solicitação chega e atualiza quando a resposta termina,
 * inclusive se a consulta está lenta ou o cliente desiste antes do fim.
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
  /^\/domain\/all\/adlist(\/.*)?$/i,
  /^\/domains\/all\/adlist(\/.*)?$/i,
  /^\/commands\/mikrotik\/v6\/?$/i,
  /^\/v4\/all\/?$/i,
  /^\/v6\/all\/?$/i,
];

const BLOCKDOMI_PUBLICO_PATH = /^\/api\/blockdomi-publico(\/.*)?$/i;

function isBlockdomiTxtRoute(path: string): boolean {
  return BLOCKDOMI_TXT_PATHS.some((re) => re.test(path));
}

function mensagemDoStatus(statusCode: number): string | null {
  if (statusCode === 403) return 'IP não autorizado';
  if (statusCode === 499) return 'Consulta encerrada antes da resposta';
  if (statusCode >= 500) return `Erro interno (${statusCode})`;
  return null;
}

function observarAcesso(req: Request, res: Response, path: string): void {
  const inicio = Date.now();
  let encerrado = false;
  const registro = BlockdomiLogAcessoService.registrar({
    ip: getClientIp(req) ?? null,
    rota: path,
    metodo: req.method,
    status_http: null,
    sucesso: null,
    em_andamento: true,
    mensagem_erro: null,
    user_agent: (req.headers['user-agent'] as string) ?? null,
  })
    .then((row) => {
      emitBlockdomiLog(row);
      return Number(row.id);
    })
    .catch(() => null);

  const encerrar = (statusCode: number) => {
    if (encerrado) return;
    encerrado = true;
    void registro.then((id) => {
      if (!id) return;
      BlockdomiLogAcessoService.concluir(id, {
        status_http: statusCode,
        sucesso: statusCode < 400,
        mensagem_erro: mensagemDoStatus(statusCode),
        duracao_ms: Date.now() - inicio,
      })
        .then((row) => {
          if (row) emitBlockdomiLog(row);
        })
        .catch(() => undefined);
    });
  };

  res.once('finish', () => encerrar(res.statusCode));
  res.once('close', () => {
    setImmediate(() => {
      if (!res.writableFinished) encerrar(499);
    });
  });
}

export const blockdomiIpsPermitidosMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const path = req.originalUrl.split('?')[0];
  const txt = isBlockdomiTxtRoute(path);
  const publico = BLOCKDOMI_PUBLICO_PATH.test(path);

  if (!txt && !publico) {
    return next();
  }

  observarAcesso(req, res, path);

  if (!txt) {
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
