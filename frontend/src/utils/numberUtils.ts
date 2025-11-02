// Utilitários de número centralizados

/**
 * Converte um valor para número, tratando strings vazias e valores inválidos
 * @param value - Valor para converter
 * @param defaultValue - Valor padrão se a conversão falhar
 * @returns Número convertido ou valor padrão
 */
export const toNumber = (value: string | number | null | undefined, defaultValue: number = 0): number => {
  if (value === null || value === undefined || value === '') return defaultValue;
  
  if (typeof value === 'number') {
    return isNaN(value) ? defaultValue : value;
  }
  
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return defaultValue;
    
    const num = parseFloat(trimmed);
    return isNaN(num) ? defaultValue : num;
  }
  
  return defaultValue;
};

/**
 * Converte um valor para inteiro
 * @param value - Valor para converter
 * @param defaultValue - Valor padrão se a conversão falhar
 * @returns Inteiro convertido ou valor padrão
 */
export const toInteger = (value: string | number | null | undefined, defaultValue: number = 0): number => {
  const num = toNumber(value, defaultValue);
  return Math.floor(num);
};

/**
 * Formata um número para string com precisão específica
 * @param value - Número para formatar
 * @param decimals - Número de casas decimais
 * @returns String formatada
 */
export const formatNumber = (value: number | string, decimals: number = 2): string => {
  const num = toNumber(value);
  return num.toFixed(decimals);
};

/**
 * Arredonda um número para uma precisão específica
 * @param value - Número para arredondar
 * @param decimals - Número de casas decimais
 * @returns Número arredondado
 */
export const round = (value: number | string, decimals: number = 2): number => {
  const num = toNumber(value);
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
};

/**
 * Arredonda um número para cima (ceil)
 * @param value - Número para arredondar
 * @param decimals - Número de casas decimais
 * @returns Número arredondado para cima
 */
export const roundUp = (value: number | string, decimals: number = 2): number => {
  const num = toNumber(value);
  const factor = Math.pow(10, decimals);
  return Math.ceil(num * factor) / factor;
};

/**
 * Arredonda um número para baixo (floor)
 * @param value - Número para arredondar
 * @param decimals - Número de casas decimais
 * @returns Número arredondado para baixo
 */
export const roundDown = (value: number | string, decimals: number = 2): number => {
  const num = toNumber(value);
  const factor = Math.pow(10, decimals);
  return Math.floor(num * factor) / factor;
};

/**
 * Limita um número entre um mínimo e máximo
 * @param value - Número para limitar
 * @param min - Valor mínimo
 * @param max - Valor máximo
 * @returns Número limitado
 */
export const clamp = (value: number | string, min: number, max: number): number => {
  const num = toNumber(value);
  return Math.min(Math.max(num, min), max);
};

/**
 * Calcula uma porcentagem
 * @param value - Valor base
 * @param total - Valor total
 * @param decimals - Número de casas decimais
 * @returns Porcentagem calculada
 */
export const calculatePercentage = (value: number | string, total: number | string, decimals: number = 2): number => {
  const val = toNumber(value);
  const tot = toNumber(total);
  
  if (tot === 0) return 0;
  
  return round((val / tot) * 100, decimals);
};

/**
 * Aplica um desconto percentual a um valor
 * @param value - Valor base
 * @param percentage - Porcentagem de desconto
 * @returns Valor com desconto aplicado
 */
export const applyDiscount = (value: number | string, percentage: number | string): number => {
  const val = toNumber(value);
  const percent = toNumber(percentage, 0);
  
  return round(val - (val * percent / 100), 2);
};

/**
 * Aplica um acréscimo percentual a um valor
 * @param value - Valor base
 * @param percentage - Porcentagem de acréscimo
 * @returns Valor com acréscimo aplicado
 */
export const applyIncrease = (value: number | string, percentage: number | string): number => {
  const val = toNumber(value);
  const percent = toNumber(percentage, 0);
  
  return round(val + (val * percent / 100), 2);
};

/**
 * Formata um número como moeda brasileira sem símbolo
 * @param value - Valor para formatar
 * @returns String formatada como "0,00"
 */
export const formatCurrencyValue = (value: number | string): string => {
  const num = toNumber(value);
  return num.toFixed(2).replace('.', ',');
};

/**
 * Valida se um valor é um número válido
 * @param value - Valor para validar
 * @returns true se for número válido
 */
export const isValidNumber = (value: string | number | null | undefined): boolean => {
  if (value === null || value === undefined || value === '') return false;
  
  if (typeof value === 'number') {
    return !isNaN(value) && isFinite(value);
  }
  
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return false;
    
    const num = parseFloat(trimmed);
    return !isNaN(num) && isFinite(num);
  }
  
  return false;
};

/**
 * Verifica se um número está dentro de um intervalo
 * @param value - Número para verificar
 * @param min - Valor mínimo (inclusivo)
 * @param max - Valor máximo (inclusivo)
 * @returns true se estiver no intervalo
 */
export const isInRange = (value: number | string, min: number, max: number): boolean => {
  const num = toNumber(value);
  return num >= min && num <= max;
};

