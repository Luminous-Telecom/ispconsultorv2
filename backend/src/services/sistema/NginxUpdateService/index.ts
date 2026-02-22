import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../../../utils/logger';
import { type CommandResult } from '../GitUpdateService';

const execAsync = promisify(exec);

const NGINX_CONF_DEST = '/etc/nginx/sites-available/default';
const VERSION_COMMENT_REGEX = /^#\s*nginx-version:\s*(\d+)/m;

export class NginxUpdateService {
  private readonly nginxConfSource: string;

  constructor(projectRoot: string) {
    this.nginxConfSource = path.join(projectRoot, 'nginx', 'nginx.conf');
  }

  private extractVersion(content: string): number | null {
    const match = content.match(VERSION_COMMENT_REGEX);
    return match ? parseInt(match[1], 10) : null;
  }

  async check(): Promise<{ needsUpdate: boolean; sourceVersion: number | null; installedVersion: number | null }> {
    if (!fs.existsSync(this.nginxConfSource)) {
      return { needsUpdate: false, sourceVersion: null, installedVersion: null };
    }

    const sourceContent = fs.readFileSync(this.nginxConfSource, 'utf-8');
    const sourceVersion = this.extractVersion(sourceContent);

    if (!fs.existsSync(NGINX_CONF_DEST)) {
      return { needsUpdate: true, sourceVersion, installedVersion: null };
    }

    const installedContent = fs.readFileSync(NGINX_CONF_DEST, 'utf-8');
    const installedVersion = this.extractVersion(installedContent);

    const needsUpdate = sourceVersion !== null && (installedVersion === null || sourceVersion > installedVersion);

    return { needsUpdate, sourceVersion, installedVersion };
  }

  async apply(): Promise<CommandResult> {
    if (process.env.NGINX_UPDATE_ENABLED !== 'true') {
      return {
        success: true,
        stdout: 'Atualização do Nginx desabilitada (NGINX_UPDATE_ENABLED != true)',
        stderr: '',
      };
    }

    try {
      const { needsUpdate, sourceVersion, installedVersion } = await this.check();

      if (!needsUpdate) {
        return {
          success: true,
          stdout: `Nginx já está na versão ${installedVersion ?? 'desconhecida'}`,
          stderr: '',
        };
      }

      logger.info('Aplicando nova configuração do Nginx', { sourceVersion, installedVersion });

      fs.copyFileSync(this.nginxConfSource, NGINX_CONF_DEST);

      const { stdout: testOut, stderr: testErr } = await execAsync('nginx -t', { timeout: 10000 });

      if (testErr && testErr.includes('emerg')) {
        fs.copyFileSync(`${NGINX_CONF_DEST}.bak`, NGINX_CONF_DEST);
        return {
          success: false,
          stdout: testOut,
          stderr: testErr,
          error: 'Configuração inválida — rollback aplicado',
        };
      }

      await execAsync('nginx -s reload', { timeout: 10000 });

      logger.info('Nginx atualizado e recarregado com sucesso', { sourceVersion });

      return {
        success: true,
        stdout: `Nginx atualizado da versão ${installedVersion ?? 'desconhecida'} para ${sourceVersion}`,
        stderr: testErr || '',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao atualizar configuração do Nginx', { error: message });
      return {
        success: false,
        stdout: '',
        stderr: message,
        error: message,
      };
    }
  }
}
