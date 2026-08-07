import type { EntityItem, StringEntityItem } from 'components/ui/EntitySelectField';

export function mapLookupItemsToStringEntities(
  items: Array<{ id: string; nome: string }> = []
): StringEntityItem[] {
  return items.map((item) => ({ id: String(item.id), nome: item.nome }));
}

/** Garante que o item selecionado apareça no campo mesmo fora da lista carregada. */
export function buildNumberEntitySelectEntities(
  items: EntityItem[],
  selectedId?: number | null,
  selectedNome?: string
): EntityItem[] {
  const id = selectedId ?? 0;
  if (id <= 0) return items;
  if (items.some((item) => item.id === id)) return items;
  const nome = selectedNome?.trim();
  return nome ? [...items, { id, nome }] : items;
}

/** Garante que o item selecionado apareça no campo mesmo fora da lista carregada. */
export function buildStringEntitySelectEntities(
  items: StringEntityItem[],
  selectedId?: string,
  selectedNome?: string
): StringEntityItem[] {
  const id = (selectedId ?? '').trim();
  if (!id) return items;
  if (items.some((item) => item.id === id)) return items;
  const nome = selectedNome?.trim();
  return nome ? [...items, { id, nome }] : items;
}
