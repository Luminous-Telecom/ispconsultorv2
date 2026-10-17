/**
 * Utilitários para conversão e formatação de horários com timezone
 * Mantém o horário local do servidor (Brasil -03:00) ao invés de converter para UTC
 */

/**
 * Formata uma data para string ISO mantendo o horário local do servidor
 * A data já chega no horário local do servidor (timezone: '-03:00')
 * Esta função apenas formata como string ISO com timezone local antes da serialização JSON
 * (evita que JSON.stringify converta automaticamente para UTC)
 * 
 * @param date - Data como string, Date ou null/undefined (já no horário local)
 * @returns String no formato ISO com timezone local (YYYY-MM-DDTHH:mm:ss.sss-03:00) ou null se inválida
 * 
 * @example
 * const date = new Date(); // Horário local do servidor
 * const isoLocal = formatDateISOLocal(date); // "2025-01-15T14:30:00.000-03:00"
 */
export function formatDateISOLocal(date: string | Date | null | undefined): string | null {
  if (!date) return null;
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) return null;
    
    // Componentes no horário local do servidor, sem converter para UTC
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const seconds = String(dateObj.getSeconds()).padStart(2, '0');
    const milliseconds = String(dateObj.getMilliseconds()).padStart(3, '0');
    
    // Timezone do Brasil (UTC-3) - necessário para o JavaScript interpretar corretamente
    // Strings ISO sem timezone são interpretadas como UTC pelo new Date()
    const timezoneOffset = -3;
    const offsetHours = Math.abs(timezoneOffset);
    const offsetSign = timezoneOffset < 0 ? '-' : '+';
    const offsetString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:00`;
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}${offsetString}`;
  } catch {
    return null;
  }
}

/**
 * Converte uma data para string ISO mantendo o horário local (com tratamento de erro robusto)
 * Usado principalmente para serialização de dados em auditoria e logs
 * 
 * @param date - Data como string, Date ou null/undefined
 * @returns String no formato ISO com timezone local ou null se inválida
 */
export function safeFormatDateISOLocal(date: string | Date | null | undefined): string | null {
  return formatDateISOLocal(date);
}

/**
 * Formata uma data para string ISO no horário local (sem milissegundos)
 * Útil quando não precisa de precisão de milissegundos
 * 
 * @param date - Data como string, Date ou null/undefined
 * @returns String no formato ISO com timezone local sem milissegundos ou null se inválida
 */
export function formatDateISOLocalSimple(date: string | Date | null | undefined): string | null {
  if (!date) return null;
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) return null;
    
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const seconds = String(dateObj.getSeconds()).padStart(2, '0');
    
    const timezoneOffset = -3;
    const offsetHours = Math.abs(timezoneOffset);
    const offsetSign = timezoneOffset < 0 ? '-' : '+';
    const offsetString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:00`;
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetString}`;
  } catch {
    return null;
  }
}

/**
 * Obtém o offset de timezone do servidor (Brasil -03:00)
 * @returns Offset em horas (ex: -3 para UTC-3)
 */
export function getServerTimezoneOffset(): number {
  return -3; // Brasil (UTC-3)
}

/**
 * Obtém o offset de timezone como string formatada
 * @returns String no formato "-03:00" ou "+03:00"
 */
export function getServerTimezoneOffsetString(): string {
  const offset = getServerTimezoneOffset();
  const offsetHours = Math.abs(offset);
  const offsetSign = offset < 0 ? '-' : '+';
  return `${offsetSign}${String(offsetHours).padStart(2, '0')}:00`;
}

/**
 * Obtém timestamp atual no formato ISO com timezone local
 * Função helper para facilitar uso em logs, timestamps, etc.
 * @returns String no formato ISO com timezone local ou string vazia se inválida
 */
export function getCurrentTimestamp(): string {
  return safeFormatDateISOLocal(new Date()) || '';
}

/**
 * Extrai apenas a data (YYYY-MM-DD) de uma data, mantendo o horário local
 * Útil para comparações de datas sem hora e para APIs que precisam apenas da data
 * @param date - Data como string, Date ou null/undefined
 * @returns String no formato YYYY-MM-DD ou null se inválida
 */
export function formatDateOnly(date: string | Date | null | undefined): string | null {
  if (!date) return null;
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) return null;
    
    // Usar componentes locais para garantir que a data não mude por causa do timezone
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch {
    return null;
  }
}

/**
 * Formata data para ISO mantendo timezone local (para APIs externas que aceitam timezone)
 * Se a API exigir UTC, use toISOString() diretamente
 * @param date - Data como string, Date ou null/undefined
 * @returns String no formato ISO com timezone local ou null se inválida
 */
export function formatDateISOForAPI(date: string | Date | null | undefined): string | null {
  return safeFormatDateISOLocal(date);
}

