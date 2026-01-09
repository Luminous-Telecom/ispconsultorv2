/**
 * Helpers para IntegrationWebhookController
 */

/**
 * Expande valores especiais de filtro de status de títulos
 */
export function expandTituloStatusFilters(statusFilters: string[]): string[] {
  const expanded: string[] = [];
  const validStatuses = ['pendente', 'pago', 'vencido', 'cancelado', 'parcial', 'pago_atraso'];

  for (const filter of statusFilters) {
    const normalized = filter.toLowerCase().trim();

    if (normalized === 'aberto') {
      expanded.push('pendente', 'vencido', 'parcial');
    } else if (normalized === 'atraso') {
      expanded.push('vencido');
    } else if (validStatuses.includes(normalized)) {
      expanded.push(normalized);
    }
  }

  return [...new Set(expanded)];
}

/**
 * Expande valores especiais de filtro de status de contratos
 */
export function expandContratoStatusFilters(statusFilters: string[]): {
  statuses: string[];
  includeAtrasados: boolean;
} {
  const expanded: string[] = [];
  const validStatuses = ['ativo', 'inativo', 'suspenso'];
  let includeAtrasados = false;

  for (const filter of statusFilters) {
    const normalized = filter.toLowerCase().trim();

    if (normalized === 'atrasado') {
      includeAtrasados = true;
    } else if (validStatuses.includes(normalized)) {
      expanded.push(normalized);
    }
  }

  return {
    statuses: [...new Set(expanded)],
    includeAtrasados
  };
}

/**
 * Valida e parseia limit
 */
export function parseLimit(limit?: number): number {
  if (!limit || Number.isNaN(limit)) {
    return 100;
  }
  return Math.max(1, Math.min(limit, 500));
}

/**
 * Valida e parseia offset
 */
export function parseOffset(offset?: number): number {
  if (!offset || Number.isNaN(offset)) {
    return 0;
  }
  return Math.max(0, offset);
}

/**
 * Parseia número
 */
export function parseNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return 0;
  }

  return parsed;
}

/**
 * Parseia número opcional
 */
export function parseNullableNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return parsed;
}
