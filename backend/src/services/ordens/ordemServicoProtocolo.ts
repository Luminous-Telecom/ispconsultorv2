/**
 * Protocolo de ordem de serviço.
 *
 * IXC (su_oss_chamado): sequência numérica — ano + contador (ex: 2026000001).
 * O webservice do BackNet valida apenas dígitos ao buscar o próximo protocolo no IXC.
 *
 * BackNet (ordens_servico): BN + AAAA + MM + NNNNNN (ex: BN202606000001).
 * Letras no prefixo evitam colisão com protocolos do IXC e identificam a origem local.
 */

export const LOCAL_PROTOCOLO_PREFIX = 'BN';

/** Protocolo gerado automaticamente pelo IXC (somente números). */
export const IXC_PROTOCOLO_PATTERN = /^\d+$/;

/** Protocolo de OS local do BackNet: BN + AAAA + MM + NNNNNN */
export const LOCAL_PROTOCOLO_PATTERN = /^BN\d{4}\d{2}\d{6}$/;

export function isIxcProtocolo(protocolo: string): boolean {
  return IXC_PROTOCOLO_PATTERN.test(protocolo.trim());
}

export function isLocalProtocolo(protocolo: string): boolean {
  return LOCAL_PROTOCOLO_PATTERN.test(protocolo.trim());
}

export function formatLocalProtocolo(year: number, month: number, sequence: number): string {
  const mm = String(month).padStart(2, '0');
  const seq = String(sequence).padStart(6, '0');
  return `${LOCAL_PROTOCOLO_PREFIX}${year}${mm}${seq}`;
}

export function parseLocalProtocolo(
  protocolo: string
): { year: number; month: number; sequence: number } | null {
  const match = protocolo.trim().match(/^BN(\d{4})(\d{2})(\d{6})$/);
  if (!match) return null;
  return {
    year: parseInt(match[1], 10),
    month: parseInt(match[2], 10),
    sequence: parseInt(match[3], 10),
  };
}

export function localProtocoloYearMonthPrefix(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${LOCAL_PROTOCOLO_PREFIX}${year}${month}`;
}
