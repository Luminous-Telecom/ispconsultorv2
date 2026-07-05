import { spawn } from 'child_process';
import fs from 'fs';
import { logger } from '../../../utils/logger';
import type { CommandResult } from '../GitUpdateService';

const SCHEDULED_RESTART_DELAY_MS = 5000;

export class Pm2Service {
  private readonly projectRoot: string;
  private readonly pm2ProcessName: string;

  constructor(projectRoot: string, _backendPath: string, pm2ProcessName: string) {
    this.projectRoot = projectRoot;
    this.pm2ProcessName = pm2ProcessName;
  }

  /**
   * Agenda reinício do PM2 em processo filho (o backend atual seria morto por restart direto).
   */
  scheduleRestart(delayMs: number = SCHEDULED_RESTART_DELAY_MS): CommandResult {
    if (!fs.existsSync(this.projectRoot)) {
      const errorMsg = `Diretório não existe: ${this.projectRoot}`;
      logger.error('Erro ao agendar PM2 restart', { error: errorMsg });
      return { success: false, stdout: '', stderr: errorMsg, error: errorMsg };
    }

    const fromEnv = process.env.PM2_RESTART_APPS?.split(',').map((s) => s.trim()).filter(Boolean);
    const apps = (fromEnv?.length ? [...new Set(fromEnv)] : [this.pm2ProcessName]).join(' ');
    const delaySec = Math.max(1, Math.round(delayMs / 1000));
    const script = `sleep ${delaySec} && pm2 restart ${apps} --update-env && pm2 save`;

    spawn('bash', ['-c', script], {
      detached: true,
      stdio: 'ignore',
      cwd: this.projectRoot,
      env: process.env,
    }).unref();

    logger.info('PM2 restart agendado', { delayMs, apps, cwd: this.projectRoot });
    return {
      success: true,
      stdout: `Reinício agendado em ${delayMs}ms`,
      stderr: '',
    };
  }
}
