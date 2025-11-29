import { Request, Response } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import { logger } from '../utils/logger';
import axios from 'axios';
import { SelfUpdateService } from '../services/SelfUpdateService';
import { AuthenticatedRequest } from '../types/auth';

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
      
      // Converter releases do GitHub para formato do sistema
      const atualizacoes = response.data.map((release, index) => {
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

      res.json({
        success: true,
        data: atualizacoes,
        versao_atual: atualizacoes[0]?.versao || 'N/A'
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
   * Executa o self-update da aplicação
   * Requer autenticação e permissão de admin
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
            };
          }),
        });

        res.status(500).json({
          success: false,
          message: result.message,
          steps: {
            gitPull: {
              success: result.steps.gitPull.success,
              error: result.steps.gitPull.error || result.steps.gitPull.stderr,
            },
            npmInstall: {
              success: result.steps.npmInstall.success,
              error: result.steps.npmInstall.error || result.steps.npmInstall.stderr,
            },
            build: {
              success: result.steps.build.success,
              error: result.steps.build.error || result.steps.build.stderr,
            },
            migrate: {
              success: result.steps.migrate.success,
              error: result.steps.migrate.error || result.steps.migrate.stderr,
            },
          },
        });
        return;
      }

      // Se chegou até aqui, tudo deu certo
      // Retornar sucesso ANTES de reiniciar o PM2
      logger.info('Atualização concluída com sucesso, aguardando reinicialização do PM2');

      // Reiniciar PM2 em background (não aguardar resposta)
      updateService.reloadPM2().catch((error) => {
        logger.error('Erro ao reiniciar PM2 após atualização', {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      });

      res.json({
        success: true,
        message: result.message,
        steps: {
          gitPull: { success: result.steps.gitPull.success },
          npmInstall: { success: result.steps.npmInstall.success },
          build: { success: result.steps.build.success },
          migrate: { success: result.steps.migrate.success },
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

