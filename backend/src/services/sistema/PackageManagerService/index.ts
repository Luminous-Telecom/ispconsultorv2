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

  /**
   * Instala dependências npm (inclui devDependencies: ts-node/typescript são necessários para `npm run build` no self-update em servidor com NODE_ENV=production).
   */
  async install(): Promise<CommandResult> {
    const command = 'npm install --include=dev';
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
        logger.info('Versão limpa no package.json', { oldVersion, newVersion: baseVersion });
        return { success: true, stdout: `Versão atualizada: ${baseVersion}`, stderr: '' };
      } else {
        return { success: true, stdout: `Versão já está em formato SemVer: ${baseVersion}`, stderr: '' };
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
