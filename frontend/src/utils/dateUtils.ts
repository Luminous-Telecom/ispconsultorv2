// Utilitários de data centralizados usando date-fns
// Este arquivo contém funções de cálculo, comparação e conversão para ISO (API)
// Tipos estritos: não retorna '-' para null, retorna valores apropriados ou lança erros
import { 
  format, 
  parseISO, 
  isValid as isValidDateFns, 
   
   
  
  addDays as addDaysFns,
  addMonths as addMonthsFns
  
  
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
