import path from 'path';
import fs from 'fs';
import { logger } from '../../../utils/logger';
import { GitUpdateService, type CommandResult } from '../GitUpdateService';
import { PackageManagerService } from '../PackageManagerService';
import { BuildService } from '../BuildService';
import { MigrationService } from '../MigrationService';
import { Pm2Service } from '../Pm2Service';
import { HealthCheckService } from '../HealthCheckService';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface UpdateResult {
  success: boolean;
  message: string;
  steps: {
    gitPull: CommandResult;
    npmInstall: CommandResult;
    build: CommandResult;
    migrate: CommandResult;
    pm2Reload?: CommandResult;
  };
}

/**
 * Self-update no servidor: git pull → npm install (backend) → build (backend + frontend) → migrations → PM2.
 */
export class SelfUpdateService {
  private readonly projectRoot: string;
  private readonly backendPath: string;
  private readonly pm2ProcessName: string;
  private readonly backendPort: number;
  private readonly backendUrl: string;
  private readonly gitUpdateService: GitUpdateService;
  private readonly packageManagerService: PackageManagerService;
  private readonly buildService: BuildService;
  private readonly migrationService: MigrationService;
  private readonly pm2Service: Pm2Service;
  private readonly healthCheckService: HealthCheckService;
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
    this.backendPort = parseInt(process.env.PORT || '3001', 10);
    this.backendUrl = `http://localhost:${this.backendPort}`;

    this.gitUpdateService = new GitUpdateService(this.projectRoot);
    this.packageManagerService = new PackageManagerService(this.backendPath);
    this.buildService = new BuildService(this.projectRoot);
    this.migrationService = new MigrationService(this.backendPath);
    this.pm2Service = new Pm2Service(this.projectRoot, this.backendPath, this.pm2ProcessName);
    this.healthCheckService = new HealthCheckService(this.backendUrl);
  }

  /**
   * Sobe os diretórios recursivamente procurando por um arquivo ou pasta específica
   */
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

  /**
   * Verifica se os comandos necessários estão disponíveis
   */
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
      logger.error('Comandos necessários não encontrados', { missing });
    }

    return { success: missing.length === 0, missing };
  }

  /**
   * Executa o processo completo de atualização
   */
  async executeUpdate(
    branch = 'main',
    onProgress?: (progress: { step: string; progress: number; message: string; logs?: string[] }) => void
  ): Promise<UpdateResult> {
    const commandCheck = await this.verifyCommands();
    if (!commandCheck.success) {
      onProgress?.({
        step: 'verificacao',
        progress: 0,
        message: `Comandos necessários não encontrados: ${commandCheck.missing.join(', ')}`,
        logs: [`✗ Comandos faltando: ${commandCheck.missing.join(', ')}`]
      });
      return {
        success: false,
        message: `Comandos necessários não encontrados: ${commandCheck.missing.join(', ')}`,
        steps: {
          gitPull: { success: false, stdout: '', stderr: `Comandos faltando: ${commandCheck.missing.join(', ')}` },
          npmInstall: { success: false, stdout: '', stderr: '' },
          build: { success: false, stdout: '', stderr: '' },
          migrate: { success: false, stdout: '', stderr: '' },
        },
      };
    }

    onProgress?.({
      step: 'iniciando',
      progress: 0,
      message: 'Iniciando processo de atualização...',
      logs: ['Iniciando processo de atualização...']
    });

    const steps = {
      gitPull: { success: false, stdout: '', stderr: '' } as CommandResult,
      npmInstall: { success: false, stdout: '', stderr: '' } as CommandResult,
      build: { success: false, stdout: '', stderr: '' } as CommandResult,
      migrate: { success: false, stdout: '', stderr: '' } as CommandResult,
    };

    // Passo 1: Git Pull
    onProgress?.({
      step: 'gitPull',
      progress: 10,
      message: 'Baixando atualizações do repositório...',
      logs: ['→ Executando git pull...']
    });
    steps.gitPull = await this.gitUpdateService.pull(branch);
    if (!steps.gitPull.success) {
      onProgress?.({
        step: 'gitPull',
        progress: 10,
        message: `Falha ao executar git pull: ${steps.gitPull.error || steps.gitPull.stderr}`,
        logs: [`✗ Git Pull falhou: ${steps.gitPull.error || steps.gitPull.stderr}`]
      });
      return {
        success: false,
        message: `Falha ao executar git pull: ${steps.gitPull.error || steps.gitPull.stderr}`,
        steps,
      };
    }
    onProgress?.({
      step: 'gitPull',
      progress: 20,
      message: 'Git pull concluído com sucesso',
      logs: ['✓ Git Pull concluído']
    });

    // Passo 1.5: Atualizar versão
    onProgress?.({
      step: 'versao',
      progress: 25,
      message: 'Verificando versão...',
      logs: ['→ Verificando versão no package.json...']
    });
    const updateVersionResult = await this.packageManagerService.updateVersion();
    if (!updateVersionResult.success) {
      logger.warn('Falha ao verificar versão, mas continuando o processo');
    }

    // Passo 2: NPM Install
    onProgress?.({
      step: 'npmInstall',
      progress: 30,
      message: 'Instalando dependências...',
      logs: ['→ Executando npm install...']
    });
    steps.npmInstall = await this.packageManagerService.install();
    if (!steps.npmInstall.success) {
      onProgress?.({
        step: 'npmInstall',
        progress: 30,
        message: `Falha ao instalar dependências: ${steps.npmInstall.error || steps.npmInstall.stderr}`,
        logs: [`✗ NPM Install falhou: ${steps.npmInstall.error || steps.npmInstall.stderr}`]
      });
      return {
        success: false,
        message: `Falha ao instalar dependências: ${steps.npmInstall.error || steps.npmInstall.stderr}`,
        steps,
      };
    }
    onProgress?.({
      step: 'npmInstall',
      progress: 50,
      message: 'Dependências instaladas com sucesso',
      logs: ['✓ NPM Install concluído']
    });

    // Passo 3: Build
    onProgress?.({
      step: 'build',
      progress: 60,
      message: 'Compilando código...',
      logs: ['→ Executando build (backend e frontend)...']
    });
    steps.build = await this.buildService.build();
    if (!steps.build.success) {
      onProgress?.({
        step: 'build',
        progress: 60,
        message: `Falha ao executar build: ${steps.build.error || steps.build.stderr}`,
        logs: [`✗ Build falhou: ${steps.build.error || steps.build.stderr}`]
      });
      return {
        success: false,
        message: `Falha ao executar build: ${steps.build.error || steps.build.stderr}`,
        steps,
      };
    }
    onProgress?.({
      step: 'build',
      progress: 70,
      message: 'Build concluído com sucesso',
      logs: ['✓ Build concluído']
    });

    // Passo 4: Migrations
    onProgress?.({
      step: 'migrate',
      progress: 75,
      message: 'Executando migrations do banco de dados...',
      logs: ['→ Executando migrations...']
    });
    steps.migrate = await this.migrationService.migrate();
    if (!steps.migrate.success) {
      onProgress?.({
        step: 'migrate',
        progress: 75,
        message: `Falha ao executar migrations: ${steps.migrate.error || steps.migrate.stderr}`,
        logs: [`✗ Migrations falharam: ${steps.migrate.error || steps.migrate.stderr}`]
      });
      return {
        success: false,
        message: `Falha ao executar migrations: ${steps.migrate.error || steps.migrate.stderr}. O processo foi interrompido por segurança.`,
        steps,
      };
    }
    onProgress?.({
      step: 'migrate',
      progress: 85,
      message: 'Migrations concluídas com sucesso',
      logs: ['✓ Migrations concluídas']
    });

    onProgress?.({
      step: 'concluido',
      progress: 90,
      message: 'Atualização concluída. Reiniciando aplicação...',
      logs: ['✓ Todos os passos concluídos com sucesso', '→ Aguardando reinicialização do PM2...']
    });
    
    return {
      success: true,
      message: 'Atualização concluída com sucesso. A aplicação será reiniciada em breve.',
      steps,
    };
  }

  /**
   * Agenda reinício do PM2 via processo filho desvinculado.
   * O processo atual não pode chamar "pm2 restart" diretamente (seria morto por SIGINT).
   * Um filho espera alguns segundos (tempo para enviar SSE "finalizado"), depois executa o restart.
   * O frontend aguarda /health antes de recarregar a página.
   */
  async reloadPM2(onProgress?: (progress: { step: string; progress: number; message: string; logs?: string[] }) => void): Promise<CommandResult> {
    onProgress?.({
      step: 'pm2Reload',
      progress: 92,
      message: 'Agendando reinício da aplicação (PM2)...',
      logs: ['→ Reinício será executado em 5 segundos (processo filho)...']
    });
    const reloadResult = this.pm2Service.scheduleRestart();

    if (reloadResult.success) {
      onProgress?.({
        step: 'pm2Reload',
        progress: 100,
        message: 'Atualização concluída com sucesso!',
        logs: ['✓ Reinício agendado', '✓ O frontend aguardará o servidor ficar pronto antes de recarregar']
      });
    } else {
      onProgress?.({
        step: 'pm2Reload',
        progress: 92,
        message: `Erro ao agendar reinício PM2: ${reloadResult.error || reloadResult.stderr}`,
        logs: [`✗ ${reloadResult.error || reloadResult.stderr}`]
      });
    }

    return reloadResult;
  }
}
