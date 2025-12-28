// Utilitários de data centralizados usando date-fns
// Este arquivo contém funções de cálculo, comparação e conversão para ISO (API)
// Tipos estritos: não retorna '-' para null, retorna valores apropriados ou lança erros
import { 
  format, 
  parseISO, 
  isValid as isValidDateFns, 
  isFuture, 
  isPast, 
  differenceInDays,
  addDays as addDaysFns,
  addMonths as addMonthsFns,
  startOfDay,
  compareAsc
} from 'date-fns';

/**
 * Converte uma data para Date object
 */
const toDate = (date: string | Date | null | undefined): Date | null => {
  if (!date) return null;
  if (date instanceof Date) return isValidDateFns(date) ? date : null;
  if (typeof date === 'string') {
    // Se já for string no formato YYYY-MM-DD, usa parseISO
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return parseISO(date);
    }
    const parsed = new Date(date);
    return isValidDateFns(parsed) ? parsed : null;
  }
  return null;
};

/**
 * Converte uma data para o formato ISO (YYYY-MM-DD) usado em inputs type="date" e para API
 * Usa date-fns para evitar problemas de timezone
 * @param date - Data como string, Date ou null/undefined
 * @returns String no formato YYYY-MM-DD ou string vazia se inválida
 */
export const toISODateString = (date: string | Date | null | undefined): string => {
  if (!date) return '';
  
  try {
    // Se já for string no formato YYYY-MM-DD, retorna ela mesma
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }

    const d = toDate(date);
    if (!d) return '';
    
    return format(d, 'yyyy-MM-dd');
  } catch {
    return '';
  }
};

/**
 * Converte uma data para formato ISO completo (YYYY-MM-DDTHH:mm:ss.sssZ) para API
 * @param date - Data como string, Date ou null/undefined
 * @returns String no formato ISO ou string vazia se inválida
 */
export const toISOString = (date: string | Date | null | undefined): string => {
  if (!date) return '';
  
  try {
    const d = toDate(date);
    if (!d) return '';
    
    return d.toISOString();
  } catch {
    return '';
  }
};

/**
 * Obtém a data atual no formato ISO (YYYY-MM-DD)
 * @returns String no formato YYYY-MM-DD
 */
export const getTodayISO = (): string => {
  return format(new Date(), 'yyyy-MM-dd');
};

/**
 * Obtém a data atual como objeto Date com hora zerada
 * @returns Objeto Date com hora 00:00:00 no timezone local
 */
export const getToday = (): Date => {
  return startOfDay(new Date());
};

/**
 * Valida se uma data é válida
 * @param date - Data para validar
 * @returns true se válida, false caso contrário
 */
export const isValidDate = (date: string | Date | null | undefined): boolean => {
  if (!date) return false;
  
  try {
    const d = toDate(date);
    return d !== null && isValidDateFns(d);
  } catch {
    return false;
  }
};

/**
 * Verifica se uma data é futura
 * @param date - Data para verificar
 * @returns true se a data for futura, false caso contrário
 */
export const isFutureDate = (date: string | Date | null | undefined): boolean => {
  if (!date) return false;
  
  try {
    const d = toDate(date);
    if (!d) return false;
    
    return isFuture(d);
  } catch {
    return false;
  }
};

/**
 * Verifica se uma data é passada
 * @param date - Data para verificar
 * @returns true se a data for passada, false caso contrário
 */
export const isPastDate = (date: string | Date | null | undefined): boolean => {
  if (!date) return false;
  
  try {
    const d = toDate(date);
    if (!d) return false;
    
    return isPast(d);
  } catch {
    return false;
  }
};

/**
 * Calcula a diferença em dias entre duas datas
 * @param date1 - Primeira data
 * @param date2 - Segunda data
 * @returns Número de dias de diferença (positivo se date1 > date2)
 */
export const daysDifference = (date1: string | Date, date2: string | Date): number => {
  try {
    const d1 = toDate(date1);
    const d2 = toDate(date2);
    
    if (!d1 || !d2) return 0;
    
    return differenceInDays(d1, d2);
  } catch {
    return 0;
  }
};

/**
 * Adiciona dias a uma data
 * @param date - Data base
 * @param days - Número de dias a adicionar (pode ser negativo)
 * @returns Nova data como string ISO (YYYY-MM-DD)
 */
export const addDays = (date: string | Date, days: number): string => {
  try {
    const d = toDate(date);
    if (!d) return '';
    
    const result = addDaysFns(d, days);
    return format(result, 'yyyy-MM-dd');
  } catch {
    return '';
  }
};

/**
 * Adiciona meses a uma data
 * @param date - Data base
 * @param months - Número de meses a adicionar (pode ser negativo)
 * @returns Nova data como string ISO (YYYY-MM-DD)
 */
export const addMonths = (date: string | Date, months: number): string => {
  try {
    const d = toDate(date);
    if (!d) return '';
    
    const result = addMonthsFns(d, months);
    return format(result, 'yyyy-MM-dd');
  } catch {
    return '';
  }
};

/**
 * Compara duas datas
 * @param date1 - Primeira data
 * @param date2 - Segunda data
 * @returns -1 se date1 < date2, 0 se iguais, 1 se date1 > date2
 */
export const compareDates = (date1: string | Date, date2: string | Date): number => {
  try {
    const d1 = toDate(date1);
    const d2 = toDate(date2);
    
    if (!d1 || !d2) return 0;
    
    return compareAsc(d1, d2);
  } catch {
    return 0;
  }
};
