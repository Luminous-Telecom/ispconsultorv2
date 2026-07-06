import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../../../utils/logger';
import { GitUpdateService, type CommandResult } from '../GitUpdateService';
import { BuildService } from '../BuildService';
import { Pm2Service } from '../Pm2Service';

const execAsync = promisify(exec);

export interface DocUpdateResult {
  success: boolean;
  message: string;
  steps: {
    gitPull: CommandResult;
    buildDoc: CommandResult;
    pm2Reload?: CommandResult;
  };
}

/**
 * Atualização somente da wiki: git pull → build doc (se houver fonte) → PM2 restart doc.
 */
export class DocUpdateService {
  private readonly projectRoot: string;
  private readonly backendPath: string;
  private readonly pm2ProcessName: string;
  private readonly gitUpdateService: GitUpdateService;
  private readonly buildService: BuildService;
  private readonly pm2Service: Pm2Service;

  constructor() {
    const currentDir = __dirname;
    const gitRoot = this.findPathWith(currentDir, '.git');

    if (gitRoot) {
      this.projectRoot = gitRoot;
    } else {
      this.projectRoot = path.resolve(currentDir, '../../..');
      logger.error('CRÍTICO: Não foi possível encontrar a pasta .git automaticamente.');
    }

    const backendRoot = this.findPathWith(currentDir, 'package.json');
    this.backendPath = backendRoot || path.resolve(this.projectRoot, 'backend');
    this.pm2ProcessName = process.env.PM2_PROCESS_NAME || 'backend';

    this.gitUpdateService = new GitUpdateService(this.projectRoot);
    this.buildService = new BuildService(this.projectRoot);
    this.pm2Service = new Pm2Service(this.projectRoot, this.backendPath, this.pm2ProcessName);
  }

  private findPathWith(startPath: string, targetItem: string): string | null {
    let currentPath = startPath;
    const rootPath = path.parse(startPath).root;

    while (currentPath !== rootPath) {
      const targetPath = path.join(currentPath, targetItem);
      if (fs.existsSync(targetPath)) {
        return currentPath;
      }
      currentPath = path.dirname(currentPath);
    }

    if (fs.existsSync(path.join(rootPath, targetItem))) {
      return rootPath;
    }

    return null;
  }

  private async verifyCommands(): Promise<{ success: boolean; missing: string[] }> {
    const commands = ['git', 'npm', 'pm2'];
    const missing: string[] = [];

    for (const cmd of commands) {
      try {
        await execAsync(`which ${cmd}`, { timeout: 5000 });
      } catch {
        missing.push(cmd);
      }
    }

    if (missing.length > 0) {
      logger.error('Comandos necessários não encontrados para atualização da wiki', { missing });
    }

    return { success: missing.length === 0, missing };
  }

  async executeDocUpdate(
    branch = 'main',
    onProgress?: (progress: { step: string; progress: number; message: string; logs?: string[] }) => void
  ): Promise<DocUpdateResult> {
    const commandCheck = await this.verifyCommands();
    if (!commandCheck.success) {
      onProgress?.({
        step: 'verificacao',
        progress: 0,
        message: `Comandos necessários não encontrados: ${commandCheck.missing.join(', ')}`,
        logs: [`✗ Comandos faltando: ${commandCheck.missing.join(', ')}`],
      });
      return {
        success: false,
        message: `Comandos necessários não encontrados: ${commandCheck.missing.join(', ')}`,
        steps: {
          gitPull: { success: false, stdout: '', stderr: `Comandos faltando: ${commandCheck.missing.join(', ')}` },
          buildDoc: { success: false, stdout: '', stderr: '' },
        },
      };
    }

    onProgress?.({
      step: 'iniciando',
      progress: 0,
      message: 'Iniciando atualização da documentação...',
      logs: ['Iniciando atualização da wiki...'],
    });

    const steps = {
      gitPull: { success: false, stdout: '', stderr: '' } as CommandResult,
      buildDoc: { success: false, stdout: '', stderr: '' } as CommandResult,
    };

    onProgress?.({
      step: 'gitPull',
      progress: 15,
      message: 'Baixando alterações da wiki no repositório...',
      logs: ['→ Executando git pull...'],
    });
    steps.gitPull = await this.gitUpdateService.pull(branch);
    if (!steps.gitPull.success) {
      onProgress?.({
        step: 'gitPull',
        progress: 15,
        message: `Falha ao executar git pull: ${steps.gitPull.error || steps.gitPull.stderr}`,
        logs: [`✗ Git Pull falhou: ${steps.gitPull.error || steps.gitPull.stderr}`],
      });
      return {
        success: false,
        message: `Falha ao executar git pull: ${steps.gitPull.error || steps.gitPull.stderr}`,
        steps,
      };
    }
    onProgress?.({
      step: 'gitPull',
      progress: 35,
      message: 'Git pull concluído',
      logs: ['✓ Git Pull concluído'],
    });

    onProgress?.({
      step: 'buildDoc',
      progress: 50,
      message: 'Preparando wiki (build quando necessário)...',
      logs: ['→ Verificando doc/.vitepress/dist...'],
    });
    steps.buildDoc = await this.buildService.buildDoc();
    if (!steps.buildDoc.success) {
      onProgress?.({
        step: 'buildDoc',
        progress: 50,
        message: `Falha ao preparar wiki: ${steps.buildDoc.error || steps.buildDoc.stderr}`,
        logs: [`✗ Wiki: ${steps.buildDoc.error || steps.buildDoc.stderr}`],
      });
      return {
        success: false,
        message: `Falha ao preparar wiki: ${steps.buildDoc.error || steps.buildDoc.stderr}`,
        steps,
      };
    }
    onProgress?.({
      step: 'buildDoc',
      progress: 75,
      message: 'Wiki pronta para publicação',
      logs: [`✓ ${steps.buildDoc.stdout || 'Wiki preparada'}`],
    });

    onProgress?.({
      step: 'concluido',
      progress: 90,
      message: 'Reiniciando serviço da wiki (PM2 doc)...',
      logs: ['✓ Conteúdo da wiki atualizado', '→ Agendando reinício do PM2 doc...'],
    });

    return {
      success: true,
      message: 'Documentação atualizada com sucesso.',
      steps,
    };
  }

  reloadDocPm2(
    onProgress?: (progress: { step: string; progress: number; message: string; logs?: string[] }) => void
  ): CommandResult {
    const docApp = process.env.PM2_DOC_PROCESS_NAME || 'doc';
    onProgress?.({
      step: 'pm2Reload',
      progress: 92,
      message: 'Agendando reinício da wiki (PM2)...',
      logs: [`→ Reinício do processo ${docApp} em 3 segundos...`],
    });
    const reloadResult = this.pm2Service.scheduleRestartApps([docApp], 3000);

    if (reloadResult.success) {
      onProgress?.({
        step: 'pm2Reload',
        progress: 100,
        message: 'Documentação atualizada com sucesso!',
        logs: ['✓ Reinício da wiki agendado'],
      });
    } else {
      onProgress?.({
        step: 'pm2Reload',
        progress: 92,
        message: `Erro ao reiniciar wiki: ${reloadResult.error || reloadResult.stderr}`,
        logs: [`✗ ${reloadResult.error || reloadResult.stderr}`],
      });
    }

    return reloadResult;
  }
}
