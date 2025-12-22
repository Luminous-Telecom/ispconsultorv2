/**
 * Serviço de gerenciamento de dependências do sistema
 * Verifica e instala dependências apenas se necessário
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';
import type {
  DependencyConfig,
  DependencyCheckResult,
  DependencyInstallResult,
  DependencyManagerOptions,
  DependencyManagerResult
} from '../types/dependency';

const execAsync = promisify(exec);

interface ConfiguredVersion {
  version: string;
  configuredAt: string;
}

const CONFIG_VERSION_FILE = path.join(process.cwd(), '.dependency-versions.json');

export class DependencyManager {
  private defaultOptions: DependencyManagerOptions = {
    skipIfExists: true,
    continueOnError: true,
    useSudo: true,
    dryRun: false
  };

  /**
   * Executa um comando e retorna o resultado
   */
  private async executeCommand(command: string, requiresSudo: boolean = false, useSudo: boolean = true): Promise<{ stdout: string; stderr: string; code: number }> {
    const finalCommand = (requiresSudo && useSudo) ? `sudo ${command}` : command;
    
    try {
      const { stdout, stderr } = await execAsync(finalCommand, {
        maxBuffer: 10 * 1024 * 1024, // 10MB
        timeout: 300000 // 5 minutos
      });
      return { stdout: stdout.trim(), stderr: stderr.trim(), code: 0 };
    } catch (error: any) {
      return {
        stdout: error.stdout?.trim() || '',
        stderr: error.stderr?.trim() || error.message || '',
        code: error.code || 1
      };
    }
  }

  /**
   * Verifica se uma dependência já está instalada
   */
  async checkDependency(dependency: DependencyConfig): Promise<DependencyCheckResult> {
    try {
      const checkCommands = Array.isArray(dependency.checkCommand) 
        ? dependency.checkCommand 
        : [dependency.checkCommand];

      let exists = false;
      let version: string | undefined;
      let lastError: string | undefined;

      // Tenta cada comando de verificação (OR lógico)
      for (const checkCmd of checkCommands) {
        const result = await this.executeCommand(checkCmd, false, false);
        
        if (result.code === 0) {
          exists = true;
          
          // Se tiver comando de versão, tenta obter
          if (dependency.versionCommand) {
            const versionResult = await this.executeCommand(dependency.versionCommand, false, false);
            if (versionResult.code === 0) {
              version = versionResult.stdout;
            }
          }
          break;
        } else {
          lastError = result.stderr || `Exit code: ${result.code}`;
        }
      }

      return {
        exists,
        version,
        error: exists ? undefined : lastError
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error(`Erro ao verificar dependência ${dependency.name}`, {
        error: errorMessage,
        dependency: dependency.name
      });
      
      return {
        exists: false,
        error: errorMessage
      };
    }
  }

  /**
   * Lê a versão configurada de uma dependência
   */
  private getConfiguredVersion(dependencyName: string): string | null {
    try {
      if (!fs.existsSync(CONFIG_VERSION_FILE)) {
        return null;
      }
      
      const content = fs.readFileSync(CONFIG_VERSION_FILE, 'utf-8');
      const versions: Record<string, ConfiguredVersion> = JSON.parse(content);
      
      return versions[dependencyName]?.version || null;
    } catch (error) {
      logger.debug(`Erro ao ler versão configurada de ${dependencyName}`, {
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      return null;
    }
  }

  /**
   * Salva a versão configurada de uma dependência
   */
  private saveConfiguredVersion(dependencyName: string, version: string): void {
    try {
      let versions: Record<string, ConfiguredVersion> = {};
      
      if (fs.existsSync(CONFIG_VERSION_FILE)) {
        const content = fs.readFileSync(CONFIG_VERSION_FILE, 'utf-8');
        versions = JSON.parse(content);
      }
      
      versions[dependencyName] = {
        version,
        configuredAt: new Date().toISOString()
      };
      
      fs.writeFileSync(CONFIG_VERSION_FILE, JSON.stringify(versions, null, 2), 'utf-8');
      
      logger.debug(`Versão configurada salva para ${dependencyName}`, {
        version,
        file: CONFIG_VERSION_FILE
      });
    } catch (error) {
      logger.warn(`Erro ao salvar versão configurada de ${dependencyName}`, {
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Instala uma dependência específica
   */
  async installDependency(
    dependency: DependencyConfig,
    options: DependencyManagerOptions = {}
  ): Promise<DependencyInstallResult> {
    const opts = { ...this.defaultOptions, ...options };
    
    logger.info(`Verificando dependência: ${dependency.name}`, {
      dependency: dependency.name,
      description: dependency.description
    });

    // Verificar se já existe e comparar versões
    const checkResult = await this.checkDependency(dependency);
    
    if (opts.skipIfExists !== false && checkResult.exists) {
      // Se já existe, verificar se precisa reconfigurar (versão diferente)
      const configuredVersion = this.getConfiguredVersion(dependency.name);
      const currentVersion = checkResult.version || 'unknown';
      
      if (configuredVersion && configuredVersion === currentVersion) {
        const message = `Skipping ${dependency.name} - já instalado e configurado (versão: ${currentVersion})`;
        
        logger.info(message, {
          dependency: dependency.name,
          version: currentVersion,
          configuredVersion
        });
        
        return {
          success: true,
          skipped: true,
          message
        };
      } else if (configuredVersion && configuredVersion !== currentVersion) {
        // Versão mudou, precisa reconfigurar mas não reinstalar
        logger.info(`Versão de ${dependency.name} mudou (${configuredVersion} -> ${currentVersion}), reconfigurando...`, {
          dependency: dependency.name,
          oldVersion: configuredVersion,
          newVersion: currentVersion
        });
        // Continua para reconfigurar abaixo (executa comandos de instalação que fazem a configuração)
      } else {
        // Não tem versão configurada ainda, apenas marca como instalado mas precisa configurar
        const message = checkResult.version 
          ? `Skipping instalação de ${dependency.name} - já instalado (versão: ${checkResult.version}), mas precisa configurar`
          : `Skipping instalação de ${dependency.name} - já instalado, mas precisa configurar`;
        
        logger.info(message, {
          dependency: dependency.name,
          version: checkResult.version
        });
        // Continua para configurar abaixo
      }
    } else if (checkResult.exists && opts.skipIfExists === false) {
      // skipIfExists = false mas existe, ainda precisa configurar se versão mudou
      const configuredVersion = this.getConfiguredVersion(dependency.name);
      const currentVersion = checkResult.version || 'unknown';
      
      if (configuredVersion && configuredVersion === currentVersion) {
        const message = `${dependency.name} já instalado e configurado (versão: ${currentVersion})`;
        return {
          success: true,
          skipped: true,
          message
        };
      }
      // Continua para reconfigurar
    } else if (!checkResult.exists) {
      // Não existe, precisa instalar
      logger.info(`Dependência ${dependency.name} não encontrada, será instalada`);
    }

    // Dry run - apenas simular
    if (opts.dryRun) {
      const message = `[DRY RUN] Instalaria ${dependency.name} com ${dependency.installCommands.length} comando(s)`;
      logger.info(message, {
        dependency: dependency.name,
        commands: dependency.installCommands
      });
      
      return {
        success: true,
        skipped: false,
        message
      };
    }

    // Instalar
    logger.info(`Instalando dependência: ${dependency.name}`, {
      dependency: dependency.name,
      commandsCount: dependency.installCommands.length
    });

    try {
      for (let i = 0; i < dependency.installCommands.length; i++) {
        const command = dependency.installCommands[i];
        const isLast = i === dependency.installCommands.length - 1;
        
        logger.debug(`Executando comando ${i + 1}/${dependency.installCommands.length} para ${dependency.name}`, {
          dependency: dependency.name,
          command: command.substring(0, 100), // Limitar tamanho do log
          commandIndex: i + 1
        });

        const result = await this.executeCommand(command, dependency.requiresSudo || false, opts.useSudo || false);
        
        if (result.code !== 0) {
          const errorMessage = `Falha ao executar comando ${i + 1}/${dependency.installCommands.length}: ${result.stderr || `Exit code: ${result.code}`}`;
          
          logger.error(`Erro ao instalar ${dependency.name}`, {
            dependency: dependency.name,
            commandIndex: i + 1,
            totalCommands: dependency.installCommands.length,
            command: command.substring(0, 200),
            error: result.stderr || 'Sem mensagem de erro',
            stdout: result.stdout || '',
            exitCode: result.code
          });

          return {
            success: false,
            skipped: false,
            error: errorMessage,
            message: `Falha ao instalar ${dependency.name}: ${errorMessage}`
          };
        } else {
          logger.debug(`Comando ${i + 1}/${dependency.installCommands.length} executado com sucesso para ${dependency.name}`);
        }
      }

      // Verificar se a instalação foi bem-sucedida
      const verifyResult = await this.checkDependency(dependency);
      
      if (verifyResult.exists) {
        const installedVersion = verifyResult.version || 'unknown';
        const message = installedVersion !== 'unknown'
          ? `${dependency.name} instalado/configurado com sucesso (versão: ${installedVersion})`
          : `${dependency.name} instalado/configurado com sucesso`;
        
        // Salvar versão configurada
        if (installedVersion !== 'unknown') {
          this.saveConfiguredVersion(dependency.name, installedVersion);
        }
        
        logger.info(message, {
          dependency: dependency.name,
          version: installedVersion
        });

        return {
          success: true,
          skipped: false,
          message
        };
      } else {
        const message = `${dependency.name} instalado mas não pode ser verificado`;
        logger.warn(message, {
          dependency: dependency.name,
          verifyError: verifyResult.error
        });

        return {
          success: false,
          skipped: false,
          error: verifyResult.error || 'Verificação pós-instalação falhou',
          message
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      logger.error(`Erro inesperado ao instalar ${dependency.name}`, {
        dependency: dependency.name,
        error: errorMessage
      });

      return {
        success: false,
        skipped: false,
        error: errorMessage,
        message: `Erro ao instalar ${dependency.name}: ${errorMessage}`
      };
    }
  }

  /**
   * Instala múltiplas dependências
   */
  async installDependencies(
    dependencies: DependencyConfig[],
    options: DependencyManagerOptions = {}
  ): Promise<DependencyManagerResult> {
    const opts = { ...this.defaultOptions, ...options };
    const results = new Map<string, DependencyInstallResult>();

    logger.info(`Iniciando instalação de ${dependencies.length} dependência(s)`, {
      total: dependencies.length,
      skipIfExists: opts.skipIfExists,
      continueOnError: opts.continueOnError,
      dryRun: opts.dryRun
    });

    let installed = 0;
    let skipped = 0;
    let failed = 0;

    for (const dependency of dependencies) {
      try {
        const result = await this.installDependency(dependency, opts);
        results.set(dependency.name, result);

        if (result.skipped) {
          skipped++;
        } else if (result.success) {
          installed++;
        } else {
          failed++;
          
          if (!opts.continueOnError) {
            logger.error(`Parando instalação devido a erro em ${dependency.name}`, {
              dependency: dependency.name,
              continueOnError: false
            });
            break;
          }
        }
      } catch (error) {
        failed++;
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        
        results.set(dependency.name, {
          success: false,
          skipped: false,
          error: errorMessage,
          message: `Erro inesperado ao processar ${dependency.name}: ${errorMessage}`
        });

        logger.error(`Erro ao processar dependência ${dependency.name}`, {
          dependency: dependency.name,
          error: errorMessage
        });

        if (!opts.continueOnError) {
          break;
        }
      }
    }

    const summary = {
      total: dependencies.length,
      installed,
      skipped,
      failed,
      results
    };

    logger.info(`Instalação de dependências concluída`, summary);

    return summary;
  }

  /**
   * Lista todas as dependências e seus status
   */
  async listDependencies(dependencies: DependencyConfig[]): Promise<Map<string, DependencyCheckResult>> {
    const statusMap = new Map<string, DependencyCheckResult>();

    logger.info(`Verificando status de ${dependencies.length} dependência(s)`);

    for (const dependency of dependencies) {
      const status = await this.checkDependency(dependency);
      statusMap.set(dependency.name, status);
    }

    return statusMap;
  }
}

// Singleton instance
let instance: DependencyManager | null = null;

export const getDependencyManager = (): DependencyManager => {
  if (!instance) {
    instance = new DependencyManager();
  }
  return instance;
};

export default getDependencyManager;

