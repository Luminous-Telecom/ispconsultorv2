import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  error?: string;
}

interface UpdateResult {
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
 * Service responsável por executar o self-update da aplicação
 * Executa os comandos na ordem: git pull -> npm install -> build -> migrations -> pm2 reload
 */
export class SelfUpdateService {
  private readonly projectRoot: string;
  private readonly backendPath: string;
  private readonly pm2ProcessName: string;

  constructor() {
    // Detecta o diretório raiz do projeto
    // Se estiver em desenvolvimento: backend/src/services -> volta 3 níveis -> raiz
    // Se estiver compilado: backend/dist/src/services -> volta 4 níveis -> raiz
    const currentDir = __dirname;
    
    // Verifica se estamos no diretório dist (compilado) ou src (desenvolvimento)
    if (currentDir.includes('/dist/') || currentDir.includes('\\dist\\')) {
      // Compilado: backend/dist/src/services -> volta 4 níveis
      this.projectRoot = path.resolve(currentDir, '../../../..');
    } else {
      // Desenvolvimento: backend/src/services -> volta 3 níveis
      this.projectRoot = path.resolve(currentDir, '../../..');
    }
    
    // O backendPath é sempre o diretório onde está o package.json do backend
    // Se estamos em dist, volta 1 nível. Se estamos em src, volta 2 níveis.
    if (currentDir.includes('/dist/') || currentDir.includes('\\dist\\')) {
      this.backendPath = path.resolve(currentDir, '../../..');
    } else {
      this.backendPath = path.resolve(currentDir, '../..');
    }
    
    this.pm2ProcessName = process.env.PM2_PROCESS_NAME || 'BackNet-backend';
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
      logger.info(`Executando: ${description}`, { command, cwd });

      const { stdout, stderr } = await execAsync(command, {
        cwd,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        env: {
          ...process.env,
          NODE_ENV: process.env.NODE_ENV || 'production',
        },
      });

      // Log apenas informações essenciais (sem URLs, tokens, etc)
      logger.info(`${description} concluído`, {
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
      const errorOutput = error as { stdout?: string; stderr?: string };

      logger.error(`Erro ao executar: ${description}`, {
        error: errorMessage,
        stdoutLength: errorOutput.stdout?.length || 0,
        stderrLength: errorOutput.stderr?.length || 0,
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
   * Executa git pull na branch especificada
   */
  private async gitPull(branch: string = 'main'): Promise<CommandResult> {
    const command = `git pull origin ${branch}`;
    return this.executeCommand(command, this.projectRoot, 'Git Pull');
  }

  /**
   * Instala dependências npm
   */
  private async npmInstall(): Promise<CommandResult> {
    const command = 'npm install';
    return this.executeCommand(command, this.backendPath, 'NPM Install');
  }

  /**
   * Executa o build da aplicação
   */
  private async build(): Promise<CommandResult> {
    const command = 'npm run build';
    return this.executeCommand(command, this.backendPath, 'Build');
  }

  /**
   * Executa as migrations do banco de dados
   */
  private async migrate(): Promise<CommandResult> {
    const command = 'npm run migrate';
    return this.executeCommand(command, this.backendPath, 'Migrations');
  }

  /**
   * Reinicia o processo no PM2
   */
  private async pm2Reload(): Promise<CommandResult> {
    const command = `pm2 reload ${this.pm2ProcessName}`;
    return this.executeCommand(command, this.projectRoot, 'PM2 Reload');
  }

  /**
   * Executa o processo completo de atualização
   * Retorna o resultado ANTES de reiniciar o PM2 para que o frontend possa exibir feedback
   */
  async executeUpdate(branch: string = 'main'): Promise<UpdateResult> {
    const steps = {
      gitPull: await this.gitPull(branch),
      npmInstall: { success: false, stdout: '', stderr: '' } as CommandResult,
      build: { success: false, stdout: '', stderr: '' } as CommandResult,
      migrate: { success: false, stdout: '', stderr: '' } as CommandResult,
    };

    // Passo 1: Git Pull
    if (!steps.gitPull.success) {
      return {
        success: false,
        message: `Falha ao executar git pull: ${steps.gitPull.error || steps.gitPull.stderr}`,
        steps,
      };
    }

    // Passo 2: NPM Install
    steps.npmInstall = await this.npmInstall();
    if (!steps.npmInstall.success) {
      return {
        success: false,
        message: `Falha ao instalar dependências: ${steps.npmInstall.error || steps.npmInstall.stderr}`,
        steps,
      };
    }

    // Passo 3: Build
    steps.build = await this.build();
    if (!steps.build.success) {
      return {
        success: false,
        message: `Falha ao executar build: ${steps.build.error || steps.build.stderr}`,
        steps,
      };
    }

    // Passo 4: Migrations (CRÍTICO - se falhar, para tudo)
    steps.migrate = await this.migrate();
    if (!steps.migrate.success) {
      return {
        success: false,
        message: `Falha ao executar migrations: ${steps.migrate.error || steps.migrate.stderr}. O processo foi interrompido por segurança.`,
        steps,
      };
    }

    // Se chegou até aqui, tudo deu certo
    // Retorna sucesso ANTES de reiniciar o PM2
    return {
      success: true,
      message: 'Atualização concluída com sucesso. A aplicação será reiniciada em breve.',
      steps,
    };
  }

  /**
   * Reinicia o PM2 após confirmação de sucesso
   * Este método deve ser chamado após o frontend receber a resposta de sucesso
   */
  async reloadPM2(): Promise<CommandResult> {
    return this.pm2Reload();
  }
}

