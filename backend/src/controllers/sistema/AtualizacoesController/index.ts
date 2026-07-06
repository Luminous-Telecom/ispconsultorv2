import { Request, Response } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import { logger } from '../../../utils/logger';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { SelfUpdateService } from '../../../services/sistema/SelfUpdateService';
import { DocUpdateService } from '../../../services/sistema/DocUpdateService';
import { AuthenticatedRequest } from '../../../types/auth';
import type { SaasAuthenticatedRequest } from '../../../middleware/saasAuthMiddleware';
import { registrarCriacao } from '../../../services/sistema/AuditoriaService/index';
import { sendSuccess, sendError, sendValidationError, sendNotFound, sendForbidden } from '../../../utils/responseUtils';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';
import { SYSTEM_NAME } from '../../../constants/systemBrand';

function findDirWith(startPath: string, target: string): string | null {
  let cur = startPath;
  const root = path.parse(cur).root;
  while (cur !== root) {
    if (fs.existsSync(path.join(cur, target))) return cur;
    cur = path.dirname(cur);
  }
  return fs.existsSync(path.join(root, target)) ? root : null;
}

function getSystemVersion(): string {
  try {
    const backendRoot = findDirWith(__dirname, 'package.json');
    if (!backendRoot) return 'N/A';
    const pkg = JSON.parse(fs.readFileSync(path.join(backendRoot, 'package.json'), 'utf-8'));
    return (pkg.version || 'N/A').split('-')[0];
  } catch {
    return 'N/A';
  }
}

interface GitHubRelease {
  tag_name: string;
  published_at: string;
  body: string;
  name: string;
}

function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatCommitSubject(subject: string): string {
  const trimmed = subject.trim();
  if (!trimmed) return 'Geral: Atualização do sistema';

  const conventional = trimmed.match(/^(\w+)(?:\(([^)]+)\))?:\s*(.+)$/);
  if (conventional) {
    const category = (conventional[2] || 'Geral')
      .split(/[-_/]/)
      .map((part) => capitalize(part))
      .join(' ');
    return `${category}: ${capitalize(conventional[3])}`;
  }

  if (/^[^:]+:\s*.+/.test(trimmed)) {
    return trimmed.replace(/\*\*/g, '').trim();
  }

  return `Geral: ${capitalize(trimmed)}`;
}

function parseReleaseItens(body: string): string[] {
  if (!body?.trim()) return [];

  const itens: string[] = [];
  let reachedMeta = false;

  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    if (
      line.startsWith('---') ||
      /^\*\*Detalhes\*\*/i.test(line) ||
      /^Deploy:/i.test(line)
    ) {
      reachedMeta = true;
      continue;
    }

    const bulletMatch = line.match(/^[-•*]\s+(.+)$/);
    if (bulletMatch) {
      let text = bulletMatch[1].replace(/\*\*/g, '').trim();
      text = text.replace(/^\[[a-f0-9]+\]\s*/i, '').trim();
      if (text && !/^(Commit|Autor|Data|Workflow|Run):/i.test(text)) {
        itens.push(formatCommitSubject(text));
      }
      continue;
    }

    if (reachedMeta) continue;

    if (/^[^:]+:\s*.+/.test(line) && !/^https?:\/\//i.test(line)) {
      const text = line.replace(/\*\*/g, '').trim();
      if (!/^(Commit|Autor|Data|Workflow|Run):/i.test(text)) {
        itens.push(formatCommitSubject(text));
      }
    }
  }

  return [...new Set(itens)];
}

export class AtualizacoesController {
  /**
   * Verifica se o usuário pode acessar (admin ERP ou super_admin SaaS)
   */
  private static canAccess(req: Request): boolean {
    const saasReq = req as SaasAuthenticatedRequest;
    if (saasReq.saasUser?.saas && saasReq.saasUser?.tipo === 'super_admin') {
      return true;
    }
    const authenticatedReq = req as AuthenticatedRequest;
    const userPayload = authenticatedReq.user as JwtPayload;
    if (!userPayload || typeof userPayload === 'string') return false;
    return userPayload.role === 'admin';
  }

  static async get(req: Request, res: Response): Promise<void> {
    if (!AtualizacoesController.canAccess(req)) {
      sendForbidden(res, 'Acesso restrito ao painel SaaS');
      return;
    }

    const githubRepo = process.env.GITHUB_REPO;
    if (!githubRepo) {
      sendValidationError(res, 'GITHUB_REPO não configurado nas variáveis de ambiente');
      return;
    }

    try {
      const headers: Record<string, string> = { 'Accept': 'application/vnd.github+json', 'User-Agent': SYSTEM_NAME.replace(/\s+/g, '-') };
      if (process.env.GITHUB_TOKEN) headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;

      const githubTimeoutMs = parseInt(process.env.GITHUB_API_TIMEOUT_MS || '110000', 10);
      const response = await axios.get<GitHubRelease[]>(
        `https://api.github.com/repos/${githubRepo}/releases`,
        {
          headers,
          timeout: Number.isFinite(githubTimeoutMs) ? githubTimeoutMs : 110_000,
        }
      );

      if (!response.data || response.data.length === 0) {
        sendSuccess(res, { data: [], versao_atual: 'N/A' });
        return;
      }

      const sortedReleases = [...response.data].sort(
        (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
      );

      const atualizacoes = sortedReleases.map((release, index) => {
        const tagVersion = release.tag_name.replace(/^v/i, '');

        let tipo: 'feature' | 'bugfix' | 'security' | 'melhoria' = 'feature';
        const descLower = (release.body || release.name || '').toLowerCase();
        if (descLower.includes('fix') || descLower.includes('correção') || descLower.includes('bug')) tipo = 'bugfix';
        else if (descLower.includes('security') || descLower.includes('segurança')) tipo = 'security';
        else if (descLower.includes('melhoria') || descLower.includes('update') || descLower.includes('melhor')) tipo = 'melhoria';

        const itens = parseReleaseItens(release.body || '');
        const descricaoFallback = (release.body ? release.body.split('\n')[0].trim() : release.name)
          .replace(/\*\*Full Changelog\*\*:.*/g, '')
          .replace(/https?:\/\/[^\s]+/g, '')
          .replace(/\*\*/g, '')
          .trim();
        const descricao = itens[0] || descricaoFallback || release.name || `Versão ${tagVersion}`;

        return {
          id: index + 1,
          versao: tagVersion,
          data: new Date(release.published_at).toISOString().split('T')[0],
          descricao,
          itens: itens.length > 0 ? itens : [descricao],
          tipo,
        };
      });

      const versaoAtual = getSystemVersion();
      logger.info('Atualizações buscadas', { total: atualizacoes.length, versaoAtual });

      sendSuccess(res, { data: atualizacoes, versao_atual: versaoAtual });
    } catch (error) {
      if (res.headersSent) {
        return;
      }

      if (axios.isAxiosError(error)) {
        if (error.code === 'ERR_CANCELED' || error.name === 'CanceledError') {
          return;
        }
        if (error.response?.status === 404) {
          sendNotFound(res, 'Repositório não encontrado ou sem releases. Verifique a configuração GITHUB_REPO.');
          return;
        }
        if (error.response?.status === 403) {
          sendForbidden(res, 'Acesso negado ao repositório. Verifique o GITHUB_TOKEN se o repositório for privado.');
          return;
        }
        if (error.response == null) {
          sendError(
            res,
            error,
            'Não foi possível obter dados do GitHub. Verifique rede/firewall até api.github.com e GITHUB_API_TIMEOUT_MS se necessário.',
            502,
            true
          );
          return;
        }
      }

      sendError(res, error, 'Erro ao buscar atualizações do GitHub', 500, true);
    }
  }

  /**
   * Executa o self-update da aplicação com progresso em tempo real via SSE
   * Requer autenticação e permissão de admin
   */
  static async updateStream(req: Request, res: Response): Promise<void> {
    let branch = 'main';

    logger.info('Atualização iniciada');

    try {
      if (!AtualizacoesController.canAccess(req)) {
        res.writeHead(403, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
        res.write(`data: ${JSON.stringify({ error: 'Acesso negado. Apenas administradores podem executar atualizações.' })}\n\n`);
        res.end();
        return;
      }

      branch = (req.query?.branch as string) || req.body?.branch || 'main';

      if (typeof branch !== 'string' || !branch.trim()) {
        res.writeHead(400, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
        res.write(`data: ${JSON.stringify({ error: 'Branch inválida' })}\n\n`);
        res.end();
        return;
      }

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      });

      let updateService: SelfUpdateService;
      try {
        updateService = new SelfUpdateService();
      } catch (error) {
        res.write(`data: ${JSON.stringify({ error: `Erro ao inicializar serviço de atualização: ${error instanceof Error ? error.message : 'Erro desconhecido'}` })}\n\n`);
        res.end();
        return;
      }

      const sendProgress = (progress: { step: string; progress: number; message: string; logs?: string[] }) => {
        try { res.write(`data: ${JSON.stringify(progress)}\n\n`); } catch { /* SSE já fechado */ }
      };

      let result;
      try {
        result = await updateService.executeUpdate(branch, sendProgress);
        logger.info('Atualização concluída');
      } catch (error) {
        logger.error('Erro inesperado ao executar atualização', { error: error instanceof Error ? error.message : 'Erro desconhecido' });
        sendProgress({ step: 'erro', progress: 0, message: `Erro inesperado durante atualização: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, logs: [`✗ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`] });
        res.end();
        return;
      }

      if (!result.success) {
        logger.error('Falha no processo de atualização', { message: result.message });
        sendProgress({ step: 'erro', progress: 0, message: result.message, logs: [`✗ ${result.message}`] });
        res.end();
        return;
      }

      let pm2ReloadResult;
      try {
        pm2ReloadResult = await updateService.reloadPM2(sendProgress);
      } catch (error) {
        logger.error('Erro ao reiniciar PM2 após atualização', { error: error instanceof Error ? error.message : 'Erro desconhecido' });
        pm2ReloadResult = {
          success: false,
          stdout: '',
          stderr: error instanceof Error ? error.message : 'Erro desconhecido ao reiniciar PM2',
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        };
      }

      // Registrar auditoria da atualização do sistema
      const authenticatedReq = req as AuthenticatedRequest;
      try {
        const empresaIdAudit = getEmpresaIdOrNull(authenticatedReq) ?? null;
        await registrarCriacao(
          authenticatedReq,
          'SistemaAtualizacao',
          0,
          {
            branch,
            steps: {
              gitPull: { success: result.steps.gitPull.success },
              npmInstall: { success: result.steps.npmInstall.success },
              build: { success: result.steps.build.success },
              migrate: { success: result.steps.migrate.success },
              pm2Reload: { success: pm2ReloadResult.success }
            },
            message: result.message
          } as Record<string, unknown>,
          undefined,
          empresaIdAudit
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

      // Enviar resultado final
      sendProgress({
        step: 'finalizado',
        progress: 100,
        message: 'Atualização concluída com sucesso!',
        logs: ['✓ Atualização concluída com sucesso!']
      });

      res.write(`data: ${JSON.stringify({ 
        success: true, 
        message: result.message,
        steps: {
          gitPull: { success: result.steps.gitPull.success },
          npmInstall: { success: result.steps.npmInstall.success },
          build: { success: result.steps.build.success },
          migrate: { success: result.steps.migrate.success },
          pm2Reload: { success: pm2ReloadResult.success }
        }
      })}\n\n`);
      res.end();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro inesperado durante atualização', {
        error: errorMessage
      });

      try {
        res.write(`data: ${JSON.stringify({ 
          error: 'Erro interno do servidor durante a atualização',
          details: !__dirname.includes('dist') ? errorMessage : undefined
        })}\n\n`);
        res.end();
      } catch (writeError) {
        logger.error('Erro ao escrever resposta SSE');
      }
    }
  }

  /**
   * Atualiza somente a wiki (git pull + build doc se necessário + PM2 doc).
   */
  static async updateDocStream(req: Request, res: Response): Promise<void> {
    let branch = 'main';

    logger.info('Atualização da wiki iniciada');

    try {
      if (!AtualizacoesController.canAccess(req)) {
        res.writeHead(403, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
        res.write(`data: ${JSON.stringify({ error: 'Acesso negado. Apenas administradores podem executar atualizações.' })}\n\n`);
        res.end();
        return;
      }

      branch = (req.query?.branch as string) || req.body?.branch || 'main';

      if (typeof branch !== 'string' || !branch.trim()) {
        res.writeHead(400, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
        res.write(`data: ${JSON.stringify({ error: 'Branch inválida' })}\n\n`);
        res.end();
        return;
      }

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      });

      let docUpdateService: DocUpdateService;
      try {
        docUpdateService = new DocUpdateService();
      } catch (error) {
        res.write(`data: ${JSON.stringify({ error: `Erro ao inicializar serviço da wiki: ${error instanceof Error ? error.message : 'Erro desconhecido'}` })}\n\n`);
        res.end();
        return;
      }

      const sendProgress = (progress: { step: string; progress: number; message: string; logs?: string[] }) => {
        try { res.write(`data: ${JSON.stringify(progress)}\n\n`); } catch { /* SSE já fechado */ }
      };

      let result;
      try {
        result = await docUpdateService.executeDocUpdate(branch, sendProgress);
        logger.info('Atualização da wiki concluída');
      } catch (error) {
        logger.error('Erro inesperado ao atualizar wiki', { error: error instanceof Error ? error.message : 'Erro desconhecido' });
        sendProgress({
          step: 'erro',
          progress: 0,
          message: `Erro inesperado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
          logs: [`✗ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`],
        });
        res.end();
        return;
      }

      if (!result.success) {
        logger.error('Falha na atualização da wiki', { message: result.message });
        sendProgress({ step: 'erro', progress: 0, message: result.message, logs: [`✗ ${result.message}`] });
        res.end();
        return;
      }

      const pm2ReloadResult = docUpdateService.reloadDocPm2(sendProgress);

      sendProgress({
        step: 'finalizado',
        progress: 100,
        message: 'Documentação atualizada com sucesso!',
        logs: ['✓ Wiki atualizada'],
      });

      res.write(`data: ${JSON.stringify({
        success: true,
        message: result.message,
        steps: {
          gitPull: { success: result.steps.gitPull.success },
          buildDoc: { success: result.steps.buildDoc.success },
          pm2Reload: { success: pm2ReloadResult.success },
        },
      })}\n\n`);
      res.end();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro inesperado durante atualização da wiki', { error: errorMessage });

      try {
        res.write(`data: ${JSON.stringify({
          error: 'Erro interno do servidor durante a atualização da wiki',
          details: !__dirname.includes('dist') ? errorMessage : undefined,
        })}\n\n`);
        res.end();
      } catch {
        logger.error('Erro ao escrever resposta SSE da wiki');
      }
    }
  }

}

