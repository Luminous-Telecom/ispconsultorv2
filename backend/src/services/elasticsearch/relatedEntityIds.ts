/**
 * Coleta identificadores relacionados para busca na raiz do documento de auditoria.
 * Com `dados_novos` / `dados_anteriores` com `enabled: false`, não é possível
 * consultar subcampos; use `related_entity_ids` (keyword) com `terms` / `term`.
 */
export function collectRelatedEntityIds(params: {
  entidadeId?: number | null;
  dadosNovos?: Record<string, unknown> | null;
  dadosAnteriores?: Record<string, unknown> | null;
}): string[] {
  const out = new Set<string>();
  const { entidadeId, dadosNovos, dadosAnteriores } = params;

  if (entidadeId != null && entidadeId > 0) {
    out.add(String(entidadeId));
  }

  const scan = (obj: Record<string, unknown> | null | undefined): void => {
    if (!obj || typeof obj !== 'object') return;

    const entityStr = obj.entity_id_str;
    if (typeof entityStr === 'string' && entityStr.trim()) {
      out.add(entityStr.trim());
    }

    if (typeof obj.id === 'number' && Number.isFinite(obj.id)) {
      out.add(String(obj.id));
    }

    for (const [key, value] of Object.entries(obj)) {
      if (key.endsWith('_id') && typeof value === 'number' && Number.isFinite(value)) {
        out.add(String(value));
      }
      if (key.endsWith('_ids') && Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'number' && Number.isFinite(item)) {
            out.add(String(item));
          }
        }
      }
    }
  };

  scan(dadosNovos ?? null);
  scan(dadosAnteriores ?? null);
  return [...out];
}
