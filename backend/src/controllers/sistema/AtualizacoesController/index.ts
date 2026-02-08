import { Request, Response } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import { logger } from '../../../utils/logger';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { SelfUpdateService } from '../../../services/sistema/SelfUpdateService';
import { AuthenticatedRequest } from '../../../types/auth';
import { registrarCriacao } from '../../../services/sistema/AuditoriaService/index';
import { sendSuccess, sendError, sendValidationError, sendNotFound, sendForbidden } from '../../../utils/responseUtils';

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
    logger.info('🔍 Iniciando busca de atualizações', {
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    // Buscar releases do GitHub
    const githubRepo = process.env.GITHUB_REPO;
    logger.info('📋 Configuração do GitHub', {
      githubRepo: githubRepo || 'NÃO CONFIGURADO',
      hasToken: !!process.env.GITHUB_TOKEN
    });

    if (!githubRepo) {
      logger.error('❌ GITHUB_REPO não configurado');
      sendValidationError(res, 'GITHUB_REPO não configurado nas variáveis de ambiente');
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
      
      logger.info('🌐 Fazendo requisição para API do GitHub', {
        url: githubUrl,
        headers: {
          Accept: headers.Accept,
          Authorization: headers.Authorization ? 'Bearer ***' : 'NÃO CONFIGURADO'
        }
      });

      const response = await axios.get<GitHubRelease[]>(githubUrl, { headers });

      logger.info('📦 Resposta da API do GitHub recebida', {
        status: response.status,
        statusText: response.statusText,
        totalReleases: response.data?.length || 0,
        hasData: !!response.data
      });

      // Se não houver releases, retornar array vazio
      if (!response.data || response.data.length === 0) {
        logger.info('📭 Nenhuma release encontrada no repositório', { repo: githubRepo });
        sendSuccess(res, { data: [], versao_atual: 'N/A' });
        return;
      }
      
      logger.info('🔄 Ordenando releases por data', {
        totalReleases: response.data.length,
        primeirasDatas: response.data.slice(0, 3).map(r => ({
          tag: r.tag_name,
          data: r.published_at,
          titulo: r.name
        }))
      });

      // Ordenar releases por data de publicação (mais recentes primeiro)
      const sortedReleases = [...response.data].sort((a, b) => {
        const dateA = new Date(a.published_at).getTime();
        const dateB = new Date(b.published_at).getTime();
        return dateB - dateA; // Ordem decrescente (mais recentes primeiro)
      });

      logger.info('📝 Processando releases', {
        totalOrdenadas: sortedReleases.length,
        primeiraRelease: sortedReleases[0] ? {
          tag: sortedReleases[0].tag_name,
          data: sortedReleases[0].published_at,
          titulo: sortedReleases[0].name?.substring(0, 50)
        } : null
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

        const atualizacao = {
          id: index + 1,
          versao: tagVersion,
          data: publishedDate.toISOString().split('T')[0], // YYYY-MM-DD
          descricao: descricaoTexto || release.name || `Versão ${tagVersion}`,
          tipo
        };

        // Log das primeiras 5 processadas
        if (index < 5) {
          logger.debug('🔧 Processando release', {
            index: index + 1,
            tag: release.tag_name,
            versaoProcessada: tagVersion,
            tipoDetectado: tipo,
            descricaoOriginal: (release.body || release.name || '').substring(0, 100),
            descricaoFinal: atualizacao.descricao.substring(0, 100)
          });
        }

        return atualizacao;
      });
      
      logger.info('Atualizações buscadas do GitHub', { 
        total: atualizacoes.length,
        repo: githubRepo 
      });

      // Obter versão atual do sistema (package.json do backend)
      // Em desenvolvimento: __dirname = backend/src/controllers/AtualizacoesController -> busca dinâmica até encontrar package.json
      // Em produção: __dirname = backend/dist/src/controllers/AtualizacoesController -> busca dinâmica até encontrar package.json
      let versaoAtual = 'N/A';

      logger.info('📦 Procurando versão do sistema no package.json', {
        dirname: __dirname,
        cwd: process.cwd(),
        platform: process.platform
      });

      try {
        // Usar busca dinâmica para encontrar package.json (mesma lógica do SelfUpdateService)
        const findPathWith = (startPath: string, targetItem: string): string | null => {
          let currentPath = startPath;
          const rootPath = path.parse(startPath).root;

          logger.debug('🔍 Buscando arquivo', {
            startPath,
            targetItem,
            rootPath,
            currentPath
          });

          while (currentPath !== rootPath) {
            const targetPath = path.join(currentPath, targetItem);
            logger.debug('🔍 Verificando caminho', { targetPath, exists: fs.existsSync(targetPath) });

            if (fs.existsSync(targetPath)) {
              return currentPath;
            }
            currentPath = path.dirname(currentPath);
          }

          const rootTargetPath = path.join(rootPath, targetItem);
          logger.debug('🔍 Verificando raiz', { rootTargetPath, exists: fs.existsSync(rootTargetPath) });

          if (fs.existsSync(rootTargetPath)) {
            return rootPath;
          }

          return null;
        };

        // Procurar package.json a partir do diretório atual
        const backendRoot = findPathWith(__dirname, 'package.json');

        logger.info('📁 Resultado da busca por package.json', {
          backendRoot,
          searchedFrom: __dirname
        });

        if (backendRoot) {
          const packageJsonPath = path.join(backendRoot, 'package.json');

          logger.debug('📄 Verificando arquivo package.json', {
            path: packageJsonPath,
            exists: fs.existsSync(packageJsonPath)
          });

          if (fs.existsSync(packageJsonPath)) {
            const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
            logger.debug('📖 Conteúdo do package.json lido', {
              size: packageJsonContent.length,
              startsWith: packageJsonContent.substring(0, 100)
            });

            const packageJson = JSON.parse(packageJsonContent);
            // Extrair apenas versão SemVer (remover qualquer sufixo após hífen)
            const rawVersion = packageJson.version || 'N/A';
            versaoAtual = rawVersion.split('-')[0]; // Remove commit hash se existir

            logger.info('✅ Versão do sistema obtida do package.json', {
              versao: versaoAtual,
              versaoOriginal: rawVersion,
              path: packageJsonPath,
              backendRoot,
              packageJsonKeys: Object.keys(packageJson)
            });
          } else {
            logger.warn('⚠️ package.json não encontrado no caminho calculado', { path: packageJsonPath });
          }
        } else {
          logger.warn('⚠️ Diretório com package.json não encontrado', { searchedFrom: __dirname });
        }
      } catch (error) {
        logger.error('❌ Erro ao ler versão do package.json', {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          stack: error instanceof Error ? error.stack : undefined,
          dirname: __dirname
        });
      }

      logger.info('✅ Atualizações processadas com sucesso', {
        total: atualizacoes.length,
        repo: githubRepo,
        versaoAtual,
        primeirasAtualizacoes: atualizacoes.slice(0, 3).map(a => ({
          versao: a.versao,
          data: a.data,
          tipo: a.tipo,
          descricaoPreview: a.descricao.substring(0, 50)
        }))
      });

      const responseData = { data: atualizacoes, versao_atual: versaoAtual };
      logger.info('📤 Enviando resposta para o cliente', {
        success: true,
        dataLength: atualizacoes.length,
        versaoAtual,
        responseSize: JSON.stringify(responseData).length
      });

      sendSuccess(res, responseData);
    } catch (error) {
      const axiosError = error as { response?: { status?: number; statusText?: string } };
      
      // Se for erro 404 do GitHub, pode ser que o repositório não existe ou não tem releases
      if (axiosError.response?.status === 404) {
        sendNotFound(res, 'Repositório não encontrado ou sem releases. Verifique a configuração GITHUB_REPO.');
        return;
      }
      
      // Se for erro 403, pode ser problema de autenticação
      if (axiosError.response?.status === 403) {
        sendForbidden(res, 'Acesso negado ao repositório. Verifique o GITHUB_TOKEN se o repositório for privado.');
        return;
      }
      
      sendError(res, error, 'Erro ao buscar atualizações do GitHub', 500, true, {
        context: 'AtualizacoesController',
        action: 'get',
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText
      });
    }
  }

  /**
   * Executa o self-update da aplicação com progresso em tempo real via SSE
   * Requer autenticação e permissão de admin
   */
  static async updateStream(req: Request, res: Response): Promise<void> {
    let branch = 'main';

    logger.info('🚀 Iniciando processo de atualização via SSE', {
      method: req.method,
      query: req.query,
      body: req.body,
      user: (req as any).user,
      timestamp: new Date().toISOString()
    });

    try {
      // Verificar se o usuário é admin
      if (!AtualizacoesController.isAdmin(req)) {
        logger.warn('🚫 Acesso negado - usuário não é admin', {
          user: (req as any).user,
          isAdmin: AtualizacoesController.isAdmin(req)
        });

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

      logger.info('✅ Usuário autorizado, iniciando atualização', {
        branch,
        user: (req as any).user
      });

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
        logger.info('🔧 Criando SelfUpdateService');
        updateService = new SelfUpdateService();
        logger.info('✅ SelfUpdateService criado com sucesso');
      } catch (error) {
        logger.error('❌ Erro ao criar SelfUpdateService', {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          stack: error instanceof Error ? error.stack : undefined
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
        logger.info('⚡ Executando atualização via SelfUpdateService', { branch });
        result = await updateService.executeUpdate(branch, sendProgress);
        logger.info('🏁 Processo de atualização concluído', {
          success: result.success,
          message: result.message,
          steps: result.steps
        });
      } catch (error) {
        logger.error('❌ Erro inesperado ao executar atualização', {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          stack: error instanceof Error ? error.stack : undefined,
          branch
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
        if (pm2ReloadResult.success) {
          logger.info('PM2 reload agendado com sucesso');
        } else {
          logger.warn('PM2 reload falhou ou foi apenas agendado', {
            stderr: pm2ReloadResult.stderr,
            error: pm2ReloadResult.error,
          });
        }
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
        error: errorMessage,
        branch,
        usuario: (req as AuthenticatedRequest).user,
      });

      try {
        res.write(`data: ${JSON.stringify({ 
          error: 'Erro interno do servidor durante a atualização',
          details: !__dirname.includes('dist') ? errorMessage : undefined
        })}\n\n`);
        res.end();
      } catch (writeError) {
        logger.error('Erro ao escrever resposta SSE', { error: writeError });
      }
    }
  }

}

