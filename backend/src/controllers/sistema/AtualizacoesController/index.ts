import { Request, Response } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import { logger } from '../../../utils/logger';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { SelfUpdateService } from '../../../services/sistema/SelfUpdateService';
import { AuthenticatedRequest } from '../../../types/auth';
import { registrarCriacao } from '../../../services/sistema/AuditoriaService';

interface GitHubRelease {
  tag_name: string;
  published_at: string;
  body: string;
  name: string;
}

export class AtualizacoesController {
  /**
   * Verifica se o usuário autenticado é admin
   */
  private static isAdmin(req: Request): boolean {
    const authenticatedReq = req as AuthenticatedRequest;
    const userPayload = authenticatedReq.user as JwtPayload;
    
    if (!userPayload || typeof userPayload === 'string') {
      return false;
    }

    return userPayload.role === 'admin';
  }

  static async get(req: Request, res: Response): Promise<void> {
    // Buscar releases do GitHub
    const githubRepo = process.env.GITHUB_REPO;
    
    if (!githubRepo) {
      res.status(400).json({
        success: false,
        message: 'GITHUB_REPO não configurado nas variáveis de ambiente'
      });
      return;
    }
    
    try {
      const githubToken = process.env.GITHUB_TOKEN;
      const githubUrl = `https://api.github.com/repos/${githubRepo}/releases`;
      
      // Montar headers com token se disponível
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'BackNet-Telecom-ERP'
      };
      
      if (githubToken) {
        headers['Authorization'] = `Bearer ${githubToken}`;
      }
      
      const response = await axios.get<GitHubRelease[]>(githubUrl, { headers });
      
      // Se não houver releases, retornar array vazio
      if (!response.data || response.data.length === 0) {
        logger.info('Nenhuma release encontrada no repositório', { repo: githubRepo });
        res.json({
          success: true,
          data: [],
          versao_atual: 'N/A'
        });
        return;
      }
      
      // Ordenar releases por data de publicação (mais recentes primeiro)
      const sortedReleases = [...response.data].sort((a, b) => {
        const dateA = new Date(a.published_at).getTime();
        const dateB = new Date(b.published_at).getTime();
        return dateB - dateA; // Ordem decrescente (mais recentes primeiro)
      });
      
      // Converter releases do GitHub para formato do sistema
      const atualizacoes = sortedReleases.map((release, index) => {
        const tagVersion = release.tag_name.replace(/^v/i, ''); // Remove 'v' do início
        const publishedDate = new Date(release.published_at);
        
        // Tentar detectar tipo baseado na descrição ou tag
        let tipo: 'feature' | 'bugfix' | 'security' | 'melhoria' = 'feature';
        
        const descricaoLower = (release.body || release.name || '').toLowerCase();
        if (descricaoLower.includes('fix') || descricaoLower.includes('correção') || descricaoLower.includes('bug')) {
          tipo = 'bugfix';
        } else if (descricaoLower.includes('security') || descricaoLower.includes('segurança')) {
          tipo = 'security';
        } else if (descricaoLower.includes('melhoria') || descricaoLower.includes('update') || descricaoLower.includes('melhor')) {
          tipo = 'melhoria';
        }
        
        // Extrair primeira linha da descrição como resumo, removendo markdown e links
        let descricaoTexto = release.body ? release.body.split('\n')[0].trim() : release.name;
        
        // Remover markdown links, "Full Changelog", e outros links do GitHub
        descricaoTexto = descricaoTexto
          .replace(/\*\*Full Changelog\*\*:.*/g, '')
          .replace(/https?:\/\/[^\s]+/g, '')
          .replace(/\*\*/g, '')
          .trim();
        
        return {
          id: index + 1,
          versao: tagVersion,
          data: publishedDate.toISOString().split('T')[0], // YYYY-MM-DD
          descricao: descricaoTexto || release.name || `Versão ${tagVersion}`,
          tipo
        };
      });
      
      logger.info('Atualizações buscadas do GitHub', { 
        total: atualizacoes.length,
        repo: githubRepo 
      });

      // Obter versão atual do sistema (package.json do backend)
      // Em desenvolvimento: __dirname = backend/src/controllers/AtualizacoesController -> busca dinâmica até encontrar package.json
      // Em produção: __dirname = backend/dist/src/controllers/AtualizacoesController -> busca dinâmica até encontrar package.json
      let versaoAtual = 'N/A';
      try {
        // Usar busca dinâmica para encontrar package.json (mesma lógica do SelfUpdateService)
        const findPathWith = (startPath: string, targetItem: string): string | null => {
          let currentPath = startPath;
          const rootPath = path.parse(startPath).root;
          
          while (currentPath !== rootPath) {
            const targetPath = path.join(currentPath, targetItem);
            if (fs.existsSync(targetPath)) {
              return currentPath;
            }
            currentPath = path.dirname(currentPath);
          }
          
          if (fs.existsSync(path.join(rootPath, targetItem))) {
            return rootPath;
          }
          
          return null;
        };
        
        // Procurar package.json a partir do diretório atual
        const backendRoot = findPathWith(__dirname, 'package.json');
        
        if (backendRoot) {
          const packageJsonPath = path.join(backendRoot, 'package.json');
          if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
            // Extrair apenas versão SemVer (remover qualquer sufixo após hífen)
            const rawVersion = packageJson.version || 'N/A';
            versaoAtual = rawVersion.split('-')[0]; // Remove commit hash se existir
            logger.info('Versão do sistema obtida do package.json', { 
              versao: versaoAtual,
              versaoOriginal: rawVersion,
              path: packageJsonPath,
              backendRoot
            });
          } else {
            logger.warn('package.json não encontrado no caminho calculado', { path: packageJsonPath });
          }
        } else {
          logger.warn('Diretório com package.json não encontrado', { searchedFrom: __dirname });
        }
      } catch (error) {
        logger.warn('Erro ao ler versão do package.json', {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }

      res.json({
        success: true,
        data: atualizacoes,
        versao_atual: versaoAtual
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const axiosError = error as { response?: { status?: number; statusText?: string } };
      
      logger.error('Erro ao buscar atualizações do GitHub', {
        error: errorMessage,
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
      });
      
      // Se for erro 404 do GitHub, pode ser que o repositório não existe ou não tem releases
      if (axiosError.response?.status === 404) {
        res.status(404).json({
          success: false,
          message: 'Repositório não encontrado ou sem releases. Verifique a configuração GITHUB_REPO.'
        });
        return;
      }
      
      // Se for erro 403, pode ser problema de autenticação
      if (axiosError.response?.status === 403) {
        res.status(403).json({
          success: false,
          message: 'Acesso negado ao repositório. Verifique o GITHUB_TOKEN se o repositório for privado.'
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        message: `Erro ao buscar atualizações do GitHub: ${errorMessage}`
      });
    }
  }

  /**
   * Executa o self-update da aplicação com progresso em tempo real via SSE
   * Requer autenticação e permissão de admin
   */
  static async updateStream(req: Request, res: Response): Promise<void> {
    let branch = 'main';
    
    try {
      // Verificar se o usuário é admin
      if (!AtualizacoesController.isAdmin(req)) {
        res.writeHead(403, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        });
        res.write(`data: ${JSON.stringify({ error: 'Acesso negado. Apenas administradores podem executar atualizações.' })}\n\n`);
        res.end();
        return;
      }

      branch = (req.query?.branch as string) || req.body?.branch || 'main';

      // Validar branch
      if (typeof branch !== 'string' || !branch.trim()) {
        res.writeHead(400, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        });
        res.write(`data: ${JSON.stringify({ error: 'Branch inválida' })}\n\n`);
        res.end();
        return;
      }

      // Configurar headers para SSE
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Desabilitar buffering do nginx
      });

      logger.info('Iniciando processo de atualização com SSE', {
        branch,
        usuario: (req as AuthenticatedRequest).user,
      });

      let updateService: SelfUpdateService;
      try {
        updateService = new SelfUpdateService();
      } catch (error) {
        logger.error('Erro ao criar SelfUpdateService', {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
        res.write(`data: ${JSON.stringify({ 
          error: `Erro ao inicializar serviço de atualização: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
        })}\n\n`);
        res.end();
        return;
      }

      // Função para enviar progresso via SSE
      const sendProgress = (progress: { step: string; progress: number; message: string; logs?: string[] }) => {
        try {
          res.write(`data: ${JSON.stringify(progress)}\n\n`);
        } catch (err) {
          logger.error('Erro ao enviar progresso via SSE', { error: err });
        }
      };

      let result;
      try {
        result = await updateService.executeUpdate(branch, sendProgress);
      } catch (error) {
        logger.error('Erro inesperado ao executar atualização', {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          stack: error instanceof Error ? error.stack : undefined,
        });
        sendProgress({
          step: 'erro',
          progress: 0,
          message: `Erro inesperado durante atualização: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
          logs: [`✗ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`]
        });
        res.end();
        return;
      }

      if (!result.success) {
        logger.error('Falha no processo de atualização', {
          steps: Object.keys(result.steps).map(key => {
            const step = result.steps[key as keyof typeof result.steps];
            return {
              step: key,
              success: step?.success ?? false,
              error: step?.error || step?.stderr,
            };
          }),
        });

        sendProgress({
          step: 'erro',
          progress: 0,
          message: result.message,
          logs: [`✗ ${result.message}`]
        });
        res.end();
        return;
      }

      // Se chegou até aqui, tudo deu certo até as migrations
      logger.info('Atualização concluída com sucesso, iniciando reinicialização do PM2');

      // Aguardar PM2 reload completar
      let pm2ReloadResult;
      try {
        pm2ReloadResult = await updateService.reloadPM2(sendProgress);
        logger.info('PM2 reload concluído com sucesso');
      } catch (error) {
        logger.error('Erro ao reiniciar PM2 após atualização', {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
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
          } as Record<string, unknown>
        );
      } catch (auditError) {
        logger.warn('Erro ao registrar auditoria (não crítico)', { error: auditError });
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
        error: errorMessage,
        branch,
        usuario: (req as AuthenticatedRequest).user,
      });

      try {
        res.write(`data: ${JSON.stringify({ 
          error: 'Erro interno do servidor durante a atualização',
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        })}\n\n`);
        res.end();
      } catch (writeError) {
        logger.error('Erro ao escrever resposta SSE', { error: writeError });
      }
    }
  }

  /**
   * Executa o self-update da aplicação
   * Requer autenticação e permissão de admin
   * @deprecated Use updateStream para progresso em tempo real
   */
  static async update(req: Request, res: Response): Promise<void> {
    let branch = 'main';
    
    try {
      // Verificar se o usuário é admin
      if (!AtualizacoesController.isAdmin(req)) {
        res.status(403).json({
          success: false,
          message: 'Acesso negado. Apenas administradores podem executar atualizações.',
        });
        return;
      }

      branch = req.body?.branch || 'main';

      // Validar branch
      if (typeof branch !== 'string' || !branch.trim()) {
        res.status(400).json({
          success: false,
          message: 'Branch inválida',
        });
        return;
      }

      logger.info('Iniciando processo de atualização', {
        branch,
        usuario: (req as AuthenticatedRequest).user,
      });

      let updateService: SelfUpdateService;
      try {
        updateService = new SelfUpdateService();
      } catch (error) {
        logger.error('Erro ao criar SelfUpdateService', {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
        res.status(500).json({
          success: false,
          message: `Erro ao inicializar serviço de atualização: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        });
        return;
      }

      let result;
      try {
        result = await updateService.executeUpdate(branch);
      } catch (error) {
        logger.error('Erro inesperado ao executar atualização', {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          stack: error instanceof Error ? error.stack : undefined,
        });
        res.status(500).json({
          success: false,
          message: `Erro inesperado durante atualização: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        });
        return;
      }

      if (!result.success) {
        logger.error('Falha no processo de atualização', {
          steps: Object.keys(result.steps).map(key => {
            const step = result.steps[key as keyof typeof result.steps];
            return {
              step: key,
              success: step?.success ?? false,
              error: step?.error || step?.stderr,
            };
          }),
        });

        res.status(500).json({
          success: false,
          message: result.message,
          steps: {
            gitPull: {
              success: result.steps.gitPull.success,
              stdout: result.steps.gitPull.stdout,
              stderr: result.steps.gitPull.stderr,
              error: result.steps.gitPull.error || result.steps.gitPull.stderr,
            },
            npmInstall: {
              success: result.steps.npmInstall.success,
              stdout: result.steps.npmInstall.stdout,
              stderr: result.steps.npmInstall.stderr,
              error: result.steps.npmInstall.error || result.steps.npmInstall.stderr,
            },
            build: {
              success: result.steps.build.success,
              stdout: result.steps.build.stdout,
              stderr: result.steps.build.stderr,
              error: result.steps.build.error || result.steps.build.stderr,
            },
            migrate: {
              success: result.steps.migrate.success,
              stdout: result.steps.migrate.stdout,
              stderr: result.steps.migrate.stderr,
              error: result.steps.migrate.error || result.steps.migrate.stderr,
            },
          },
        });
        return;
      }

      // Se chegou até aqui, tudo deu certo até as migrations
      // Agora aguardar o PM2 reload completar ANTES de retornar sucesso
      logger.info('Atualização concluída com sucesso, iniciando reinicialização do PM2');

      // Aguardar PM2 reload completar antes de retornar resposta
      // Isso garante que o frontend só receba sucesso depois que o backend já reiniciou
      let pm2ReloadResult;
      try {
        pm2ReloadResult = await updateService.reloadPM2();
        logger.info('PM2 reload concluído com sucesso');
      } catch (error) {
        logger.error('Erro ao reiniciar PM2 após atualização', {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
        // Se PM2 reload falhar, ainda retornar sucesso parcial
        // mas incluir informação sobre o PM2 reload
        pm2ReloadResult = {
          success: false,
          stdout: '',
          stderr: error instanceof Error ? error.message : 'Erro desconhecido ao reiniciar PM2',
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        };
      }

      // Registrar auditoria da atualização do sistema
      const authenticatedReq = req as AuthenticatedRequest;
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
        } as Record<string, unknown>
      );

      // Retornar sucesso APÓS PM2 reload completar
      res.json({
        success: true,
        message: result.message,
        steps: {
          gitPull: {
            success: result.steps.gitPull.success,
            stdout: result.steps.gitPull.stdout,
            stderr: result.steps.gitPull.stderr,
          },
          npmInstall: {
            success: result.steps.npmInstall.success,
            stdout: result.steps.npmInstall.stdout,
            stderr: result.steps.npmInstall.stderr,
          },
          build: {
            success: result.steps.build.success,
            stdout: result.steps.build.stdout,
            stderr: result.steps.build.stderr,
          },
          migrate: {
            success: result.steps.migrate.success,
            stdout: result.steps.migrate.stdout,
            stderr: result.steps.migrate.stderr,
          },
          pm2Reload: {
            success: pm2ReloadResult.success,
            stdout: pm2ReloadResult.stdout,
            stderr: pm2ReloadResult.stderr,
          },
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      logger.error('Erro inesperado durante atualização', {
        error: errorMessage,
        stack: errorStack,
        branch,
        usuario: (req as AuthenticatedRequest).user,
      });

      // Retornar mensagem mais específica se possível
      let userMessage = 'Erro interno do servidor durante a atualização';
      
      if (errorMessage.includes('ENOENT') || errorMessage.includes('não encontrado')) {
        userMessage = 'Arquivo ou diretório não encontrado. Verifique se o repositório está configurado corretamente.';
      } else if (errorMessage.includes('permission denied') || errorMessage.includes('EACCES')) {
        userMessage = 'Erro de permissão. Verifique as permissões do diretório e do usuário que executa o processo.';
      } else if (errorMessage.includes('git')) {
        userMessage = 'Erro ao executar Git. Verifique se o repositório está configurado corretamente e se há permissões adequadas.';
      } else if (errorMessage.includes('npm')) {
        userMessage = 'Erro ao executar npm. Verifique se o npm está instalado e acessível.';
      } else if (errorMessage.includes('pm2')) {
        userMessage = 'Erro ao executar PM2. Verifique se o PM2 está instalado e o processo está configurado corretamente.';
      }

      res.status(500).json({
        success: false,
        message: userMessage,
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      });
    }
  }
}

