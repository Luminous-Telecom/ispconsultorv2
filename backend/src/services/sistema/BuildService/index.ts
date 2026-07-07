import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../../../utils/logger';
import type { CommandResult } from '../GitUpdateService';

const execAsync = promisify(exec);

const MAX_BUFFER = 50 * 1024 * 1024;

const backendBuildScriptPath = (root: string) =>
  path.join(root, 'backend', 'src', 'scripts', 'build.ts');

const frontendSourcePath = (root: string) => path.join(root, 'frontend', 'src');

/**
 * Self-update no servidor após `git pull`.
 * Em produção (ispconsultor) usa backend/dist e frontend/build do CI quando não há fonte local.
 */
export class BuildService {
  private readonly projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  private buildEnv(): NodeJS.ProcessEnv {
    return {
      ...process.env,
      NPM_CONFIG_PRODUCTION: 'false',
      GENERATE_SOURCEMAP: 'false',
      NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=4096',
    };
  }

  async build(): Promise<CommandResult> {
    const env = this.buildEnv();

    const backendPkg = path.join(this.projectRoot, 'backend', 'package.json');
    if (!fs.existsSync(backendPkg)) {
      const msg = 'backend/package.json não encontrado';
      logger.error(msg, { projectRoot: this.projectRoot });
      return { success: false, stdout: '', stderr: msg, error: msg };
    }

    const parts: string[] = [];

    try {
      if (fs.existsSync(backendBuildScriptPath(this.projectRoot))) {
        logger.info('Self-update: compilando backend');
        await execAsync('npm run build --prefix backend', { cwd: this.projectRoot, maxBuffer: MAX_BUFFER, env });
        parts.push('backend compilado');
      } else {
        logger.info('Self-update: usando backend/dist do repositório (sem recompilar)');
        const distIndex = path.join(this.projectRoot, 'backend', 'dist', 'index.js');
        if (!fs.existsSync(distIndex)) {
          const msg = 'backend/dist/index.js não encontrado após pull; não é possível pular o build sem fonte.';
          return { success: false, stdout: '', stderr: msg, error: msg };
        }
        parts.push('backend dist do repositório (sem recompilar)');
      }

      const frontendPkg = path.join(this.projectRoot, 'frontend', 'package.json');
      const hasFrontendSource =
        fs.existsSync(frontendPkg) && fs.existsSync(frontendSourcePath(this.projectRoot));

      if (hasFrontendSource) {
        logger.info('Self-update: compilando frontend');
        await execAsync('npm ci --prefix frontend', { cwd: this.projectRoot, maxBuffer: MAX_BUFFER, env });
        await execAsync('npm run build --prefix frontend', { cwd: this.projectRoot, maxBuffer: MAX_BUFFER, env });
        const indexHtml = path.join(this.projectRoot, 'frontend', 'build', 'index.html');
        if (!fs.existsSync(indexHtml)) {
          const msg = 'frontend/build/index.html não foi gerado';
          return { success: false, stdout: '', stderr: msg, error: msg };
        }
        parts.push('frontend compilado');
      } else {
        const indexHtml = path.join(this.projectRoot, 'frontend', 'build', 'index.html');
        if (fs.existsSync(indexHtml)) {
          logger.info('Self-update: usando frontend/build do repositório (sem recompilar)');
          parts.push('frontend build do repositório (sem recompilar)');
        } else if (fs.existsSync(frontendPkg)) {
          logger.warn('Self-update: frontend/package.json existe mas sem src e sem build/index.html');
        }
      }

      return {
        success: true,
        stdout: parts.length ? parts.join('; ') : 'Nenhum build local necessário',
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

  private docDistIndexPath(): string {
    return path.join(this.projectRoot, 'doc', '.vitepress', 'dist', 'index.html');
  }

  private hasDocSource(): boolean {
    return fs.existsSync(path.join(this.projectRoot, 'doc', '.vitepress', 'config.mjs'));
  }

  /** Compila a wiki quando há fonte local; em produção usa dist já versionada após git pull. */
  async buildDoc(): Promise<CommandResult> {
    const distIndex = this.docDistIndexPath();

    if (!this.hasDocSource()) {
      if (fs.existsSync(distIndex)) {
        return {
          success: true,
          stdout: 'Wiki: usando doc/.vitepress/dist do repositório (sem recompilar)',
          stderr: '',
        };
      }
      const msg = 'doc/.vitepress/dist/index.html não encontrado após pull';
      return { success: false, stdout: '', stderr: msg, error: msg };
    }

    const docPkg = path.join(this.projectRoot, 'doc', 'package.json');
    if (!fs.existsSync(docPkg)) {
      const msg = 'doc/package.json não encontrado (fonte da wiki incompleta)';
      return { success: false, stdout: '', stderr: msg, error: msg };
    }

    const env = this.buildEnv();
    try {
      logger.info('Doc update: compilando wiki (VitePress)');
      await execAsync('npm ci --prefix doc', { cwd: this.projectRoot, maxBuffer: MAX_BUFFER, env });
      await execAsync('npm run build --prefix doc', { cwd: this.projectRoot, maxBuffer: MAX_BUFFER, env });
      if (!fs.existsSync(distIndex)) {
        const msg = 'doc/.vitepress/dist/index.html não foi gerado';
        return { success: false, stdout: '', stderr: msg, error: msg };
      }
      return { success: true, stdout: 'Wiki compilada', stderr: '' };
    } catch (error) {
      const err = error as { stdout?: string; stderr?: string; message?: string };
      logger.error('Doc update: build da wiki falhou', {
        message: err.message,
        stderrPreview: err.stderr?.slice(0, 2000),
      });
      return {
        success: false,
        stdout: (err.stdout || '').trim(),
        stderr: (err.stderr || err.message || '').trim(),
        error: err.message || 'Build da wiki falhou',
      };
    }
  }
}
