/**
 * Horário do processo do servidor. Os dígitos saem de getHours/getDate
 * (o relógio do sistema) e o sufixo é o offset real desse processo.
 * JSON.stringify em Date usaria toISOString e mudaria o relógio para UTC.
 */

/**
 * Formata uma data em ISO com o relógio e o offset do servidor.
 *
 * @param date - Data como string, Date ou null/undefined
 * @returns String YYYY-MM-DDTHH:mm:ss.sss±HH:MM ou null se inválida
 *
 * @example
 * const date = new Date();
 * const isoLocal = formatDateISOLocal(date); // "2025-01-15T14:30:00.000-03:00" se o servidor estiver nesse fuso
 */
export function formatDateISOLocal(date: string | Date | null | undefined): string | null {
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
    const milliseconds = String(dateObj.getMilliseconds()).padStart(3, '0');
    const offsetMinutes = -dateObj.getTimezoneOffset();
    const offsetSign = offsetMinutes >= 0 ? '+' : '-';
    const abs = Math.abs(offsetMinutes);
    const offsetHours = String(Math.floor(abs / 60)).padStart(2, '0');
    const offsetMins = String(abs % 60).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}${offsetSign}${offsetHours}:${offsetMins}`;
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
 * Offset do processo do servidor, em horas (o mesmo de getTimezoneOffset).
 * @returns Ex.: -3 quando o relógio do servidor está em UTC-3
 */
export function getServerTimezoneOffset(): number {
  return -new Date().getTimezoneOffset() / 60;
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

