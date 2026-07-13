/** Protocolo enviado ao IXC na abertura (su_ticket.protocolo). */
export const ATENDIMENTO_PROTOCOLO_PREFIX = 'AT';

/** AT + AAAA + MM + DD + NNNNNN (ex.: AT20260712000482). */
export function generateAtendimentoProtocolo(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const seq = String(date.getTime() % 1_000_000).padStart(6, '0');
  return `${ATENDIMENTO_PROTOCOLO_PREFIX}${year}${month}${day}${seq}`;
}
