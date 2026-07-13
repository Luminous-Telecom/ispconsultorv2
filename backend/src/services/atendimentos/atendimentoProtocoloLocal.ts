/**
 * Protocolo local de atendimento (ISP Consultor).
 * AT + AAAA + MM + NNNNNN — sequência única no banco (índice unique em `protocolo`).
 */

export const LOCAL_ATENDIMENTO_PROTOCOLO_PREFIX = 'AT';

export const LOCAL_ATENDIMENTO_PROTOCOLO_PATTERN = /^AT\d{4}\d{2}\d{6}$/;

export function formatLocalAtendimentoProtocolo(
  year: number,
  month: number,
  sequence: number
): string {
  const mm = String(month).padStart(2, '0');
  const seq = String(sequence).padStart(6, '0');
  return `${LOCAL_ATENDIMENTO_PROTOCOLO_PREFIX}${year}${mm}${seq}`;
}

export function parseLocalAtendimentoProtocolo(
  protocolo: string
): { year: number; month: number; sequence: number } | null {
  const match = protocolo.trim().match(/^AT(\d{4})(\d{2})(\d{6})$/);
  if (!match) return null;
  return {
    year: parseInt(match[1], 10),
    month: parseInt(match[2], 10),
    sequence: parseInt(match[3], 10),
  };
}

export function localAtendimentoProtocoloYearMonthPrefix(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${LOCAL_ATENDIMENTO_PROTOCOLO_PREFIX}${year}${month}`;
}
