/**
 * Detecta se estamos em ambiente de produção
 * baseado no __dirname - em produção o código compilado está em dist/
 */
export function isProduction(): boolean {
  return __dirname.includes('dist');
}

/**
 * Detecta se estamos em ambiente de desenvolvimento
 * baseado no __dirname - em dev o código está em src/
 */
export function isDevelopment(): boolean {
  return !isProduction();
}

