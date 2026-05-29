import type { MensagemItem } from './types';

export function formatMensagemEmpresaNome(i: MensagemItem & { empresa_nome?: string | null }): string {
  const flat = (i.empresa_nome ?? '').trim();
  if (flat) return flat;
  const e = i.empresa;
  const razao = (e?.razao_social ?? '').trim();
  if (razao) return razao;
  const fantasia = (e?.nome_fantasia ?? '').trim();
  if (fantasia) return fantasia;
  const ne = (e?.nome_empresa ?? '').trim();
  return ne || '—';
}

export function formatOperacionalPayloadPreview(
  payload: Record<string, unknown> | string | null | undefined,
  fallbackText?: string | null
): { display: string; title: string } {
  let obj: Record<string, unknown> | null = null;
  if (payload != null && typeof payload === 'string') {
    const t = payload.trim();
    if (t) {
      try {
        const p = JSON.parse(t) as unknown;
        if (p != null && typeof p === 'object' && !Array.isArray(p)) obj = p as Record<string, unknown>;
      } catch {
        obj = { _valor_texto: t.slice(0, 2000) };
      }
    }
  } else if (payload != null && typeof payload === 'object' && !Array.isArray(payload)) {
    obj = payload as Record<string, unknown>;
  }

  if (!obj || Object.keys(obj).length === 0) {
    const fb = (fallbackText ?? '').trim();
    if (fb) {
      const max = 140;
      const display = fb.length > max ? `${fb.slice(0, max)}…` : fb;
      const titleMax = 8000;
      const title = fb.length > titleMax ? `${fb.slice(0, titleMax)}…` : fb;
      return { display, title };
    }
    return { display: '—', title: '' };
  }
  let s: string;
  try {
    s = JSON.stringify(obj);
  } catch {
    return { display: '—', title: '' };
  }
  const max = 140;
  const display = s.length > max ? `${s.slice(0, max)}…` : s;
  const titleMax = 8000;
  const title = s.length > titleMax ? `${s.slice(0, titleMax)}…` : s;
  return { display, title };
}
