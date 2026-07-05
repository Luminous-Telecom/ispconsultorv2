import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { logger } from '../../../utils/logger';
import type { CommandResult } from '../GitUpdateService';

const execAsync = promisify(exec);

/** Delay em ms antes de executar pm2 restart no processo filho (permite enviar resposta SSE antes do kill). */
const SCHEDULED_RESTART_DELAY_MS = 5000;

export class Pm2Service {
  private readonly projectRoot: string;
  private readonly backendPath: string;
  private readonly pm2ProcessName: string;

  constructor(projectRoot: string, backendPath: string, pm2ProcessName: string) {
    this.projectRoot = projectRoot;
    this.backendPath = backendPath;
    this.pm2ProcessName = pm2ProcessName;
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
   * Verifica se o processo PM2 existe
   */
  async checkProcess(): Promise<{ exists: boolean; processInfo?: string }> {
    try {
      const { stdout } = await execAsync(`pm2 list`, {
        cwd: this.projectRoot,
        maxBuffer: 1024 * 1024,
      });
      
      const processExists = stdout.includes(this.pm2ProcessName);
      
      return {
        exists: processExists,
        processInfo: processExists ? stdout : undefined,
      };
    } catch (error) {
      logger.error('Erro ao verificar processos PM2', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      return { exists: false };
    }
  }

  /**
   * Apps PM2 a reiniciar após self-update.
   * Por padrão: backend + doc (quando a wiki existe no projeto).
   * Override: PM2_RESTART_APPS=backend,doc,frontend
   */
  private getRestartApps(): string[] {
    const fromEnv = process.env.PM2_RESTART_APPS?.split(',').map((s) => s.trim()).filter(Boolean);
    if (fromEnv?.length) {
      return [...new Set(fromEnv)];
    }

    const apps = [this.pm2ProcessName];
    if (fs.existsSync(path.join(this.projectRoot, 'doc', 'package.json'))) {
      apps.push('doc');
    }
    return [...new Set(apps)];
  }

  /**
   * Reinicia o processo no PM2
   */
  async reload(): Promise<CommandResult> {
    const processCheck = await this.checkProcess();

    if (!processCheck.exists) {
      logger.warn('Processo PM2 não encontrado, tentando restart', { processName: this.pm2ProcessName });

      const restartResult = await this.executeCommand(`pm2 restart ${this.pm2ProcessName} --update-env`, this.projectRoot, 'PM2 Restart');
      if (!restartResult.success) {
        const ecosystemPath = path.join(this.projectRoot, 'ecosystem.config.js');
        if (!fs.existsSync(ecosystemPath)) {
          logger.error('ecosystem.config.js não encontrado', { path: ecosystemPath });
          return { success: false, stdout: '', stderr: `ecosystem.config.js não encontrado em ${ecosystemPath}.`, error: 'ecosystem.config.js não encontrado' };
        }

        const startResult = await this.executeCommand(`pm2 start ecosystem.config.js --only ${this.pm2ProcessName} --update-env`, this.projectRoot, 'PM2 Start');
        if (!startResult.success) {
          const startAllResult = await this.executeCommand('pm2 start ecosystem.config.js --update-env', this.projectRoot, 'PM2 Start (todos)');
          if (!startAllResult.success) {
            const directStartCommand = `pm2 start ${path.join(this.backendPath, 'dist', 'index.js')} --name ${this.pm2ProcessName} --cwd ${this.backendPath} --update-env`;
            return this.executeCommand(directStartCommand, this.projectRoot, 'PM2 Start (direto)');
          }
          return startAllResult;
        }
        return startResult;
      }
      return restartResult;
    }

    const restartResult = await this.executeCommand(`pm2 restart ${this.pm2ProcessName} --update-env`, this.projectRoot, 'PM2 Restart');
    if (!restartResult.success) {
      logger.warn('PM2 restart falhou, tentando reload como fallback');
      return this.executeCommand(`pm2 reload ${this.pm2ProcessName}`, this.projectRoot, 'PM2 Reload (fallback)');
    }
    return restartResult;
  }

  /**
   * Agenda reinício do PM2 em um processo filho desvinculado.
   * Usado durante self-update: o processo atual seria morto por "pm2 restart",
   * então o restart é executado por um filho que espera alguns segundos (tempo
   * para enviar a resposta SSE "finalizado" ao frontend).
   */
  scheduleRestart(delayMs: number = SCHEDULED_RESTART_DELAY_MS): CommandResult {
    if (!fs.existsSync(this.projectRoot)) {
      const errorMsg = `Diretório não existe: ${this.projectRoot}`;
      logger.error('Erro ao agendar PM2 restart', { error: errorMsg });
      return { success: false, stdout: '', stderr: errorMsg, error: errorMsg };
    }

    // Por padrão backend + doc (wiki). Front costuma ser Nginx servindo frontend/build em disco.
    // Override: PM2_RESTART_APPS=backend,doc,frontend
    const apps = this.getRestartApps();
    const appsJson = JSON.stringify(apps);

    const script = `
const { execFileSync } = require('child_process');
const d = parseInt(process.env.PM2_DELAY || '5000', 10);
const cwd = process.env.PM2_CWD || '.';
const apps = ${appsJson};
setTimeout(() => {
  let ok = false;
  for (const app of apps) {
    try {
      execFileSync('pm2', ['restart', app, '--update-env'], { cwd, stdio: 'inherit', maxBuffer: 10 * 1024 * 1024 });
      ok = true;
    } catch (e) {
      console.error('pm2 restart', app, e && e.message);
      try {
        execFileSync('pm2', ['start', 'ecosystem.config.js', '--only', app, '--update-env'], { cwd, stdio: 'inherit', maxBuffer: 10 * 1024 * 1024 });
        ok = true;
      } catch (e2) {
        console.error('pm2 start', app, e2 && e2.message);
      }
    }
  }
  if (ok) {
    try {
      execFileSync('pm2', ['save'], { cwd, stdio: 'inherit', maxBuffer: 10 * 1024 * 1024 });
    } catch (e) {
      console.error('pm2 save', e && e.message);
    }
  }
  if (!ok) process.exit(1);
}, d);
`;
    const child = spawn(process.execPath, ['-e', script.trim()], {
      detached: true,
      stdio: 'ignore',
      env: {
        ...process.env,
        PM2_DELAY: String(delayMs),
        PM2_CWD: this.projectRoot,
      },
    });
    child.unref();

    logger.info('PM2 restart agendado em processo filho', {
      delayMs,
      apps,
      cwd: this.projectRoot,
    });
    return {
      success: true,
      stdout: `Reinício agendado em ${delayMs}ms`,
      stderr: '',
    };
  }
}
