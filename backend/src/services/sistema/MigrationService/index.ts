import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import { logger } from '../../../utils/logger';
import type { CommandResult } from '../GitUpdateService';

const execAsync = promisify(exec);

export class MigrationService {
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
   * Executa as migrations do banco de dados
   */
  async migrate(): Promise<CommandResult> {
    const command = 'npm run migrate';
    return this.executeCommand(command, this.backendPath, 'Migrations');
  }
}
