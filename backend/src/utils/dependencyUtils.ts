/**
 * Utilitários para gerenciamento de dependências
 */

import { getDependencyManager } from '../services/DependencyManager';
import { SYSTEM_DEPENDENCIES } from '../config/dependencies';
import { logger } from './logger';
import type { DependencyConfig, DependencyManagerOptions } from '../types/dependency';

/**
 * Instala todas as dependências do sistema
 */
export async function installAllDependencies(options?: DependencyManagerOptions): Promise<void> {
  const manager = getDependencyManager();
  const result = await manager.installDependencies(SYSTEM_DEPENDENCIES, options);
  
  logger.info('Resultado da instalação de dependências', {
    total: result.total,
    installed: result.installed,
    skipped: result.skipped,
    failed: result.failed
  });

  // Log detalhado de cada resultado
  result.results.forEach((installResult, name) => {
    if (installResult.skipped) {
      logger.info(`✓ ${name}: ${installResult.message}`);
    } else if (installResult.success) {
      logger.info(`✓ ${name}: ${installResult.message}`);
    } else {
      logger.error(`✗ ${name}: ${installResult.message}`, {
        error: installResult.error
      });
    }
  });

  if (result.failed > 0) {
    throw new Error(`${result.failed} dependência(s) falharam na instalação`);
  }
}

/**
 * Verifica o status de todas as dependências
 */
export async function checkAllDependencies(): Promise<Map<string, { exists: boolean; version?: string }>> {
  const manager = getDependencyManager();
  return await manager.listDependencies(SYSTEM_DEPENDENCIES);
}

/**
 * Instala uma dependência específica por nome
 */
export async function installDependencyByName(
  name: string,
  options?: DependencyManagerOptions
): Promise<void> {
  const dependency = SYSTEM_DEPENDENCIES.find(dep => dep.name.toLowerCase() === name.toLowerCase());
  
  if (!dependency) {
    throw new Error(`Dependência "${name}" não encontrada na configuração`);
  }

  const manager = getDependencyManager();
  const result = await manager.installDependency(dependency, options);
  
  if (!result.success) {
    throw new Error(result.error || result.message);
  }

  logger.info(result.message, {
    dependency: dependency.name,
    skipped: result.skipped
  });
}

/**
 * Adiciona uma nova dependência à configuração (runtime)
 */
export function addDependency(dependency: DependencyConfig): void {
  const exists = SYSTEM_DEPENDENCIES.some(dep => dep.name === dependency.name);
  
  if (exists) {
    logger.warn(`Dependência ${dependency.name} já existe, substituindo...`);
    const index = SYSTEM_DEPENDENCIES.findIndex(dep => dep.name === dependency.name);
    SYSTEM_DEPENDENCIES[index] = dependency;
  } else {
    SYSTEM_DEPENDENCIES.push(dependency);
    logger.info(`Nova dependência adicionada: ${dependency.name}`);
  }
}

