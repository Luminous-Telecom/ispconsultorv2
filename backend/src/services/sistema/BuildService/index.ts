import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../../../utils/logger';
import type { CommandResult } from '../GitUpdateService';

const execAsync = promisify(exec);

const MAX_BUFFER = 50 * 1024 * 1024;

/**
 * Build usado no self-update (git pull no servidor): recompila backend e frontend
 * para que a UI deixe de ficar presa em `frontend/build` antigo.
 */
export class BuildService {
  private readonly projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  async build(): Promise<CommandResult> {
    const env = {
      ...process.env,
      NODE_ENV: 'production',
      GENERATE_SOURCEMAP: 'false',
      NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=4096',
    };

    const backendPkg = path.join(this.projectRoot, 'backend', 'package.json');
    if (!fs.existsSync(backendPkg)) {
      const msg = 'backend/package.json não encontrado';
      logger.error(msg, { projectRoot: this.projectRoot });
      return { success: false, stdout: '', stderr: msg, error: msg };
    }

    try {
      logger.info('Self-update: build backend');
      const be = await execAsync('npm run build --prefix backend', {
        cwd: this.projectRoot,
        maxBuffer: MAX_BUFFER,
        env,
      });
      logger.debug('Build backend stdout length', { n: be.stdout?.length ?? 0 });

      const frontendPkg = path.join(this.projectRoot, 'frontend', 'package.json');
      if (fs.existsSync(frontendPkg)) {
        logger.info('Self-update: npm ci + build frontend');
        await execAsync('npm ci --prefix frontend', {
          cwd: this.projectRoot,
          maxBuffer: MAX_BUFFER,
          env,
        });
        await execAsync('npm run build --prefix frontend', {
          cwd: this.projectRoot,
          maxBuffer: MAX_BUFFER,
          env,
        });
        const indexHtml = path.join(this.projectRoot, 'frontend', 'build', 'index.html');
        if (!fs.existsSync(indexHtml)) {
          const msg = 'frontend/build/index.html não foi gerado';
          return { success: false, stdout: '', stderr: msg, error: msg };
        }
      } else {
        logger.warn('Self-update: pasta frontend ausente, apenas backend foi buildado');
      }

      return {
        success: true,
        stdout: 'Build backend' + (fs.existsSync(frontendPkg) ? ' + frontend concluído' : ' concluído'),
        stderr: '',
      };
    } catch (error) {
      const err = error as { stdout?: string; stderr?: string; message?: string };
      logger.error('Self-update: build falhou', {
        message: err.message,
        stderrPreview: err.stderr?.slice(0, 2000),
      });
      return {
        success: false,
        stdout: (err.stdout || '').trim(),
        stderr: (err.stderr || err.message || '').trim(),
        error: err.message || 'Build falhou',
      };
    }
  }
}
