import { Op, WhereOptions } from 'sequelize';
import { normalizeDateForDb } from '../dateUtils';

/**
 * Constrói filtro de data para queries Sequelize
 * @param startDate - Data de início (string YYYY-MM-DD ou Date)
 * @param endDate - Data de fim (string YYYY-MM-DD ou Date)
 * @param field - Nome do campo no banco de dados (padrão: "data_vencimento")
 * @returns WhereOptions com filtro de data ou null se nenhuma data fornecida
 */
export function buildDateFilter(
  startDate?: string | Date | null,
  endDate?: string | Date | null,
  field = 'data_vencimento'
): WhereOptions | null {
  if (!startDate && !endDate) {
    return null;
  }

  let startOfDay: Date | null = null;
  let endOfDay: Date | null = null;

  if (startDate) {
    const normalizedStart = normalizeDateForDb(startDate);
    if (normalizedStart) {
      // Início do dia (00:00:00)
      startOfDay = new Date(normalizedStart);
      startOfDay.setHours(0, 0, 0, 0);
    }
  }

  if (endDate) {
    const normalizedEnd = normalizeDateForDb(endDate);
    if (normalizedEnd) {
      // Fim do dia (23:59:59.999)
      endOfDay = new Date(normalizedEnd);
      endOfDay.setHours(23, 59, 59, 999);
    }
  }

  if (!startOfDay && !endOfDay) {
    return null;
  }

  // Construir objeto de filtro diretamente com computed property names
  const dateCondition: Record<string | symbol, unknown> = {};
  if (startOfDay) {
    dateCondition[Op.gte] = startOfDay;
  }
  if (endOfDay) {
    dateCondition[Op.lte] = endOfDay;
  }

  return {
    [field]: dateCondition
  } as WhereOptions;
}

/**
 * Constrói filtro de busca genérica para queries Sequelize
 * @param searchTerm - Termo de busca
 * @param searchFields - Campos nos quais buscar
 * @param searchField - Campo específico a buscar (opcional, se fornecido, busca apenas neste campo)
 * @returns WhereOptions com filtro de busca ou null se termo vazio
 */
export function buildSearchFilter(
  searchTerm?: string | null,
  searchFields: string[] = [],
  searchField?: string
): WhereOptions | null {
  if (!searchTerm || !searchTerm.trim()) {
    return null;
  }

  const trimmedSearch = searchTerm.trim();

  // Se campo específico fornecido, buscar apenas nele
  if (searchField && searchFields.includes(searchField)) {
    return {
      [searchField]: {
        [Op.like]: `%${trimmedSearch}%`
      }
    } as WhereOptions;
  }

  // Se não há campos especificados, retornar null
  if (searchFields.length === 0) {
    return null;
  }

  // Buscar em todos os campos especificados (OR)
  const conditions = searchFields.map(field => ({
    [field]: {
      [Op.like]: `%${trimmedSearch}%`
    }
  }));

  return {
    [Op.or]: conditions
  } as WhereOptions;
}

/**
 * Constrói filtro de busca por valor numérico (com tolerância)
 * @param searchTerm - Termo de busca (pode conter formatação de número)
 * @param field - Campo numérico a buscar
 * @param tolerance - Tolerância percentual (padrão: 10%)
 * @returns WhereOptions com filtro de valor ou null se termo inválido
 */
export function buildNumericSearchFilter(
  searchTerm: string | null | undefined,
  field: string,
  tolerance = 0.1
): WhereOptions | null {
  if (!searchTerm || !searchTerm.trim()) {
    return null;
  }

  // Remover caracteres não numéricos (exceto ponto e vírgula para decimais)
  const cleanedValue = searchTerm.replace(/[^\d.,]/g, '').replace(',', '.');
  const numericValue = parseFloat(cleanedValue);

  if (isNaN(numericValue)) {
    return null;
  }

  // Aplicar tolerância
  const minValue = numericValue * (1 - tolerance);
  const maxValue = numericValue * (1 + tolerance);

  return {
    [field]: {
      [Op.gte]: minValue,
      [Op.lte]: maxValue
    }
  } as WhereOptions;
}

/**
 * Constrói filtro de busca por data a partir de string
 * @param searchTerm - Termo de busca (pode ser data em formato brasileiro ou ISO)
 * @param field - Campo de data a buscar
 * @returns WhereOptions com filtro de data ou null se termo inválido
 */
export function buildDateSearchFilter(
  searchTerm: string | null | undefined,
  field = 'data_vencimento'
): WhereOptions | null {
  if (!searchTerm || !searchTerm.trim()) {
    return null;
  }

  const normalizedDate = normalizeDateForDb(searchTerm.trim());
  if (!normalizedDate) {
    return null;
  }

  // Buscar pelo dia inteiro (00:00:00 até 23:59:59.999)
  const startOfDay = new Date(normalizedDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(normalizedDate);
  endOfDay.setHours(23, 59, 59, 999);

  return {
    [field]: {
      [Op.gte]: startOfDay,
      [Op.lte]: endOfDay
    }
  } as WhereOptions;
}

/**
 * Combina múltiplos filtros WhereOptions em um único filtro
 * @param filters - Array de filtros (valores null/undefined são ignorados)
 * @returns WhereOptions combinado ou null se nenhum filtro válido
 */
export function combineFilters(...filters: Array<WhereOptions | null | undefined>): WhereOptions | null {
  const validFilters = filters.filter((f): f is WhereOptions => f !== null && f !== undefined);

  if (validFilters.length === 0) {
    return null;
  }

  if (validFilters.length === 1) {
    return validFilters[0];
  }

  return {
    [Op.and]: validFilters
  } as WhereOptions;
}
