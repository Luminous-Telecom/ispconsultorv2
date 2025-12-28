// Funções helper gerais
import debounce from 'lodash/debounce';
import throttle from 'lodash/throttle';
import cloneDeep from 'lodash/cloneDeep';

// Re-exportar debounce, throttle e cloneDeep do lodash
export { debounce, throttle };
export { cloneDeep as deepClone };

/**
 * Remove propriedades undefined ou null de um objeto
 * @param obj - Objeto para limpar
 * @returns Objeto limpo
 */
export const removeNullish = <T extends Record<string, string | number | boolean | null | undefined | object>>(obj: T): Partial<T> => {
  const cleaned: Partial<T> = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key) && obj[key] !== null && obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  }
  
  return cleaned;
};

/**
 * Converte um objeto em query string usando URLSearchParams nativo
 * @param params - Objeto com parâmetros
 * @returns String de query formatada
 */
export const toQueryString = (params: Record<string, string | number | boolean | null | undefined | (string | number | boolean)[]>): string => {
  const cleaned = removeNullish(params);
  const searchParams = new URLSearchParams();
  
  for (const [key, value] of Object.entries(cleaned)) {
    if (value === null || value === undefined) continue;
    
    if (Array.isArray(value)) {
      // Para arrays, adiciona múltiplos parâmetros com o mesmo nome
      // O backend geralmente aceita isso como array
      value.forEach(v => {
        searchParams.append(key, String(v));
      });
    } else {
      searchParams.append(key, String(value));
    }
  }
  
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

/**
 * Obtém um valor de um objeto aninhado usando uma string de caminho
 * @param obj - Objeto para navegar
 * @param path - Caminho (ex: "user.profile.name")
 * @param defaultValue - Valor padrão se não encontrar
 * @returns Valor encontrado ou padrão
 */
export const getNestedValue = <T>(obj: Record<string, string | number | boolean | object | null | undefined>, path: string, defaultValue?: T): T | undefined => {
  const keys = path.split('.');
  let current: string | number | boolean | object | null | undefined = obj;

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return defaultValue;
    }

    current = (current as Record<string, string | number | boolean | object | null | undefined>)[key];
  }

  return (current as T) ?? defaultValue;
};

/**
 * Define um valor em um objeto aninhado usando uma string de caminho
 * @param obj - Objeto para modificar
 * @param path - Caminho (ex: "user.profile.name")
 * @param value - Valor a ser definido
 */
export const setNestedValue = <T>(obj: Record<string, T>, path: string, value: T): void => {
  const keys = path.split('.');
  const lastKey = keys.pop();
  
  if (!lastKey) return;

  let current: Record<string, T> = obj;

  for (const key of keys) {
    if (current[key] === null || current[key] === undefined || typeof current[key] !== 'object') {
      current[key] = {} as T;
    }
    current = current[key] as Record<string, T>;
  }

  current[lastKey] = value;
};

/**
 * Verifica se um valor está vazio (null, undefined, string vazia, array vazio, objeto vazio)
 * @param value - Valor para verificar
 * @returns true se estiver vazio
 */
export const isEmpty = (value: string | number | boolean | null | undefined | Array<never> | Record<string, never>): boolean => {
  if (value === null || value === undefined) return true;
  
  if (typeof value === 'string') return value.trim() === '';
  
  if (Array.isArray(value)) return value.length === 0;
  
  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }
  
  return false;
};

/**
 * Gera um ID único simples
 * @returns String com ID único
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Capitaliza a primeira letra de uma string
 * @param str - String para capitalizar
 * @returns String capitalizada
 */
export const capitalize = (str: string): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Capitaliza a primeira letra de cada palavra
 * @param str - String para capitalizar
 * @returns String com palavras capitalizadas
 */
export const capitalizeWords = (str: string): string => {
  if (!str) return '';
  return str
    .split(' ')
    .map(word => capitalize(word))
    .join(' ');
};

/**
 * Trunca uma string com ellipsis
 * @param str - String para truncar
 * @param length - Tamanho máximo
 * @returns String truncada
 */
export const truncate = (str: string, length: number): string => {
  if (!str || str.length <= length) return str;
  return `${str.substring(0, length)}...`;
};

