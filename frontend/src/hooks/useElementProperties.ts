import { RefObject, useLayoutEffect } from 'react';

type CssPropertyMap = Record<string, string | number | undefined | null>;

/**
 * Aplica propriedades CSS no elemento via ref — evita style={{}} no JSX.
 * Aceita propriedades camelCase ou variáveis CSS (--nome).
 */
export function useElementProperties(
  ref: RefObject<HTMLElement | null>,
  properties: CssPropertyMap,
  deps: readonly unknown[] = [],
): void {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    for (const [key, value] of Object.entries(properties)) {
      if (value === undefined || value === null) continue;
      const prop = key.startsWith('--') ? key : key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
      el.style.setProperty(prop, String(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, ...deps]);
}
