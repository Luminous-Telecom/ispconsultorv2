// Utilitários de data centralizados

/**
 * Converte uma data para o formato ISO (YYYY-MM-DD) usado em inputs type="date"
 * @param date - Data como string, Date ou null/undefined
 * @returns String no formato YYYY-MM-DD ou string vazia
 */
export const toISODateString = (date: string | Date | null | undefined): string => {
  if (!date) return '';
  
  try {
    // Se já for string no formato YYYY-MM-DD, retorna ela mesma
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }

    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    // Usa getFullYear, getMonth, getDate locais para evitar conversão para UTC que muda o dia
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
};

/**
 * Converte uma data para o formato brasileiro (DD/MM/YYYY)
 * @param date - Data como string, Date ou null/undefined
 * @returns String formatada como dd/mm/aaaa ou '-'
 */
export const toBrazilianDate = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  
  try {
    // Se for string YYYY-MM-DD, tratar manualmente para evitar timezone
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [year, month, day] = date.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString('pt-BR');
    }

    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    
    return d.toLocaleDateString('pt-BR');
  } catch {
    return '-';
  }
};

/**
 * Converte uma data para o formato brasileiro com hora (DD/MM/YYYY HH:MM)
 * @param date - Data como string, Date ou null/undefined
 * @returns String formatada como dd/mm/aaaa hh:mm ou '-'
 */
export const toBrazilianDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    
    return d.toLocaleString('pt-BR');
  } catch {
    return '-';
  }
};

/**
 * Obtém a data atual no formato ISO (YYYY-MM-DD)
 * @returns String no formato YYYY-MM-DD
 */
export const getTodayISO = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Obtém a data atual como objeto Date com hora zerada
 * @returns Objeto Date com hora 00:00:00
 */
export const getToday = (): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

/**
 * Valida se uma data é válida
 * @param date - Data para validar
 * @returns true se válida, false caso contrário
 */
export const isValidDate = (date: string | Date | null | undefined): boolean => {
  if (!date) return false;
  
  try {
    const d = new Date(date);
    return !isNaN(d.getTime());
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
  if (!date || !isValidDate(date)) return false;
  
  const d = new Date(date);
  const today = getToday();
  
  return d > today;
};

/**
 * Verifica se uma data é passada
 * @param date - Data para verificar
 * @returns true se a data for passada, false caso contrário
 */
export const isPastDate = (date: string | Date | null | undefined): boolean => {
  if (!date || !isValidDate(date)) return false;
  
  const d = new Date(date);
  const today = getToday();
  
  return d < today;
};

/**
 * Calcula a diferença em dias entre duas datas
 * @param date1 - Primeira data
 * @param date2 - Segunda data
 * @returns Número de dias de diferença (positivo se date1 > date2)
 */
export const daysDifference = (date1: string | Date, date2: string | Date): number => {
  try {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
    
    const diffTime = d1.getTime() - d2.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
};

/**
 * Adiciona dias a uma data
 * @param date - Data base
 * @param days - Número de dias a adicionar (pode ser negativo)
 * @returns Nova data como string ISO
 */
export const addDays = (date: string | Date, days: number): string => {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
};

/**
 * Adiciona meses a uma data
 * @param date - Data base
 * @param months - Número de meses a adicionar (pode ser negativo)
 * @returns Nova data como string ISO
 */
export const addMonths = (date: string | Date, months: number): string => {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split('T')[0];
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
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
    
    if (d1 < d2) return -1;
    if (d1 > d2) return 1;
    return 0;
  } catch {
    return 0;
  }
};

