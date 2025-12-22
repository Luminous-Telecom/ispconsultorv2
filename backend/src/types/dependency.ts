/**
 * Tipos e interfaces para o sistema de gerenciamento de dependências
 */

export interface DependencyCheckResult {
  exists: boolean;
  version?: string;
  error?: string;
}

export interface DependencyInstallResult {
  success: boolean;
  skipped: boolean;
  error?: string;
  message: string;
}

export interface DependencyConfig {
  name: string;
  description?: string;
  checkCommand: string | string[];
  installCommands: string[];
  requiresSudo?: boolean;
  versionCommand?: string;
  skipIfExists?: boolean;
}

export interface DependencyManagerOptions {
  skipIfExists?: boolean;
  continueOnError?: boolean;
  useSudo?: boolean;
  dryRun?: boolean;
}

export interface DependencyManagerResult {
  total: number;
  installed: number;
  skipped: number;
  failed: number;
  results: Map<string, DependencyInstallResult>;
}

