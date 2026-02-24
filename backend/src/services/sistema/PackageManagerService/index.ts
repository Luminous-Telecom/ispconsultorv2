import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { logger } from '../../../utils/logger';
import type { CommandResult } from '../GitUpdateService';

const execAsync = promisify(exec);

export class PackageManagerService {
  private readonly backendPath: string;

  constructor(backendPath: string) {
    this.backendPath = backendPath;
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

      logger.debug(`Executando: ${description}`, { command, cwd });

      const { stdout, stderr } = await execAsync(command, {
        cwd,
        maxBuffer: 10 * 1024 * 1024,
        env: {
          ...process.env,
          NODE_ENV: __dirname.includes('dist') ? 'production' : 'development',
        },
      });

      logger.debug(`${description} concluído`, {
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

  /**
   * Instala dependências npm
   */
  async install(): Promise<CommandResult> {
    const command = 'npm install';
    return this.executeCommand(command, this.backendPath, 'NPM Install');
  }

  /**
   * Limpa a versão no package.json removendo commit hash (mantém apenas SemVer)
   */
  async updateVersion(): Promise<CommandResult> {
    try {
      const packageJsonPath = path.join(this.backendPath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        logger.warn('package.json não encontrado para atualizar versão');
        return {
          success: true,
          stdout: 'package.json não encontrado, versão não atualizada',
          stderr: '',
        };
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const oldVersion = packageJson.version;
      
      const baseVersion = packageJson.version.split('-')[0];
      
      const semverPattern = /^\d+\.\d+\.\d+$/;
      if (!semverPattern.test(baseVersion)) {
        logger.warn('Versão no package.json não segue formato SemVer', {
          version: baseVersion,
        });
        return {
          success: true,
          stdout: `Versão não segue SemVer (${baseVersion}), mantendo como está`,
          stderr: '',
        };
      }

      if (packageJson.version !== baseVersion) {
        packageJson.version = baseVersion;
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
        logger.info('Versão limpa no package.json (SemVer sem hash)', {
          oldVersion,
          newVersion: baseVersion,
        });
        return {
          success: true,
          stdout: `Versão atualizada para SemVer: ${baseVersion}`,
          stderr: '',
        };
      } else {
        logger.debug('Versão já está em formato SemVer', { version: baseVersion });
        return {
          success: true,
          stdout: `Versão já está em formato SemVer: ${baseVersion}`,
          stderr: '',
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.warn('Erro ao atualizar versão no package.json', {
        error: errorMessage,
      });
      return {
        success: true,
        stdout: 'Erro ao atualizar versão, mas processo continua',
        stderr: errorMessage,
      };
    }
  }
}
