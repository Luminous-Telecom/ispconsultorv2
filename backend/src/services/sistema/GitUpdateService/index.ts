import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { logger } from '../../../utils/logger';

const execAsync = promisify(exec);

export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  error?: string;
}

export interface GitConfig {
  valid: boolean;
  remote?: string;
  branch?: string;
}

export class GitUpdateService {
  private readonly projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Encontra o diretório raiz do repositório Git
   */
  private findGitRoot(startPath: string): string | null {
    let currentPath = path.resolve(startPath);
    const rootPath = path.parse(currentPath).root;
    const searchedPaths: string[] = [];
    
    logger.info('Iniciando busca por repositório Git', {
      startPath,
      resolvedPath: currentPath,
      rootPath,
    });
    
    if (!fs.existsSync(currentPath)) {
      logger.error('Diretório inicial não existe', { currentPath });
      return null;
    }
    
    while (currentPath !== rootPath) {
      searchedPaths.push(currentPath);
      const gitDir = path.join(currentPath, '.git');
      
      logger.debug('Verificando diretório', {
        currentPath,
        gitDir,
        exists: fs.existsSync(gitDir),
      });
      
      if (fs.existsSync(gitDir)) {
        const gitStat = fs.statSync(gitDir);
        if (gitStat.isDirectory() || gitStat.isFile()) {
          logger.info('Repositório Git encontrado', {
            gitRoot: currentPath,
            gitDir,
            isDirectory: gitStat.isDirectory(),
            isFile: gitStat.isFile(),
            searchedPaths: searchedPaths.length,
          });
          return currentPath;
        }
      }
      
      const parentPath = path.dirname(currentPath);
      if (parentPath === currentPath) {
        break;
      }
      currentPath = parentPath;
    }
    
    searchedPaths.push(rootPath);
    const rootGitDir = path.join(rootPath, '.git');
    if (fs.existsSync(rootGitDir)) {
      logger.info('Repositório Git encontrado na raiz do sistema', { gitRoot: rootPath });
      return rootPath;
    }
    
    logger.error('Repositório Git não encontrado em nenhum diretório pesquisado', {
      startPath,
      searchedPaths,
      totalPaths: searchedPaths.length,
    });
    
    return null;
  }

  /**
   * Verifica configuração do Git
   */
  async checkGitConfig(gitRoot?: string): Promise<GitConfig> {
    const root = gitRoot || this.projectRoot;
    
    try {
      const { stdout: remoteUrl } = await execAsync('git config --get remote.origin.url', {
        cwd: root,
        timeout: 5000,
      });
      
      const { stdout: currentBranch } = await execAsync('git rev-parse --abbrev-ref HEAD', {
        cwd: root,
        timeout: 5000,
      });
      
      return {
        valid: true,
        remote: remoteUrl.trim(),
        branch: currentBranch.trim(),
      };
    } catch (error) {
      logger.error('Erro ao verificar configuração do Git', {
        gitRoot: root,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      return { valid: false };
    }
  }

  /**
   * Encontra o diretório raiz do Git usando git rev-parse
   */
  private async findGitRootWithRevParse(directoriesToTry: string[]): Promise<string | null> {
    for (const dir of directoriesToTry) {
      if (!fs.existsSync(dir)) {
        logger.debug('Diretório não existe, pulando', { dir });
        continue;
      }
      
      try {
        const { stdout: gitTopLevel } = await execAsync('git rev-parse --show-toplevel', {
          cwd: dir,
          timeout: 5000,
        });
        
        if (gitTopLevel && gitTopLevel.trim()) {
          const gitRoot = gitTopLevel.trim();
          logger.info('Repositório Git encontrado usando git rev-parse', {
            gitRoot,
            triedFrom: dir,
          });
          return gitRoot;
        }
      } catch (error) {
        logger.debug('git rev-parse falhou neste diretório', {
          dir,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }
    
    return null;
  }

  /**
   * Executa git pull na branch especificada
   */
  async pull(branch: string = 'main'): Promise<CommandResult> {
    const currentDir = __dirname;
    const directoriesToTry = [
      currentDir,
      this.projectRoot,
    ];
    
    logger.info('Tentando encontrar repositório Git usando git rev-parse', {
      directoriesToTry,
      currentDir,
      projectRoot: this.projectRoot,
    });
    
    let gitRoot: string | null = await this.findGitRootWithRevParse(directoriesToTry);
    
    if (!gitRoot) {
      const gitDir = path.join(this.projectRoot, '.git');
      
      if (fs.existsSync(gitDir)) {
        gitRoot = this.projectRoot;
        logger.info('Repositório Git encontrado no projectRoot', { gitRoot });
      } else {
        logger.warn('Diretório .git não encontrado no projectRoot, procurando em diretórios pais', {
          projectRoot: this.projectRoot,
          gitDir,
        });
        
        const foundGitRoot = this.findGitRoot(this.projectRoot);
        if (foundGitRoot) {
          gitRoot = foundGitRoot;
          logger.info('Repositório Git encontrado em diretório pai', { gitRoot });
        } else {
          logger.error('Diretório .git não encontrado', {
            projectRoot: this.projectRoot,
            searchedFrom: this.projectRoot,
          });
          return {
            success: false,
            stdout: '',
            stderr: `Diretório .git não encontrado. Procurado em ${this.projectRoot} e diretórios pais. Certifique-se de que o repositório Git está configurado corretamente em produção.`,
            error: 'Repositório Git não encontrado',
          };
        }
      }
    }
    
    if (!gitRoot) {
      logger.error('Não foi possível determinar o diretório raiz do Git', {
        projectRoot: this.projectRoot,
      });
      return {
        success: false,
        stdout: '',
        stderr: 'Não foi possível determinar o diretório raiz do repositório Git.',
        error: 'Repositório Git não encontrado',
      };
    }

    const gitConfig = await this.checkGitConfig(gitRoot);
    if (!gitConfig.valid) {
      logger.error('Configuração do Git inválida', { gitRoot });
      return {
        success: false,
        stdout: '',
        stderr: 'Configuração do Git inválida. Verifique se o repositório está configurado corretamente.',
        error: 'Configuração do Git inválida',
      };
    }

    logger.info('Configuração do Git verificada', {
      gitRoot,
      remote: gitConfig.remote,
      currentBranch: gitConfig.branch,
      targetBranch: branch,
    });

    logger.info('Executando git fetch antes do pull');
    const fetchResult = await this.executeCommand('git fetch origin', gitRoot, 'Git Fetch');
    
    if (!fetchResult.success) {
      logger.warn('Git fetch falhou, mas continuando com pull', {
        error: fetchResult.error || fetchResult.stderr,
      });
    }

    const command = `git pull origin ${branch} --no-rebase`;
    const pullResult = await this.executeCommand(command, gitRoot, 'Git Pull');
    
    if (!pullResult.success) {
      try {
        const { stdout: status } = await execAsync('git status --porcelain', {
          cwd: gitRoot,
          timeout: 5000,
        });
        
        if (status.trim()) {
          logger.warn('Há mudanças locais não commitadas', { status: status.trim() });
          logger.info('Tentando fazer stash das mudanças locais');
          await execAsync('git stash', { cwd: gitRoot, timeout: 10000 });
          const pullAfterStash = await this.executeCommand(command, gitRoot, 'Git Pull (após stash)');
          if (pullAfterStash.success) {
            logger.info('Git pull bem-sucedido após stash');
            return pullAfterStash;
          }
        }
      } catch (error) {
        logger.error('Erro ao verificar status do Git', {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }
    
    return pullResult;
  }

  /**
   * Executa um comando shell de forma segura
   */
  private async executeCommand(
    command: string,
    cwd: string,
    description: string
  ): Promise<CommandResult> {
    try {
      if (!fs.existsSync(cwd)) {
        const errorMsg = `Diretório não existe: ${cwd}`;
        logger.error(`Erro ao executar: ${description}`, { error: errorMsg });
        return {
          success: false,
          stdout: '',
          stderr: errorMsg,
          error: errorMsg,
        };
      }

      logger.info(`Executando: ${description}`, { command, cwd });

      const { stdout, stderr } = await execAsync(command, {
        cwd,
        maxBuffer: 10 * 1024 * 1024,
        env: {
          ...process.env,
          NODE_ENV: __dirname.includes('dist') ? 'production' : 'development',
        },
      });

      logger.info(`${description} concluído`, {
        stdoutLength: stdout.length,
        stderrLength: stderr.length,
      });

      return {
        success: true,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorOutput = error as { stdout?: string; stderr?: string; code?: number };

      const stderrPreview = errorOutput.stderr?.substring(0, 2000) || '';
      const stdoutPreview = errorOutput.stdout?.substring(0, 2000) || '';
      
      logger.error(`Erro ao executar: ${description}`, {
        error: errorMessage,
        code: errorOutput.code,
        command,
        cwd,
        stdoutLength: errorOutput.stdout?.length || 0,
        stderrLength: errorOutput.stderr?.length || 0,
        stdout: stdoutPreview,
        stderr: stderrPreview,
      });

      return {
        success: false,
        stdout: errorOutput.stdout?.trim() || '',
        stderr: errorOutput.stderr?.trim() || '',
        error: errorMessage,
      };
    }
  }
}
