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

    if (!fs.existsSync(currentPath)) {
      logger.error('Diretório inicial não existe', { currentPath });
      return null;
    }

    while (currentPath !== rootPath) {
      const gitDir = path.join(currentPath, '.git');
      if (fs.existsSync(gitDir)) {
        const gitStat = fs.statSync(gitDir);
        if (gitStat.isDirectory() || gitStat.isFile()) return currentPath;
      }
      const parentPath = path.dirname(currentPath);
      if (parentPath === currentPath) break;
      currentPath = parentPath;
    }

    const rootGitDir = path.join(rootPath, '.git');
    if (fs.existsSync(rootGitDir)) return rootPath;

    logger.error('Repositório Git não encontrado', { startPath });
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
      if (!fs.existsSync(dir)) continue;
      try {
        const { stdout } = await execAsync('git rev-parse --show-toplevel', { cwd: dir, timeout: 5000 });
        if (stdout?.trim()) return stdout.trim();
      } catch { /* diretório não é um repositório git */ }
    }
    return null;
  }

  /**
   * Executa git pull na branch especificada
   */
  async pull(branch = 'main'): Promise<CommandResult> {
    let gitRoot: string | null = await this.findGitRootWithRevParse([__dirname, this.projectRoot]);

    if (!gitRoot) {
      if (fs.existsSync(path.join(this.projectRoot, '.git'))) {
        gitRoot = this.projectRoot;
      } else {
        gitRoot = this.findGitRoot(this.projectRoot);
        if (!gitRoot) {
          logger.error('Repositório Git não encontrado', { projectRoot: this.projectRoot });
          return {
            success: false,
            stdout: '',
            stderr: `Diretório .git não encontrado em ${this.projectRoot}. Certifique-se de que o repositório Git está configurado corretamente em produção.`,
            error: 'Repositório Git não encontrado',
          };
        }
      }
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

    const fetchResult = await this.executeCommand('git fetch origin', gitRoot, 'Git Fetch');
    if (!fetchResult.success) {
      logger.warn('Git fetch falhou, continuando com pull', { error: fetchResult.error || fetchResult.stderr });
    }

    const command = `git pull origin ${branch} --no-rebase`;
    const pullResult = await this.executeCommand(command, gitRoot, 'Git Pull');

    if (!pullResult.success) {
      try {
        const { stdout: status } = await execAsync('git status --porcelain', { cwd: gitRoot, timeout: 5000 });
        if (status.trim()) {
          logger.warn('Mudanças locais encontradas, executando stash', { status: status.trim() });
          await execAsync('git stash', { cwd: gitRoot, timeout: 10000 });
          const pullAfterStash = await this.executeCommand(command, gitRoot, 'Git Pull (após stash)');
          if (pullAfterStash.success) return pullAfterStash;
        }
      } catch (error) {
        logger.error('Erro ao verificar status do Git', { error: error instanceof Error ? error.message : 'Erro desconhecido' });
      }
    }

    return pullResult;
  }

  /**
   * Executa um comando shell de forma segura
   */
  private async executeCommand(command: string, cwd: string, description: string): Promise<CommandResult> {
    try {
      if (!fs.existsSync(cwd)) {
        const errorMsg = `Diretório não existe: ${cwd}`;
        logger.error(`Erro ao executar: ${description}`, { error: errorMsg });
        return { success: false, stdout: '', stderr: errorMsg, error: errorMsg };
      }

      const { stdout, stderr } = await execAsync(command, {
        cwd,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, NODE_ENV: __dirname.includes('dist') ? 'production' : 'development' },
      });

      return { success: true, stdout: stdout.trim(), stderr: stderr.trim() };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorOutput = error as { stdout?: string; stderr?: string; code?: number };
      logger.error(`Erro ao executar: ${description}`, {
        error: errorMessage,
        code: errorOutput.code,
        stderr: errorOutput.stderr?.substring(0, 2000) || '',
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
