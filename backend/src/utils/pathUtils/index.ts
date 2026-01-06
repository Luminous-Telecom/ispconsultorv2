import * as path from 'path';

/**
 * Resolve o caminho para arquivos de templates
 * Usa __dirname para navegar relativamente ao arquivo atual
 * Funciona tanto em dev (ts-node) quanto em produção (compilado)
 */
export function resolveTemplatePath(templateName: string): string {
  // pathUtils está em utils/pathUtils/, então:
  // - Em dev: __dirname = .../src/utils/pathUtils -> ../../templates = src/templates
  // - Em prod: __dirname = .../dist/utils/pathUtils -> ../../templates = dist/templates
  return path.join(__dirname, '..', '..', 'templates', templateName);
}

/**
 * Resolve o caminho para arquivos de imagens
 * Usa __dirname para navegar relativamente ao arquivo atual
 * Funciona tanto em dev (ts-node) quanto em produção (compilado)
 */
export function resolveImagePath(...imagePath: string[]): string {
  // pathUtils está em utils/pathUtils/, então:
  // - Em dev: __dirname = .../src/utils/pathUtils -> ../../arquivos/images = arquivos/images
  // - Em prod: __dirname = .../dist/utils/pathUtils -> ../../arquivos/images = arquivos/images
  return path.join(__dirname, '..', '..', 'arquivos', 'images', ...imagePath);
}

/**
 * Resolve o caminho para um arquivo relativo ao projeto
 * Usa __dirname para navegar relativamente ao arquivo atual
 */
export function resolveProjectPath(...pathParts: string[]): string {
  // pathUtils está em utils/pathUtils/, então:
  // - Em dev: __dirname = .../src/utils/pathUtils -> ../../ = src/
  // - Em prod: __dirname = .../dist/utils/pathUtils -> ../../ = dist/
  return path.join(__dirname, '..', '..', ...pathParts);
}

/**
 * Resolve o caminho para a pasta de arquivos (uploads)
 * Em produção, arquivos devem ser salvos em dist/arquivos/
 * Em desenvolvimento, arquivos são salvos na raiz arquivos/
 */
export function resolveArquivosPath(...pathParts: string[]): string {
  if (__dirname.includes('dist')) {
    // Em produção: __dirname = .../dist/utils/pathUtils
    // Arquivos devem estar em dist/arquivos/
    return path.join(__dirname, '..', '..', 'arquivos', ...pathParts);
  } else {
    // Em desenvolvimento: __dirname = .../src/utils/pathUtils
    // Arquivos na raiz do projeto
    return path.join(process.cwd(), 'arquivos', ...pathParts);
  }
}

