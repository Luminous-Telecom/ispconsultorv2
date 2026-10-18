export type FixedDropdownPosition = {
  left: number;
  top: number;
};

export type FixedDropdownAlign = 'start' | 'end';

const GAP_PX = 4;
const VIEWPORT_MARGIN_PX = 8;
const FALLBACK_WIDTH_PX = 200;

/**
 * Posição fixed para menus em portal (evita clip de overflow do modal).
 * `end` alinha a direita do menu à direita do trigger; `start` à esquerda.
 */
export function computeFixedDropdownPosition(
  triggerRect: DOMRect,
  options?: {
    align?: FixedDropdownAlign;
    menuWidth?: number;
    menuHeight?: number;
    gapPx?: number;
    viewportMarginPx?: number;
  }
): FixedDropdownPosition {
  const align = options?.align ?? 'start';
  const menuWidth = options?.menuWidth ?? FALLBACK_WIDTH_PX;
  const menuHeight = options?.menuHeight ?? 0;
  const gapPx = options?.gapPx ?? GAP_PX;
  const margin = options?.viewportMarginPx ?? VIEWPORT_MARGIN_PX;

  const preferredLeft =
    align === 'end' ? triggerRect.right - menuWidth : triggerRect.left;
  const maxLeft = window.innerWidth - menuWidth - margin;
  const left = Math.max(margin, Math.min(preferredLeft, maxLeft));

  const topBelow = triggerRect.bottom + gapPx;
  const topAbove = triggerRect.top - menuHeight - gapPx;
  const shouldOpenAbove =
    menuHeight > 0 && topBelow + menuHeight > window.innerHeight - margin;
  const top = shouldOpenAbove
    ? Math.max(margin, topAbove)
    : topBelow;

  return { left, top };
}
