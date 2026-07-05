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

const docDistIndexPath = (root: string) =>
  path.join(root, 'doc', '.vitepress', 'dist', 'index.html');

/**
 * Self-update no servidor após `git pull`.
 *
 * Em **ispconsultor** (repo de produção) não há `backend/src` nem `frontend/src` — só `dist` e `build/`
 * commitados pelo CI. Aí não roda `tsc`/CRA no servidor: o pull já trouxe os artefatos.
 *
 * A wiki segue o mesmo padrão: `doc/.vitepress/dist/` vem buildado pelo GitHub Actions;
 * no servidor só valida o dist e reinicia o PM2 (botão Atualizar documentação no ERP).
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

  /** Valida `doc/.vitepress/dist` já buildado pelo GitHub Actions (não recompila no servidor). */
  async buildDoc(): Promise<CommandResult> {
    const docPkg = path.join(this.projectRoot, 'doc', 'package.json');
    if (!fs.existsSync(docPkg)) {
      const msg = 'doc/package.json não encontrado';
      logger.error(msg, { projectRoot: this.projectRoot });
      return { success: false, stdout: '', stderr: msg, error: msg };
    }

    const distIndex = docDistIndexPath(this.projectRoot);
    const docDir = path.join(this.projectRoot, 'doc');

    if (!fs.existsSync(distIndex)) {
      const msg =
        'doc/.vitepress/dist/index.html não encontrado após git pull. O deploy do GitHub Actions deve incluir a wiki buildada.';
      logger.error(msg, { projectRoot: this.projectRoot });
      return { success: false, stdout: '', stderr: msg, error: msg };
    }

    try {
      await execAsync('bash scripts/verify-dist.sh', {
        cwd: docDir,
        maxBuffer: MAX_BUFFER,
      });
      logger.info('Self-update: doc/.vitepress/dist do repositório (CI) validado');
      return {
        success: true,
        stdout: 'wiki (doc) dist do repositório (CI)',
        stderr: '',
      };
    } catch (error) {
      const err = error as { stdout?: string; stderr?: string; message?: string };
      const msg =
        'doc/.vitepress/dist inválido ou incompleto. Aguarde novo deploy do GitHub Actions com a wiki buildada.';
      logger.error('Self-update: dist da wiki inválido', {
        message: err.message,
        stderrPreview: err.stderr?.slice(0, 2000),
      });
      return {
        success: false,
        stdout: (err.stdout || '').trim(),
        stderr: (err.stderr || msg).trim(),
        error: msg,
      };
    }
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

      const docBuild = await this.buildDoc();
      if (fs.existsSync(path.join(this.projectRoot, 'doc', 'package.json'))) {
        if (!docBuild.success) {
          return docBuild;
        }
        parts.push(docBuild.stdout || 'wiki (doc) dist do repositório (CI)');
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
}
