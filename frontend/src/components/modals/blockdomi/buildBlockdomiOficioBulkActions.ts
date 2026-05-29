import type { ListModalProps } from 'types/modal';
import type { BlockdomiOficioListRow, BlockdomiTranslateFn } from './blockdomiListTypes';

type OficioBulkAction<T extends BlockdomiOficioListRow> = NonNullable<
  ListModalProps<T>['bulkActions']
>[number];

export function buildBlockdomiOficioBulkActions<T extends BlockdomiOficioListRow>({
  t,
  resolveItems,
}: {
  t: BlockdomiTranslateFn;
  resolveItems: (selectedItems: T[]) => T[];
}): OficioBulkAction<T>[] {
  return [
    {
      label: t('blockdomi.anatel'),
      variant: 'primary',
      disabled: (selectedItems: T[]) => {
        const items = resolveItems(selectedItems);
        return items.length === 0 || !items.some((i) => i.link_oficio_anatel?.trim());
      },
      action: (selectedItems: T[]) => {
        resolveItems(selectedItems)
          .filter((i) => i.link_oficio_anatel?.trim())
          .forEach((i) => window.open(i.link_oficio_anatel!, '_blank', 'noopener,noreferrer'));
      },
    },
    {
      label: t('blockdomi.justica'),
      variant: 'primary',
      disabled: (selectedItems: T[]) => {
        const items = resolveItems(selectedItems);
        return items.length === 0 || !items.some((i) => i.link_oficio_justica?.trim());
      },
      action: (selectedItems: T[]) => {
        resolveItems(selectedItems)
          .filter((i) => i.link_oficio_justica?.trim())
          .forEach((i) => {
            const urls = i
              .link_oficio_justica!.split(',')
              .map((url) => url.trim())
              .filter((url) => url);
            urls.forEach((url, index) => {
              setTimeout(() => window.open(url, '_blank', 'noopener,noreferrer'), index * 150);
            });
          });
      },
    },
    {
      label: t('blockdomi.planilhaDominios'),
      variant: 'primary',
      disabled: (selectedItems: T[]) => {
        const items = resolveItems(selectedItems);
        return items.length === 0 || !items.some((i) => i.link_planilha_dominios?.trim());
      },
      action: (selectedItems: T[]) => {
        resolveItems(selectedItems)
          .filter((i) => i.link_planilha_dominios?.trim())
          .forEach((i) =>
            window.open(i.link_planilha_dominios!, '_blank', 'noopener,noreferrer')
          );
      },
    },
  ];
}
