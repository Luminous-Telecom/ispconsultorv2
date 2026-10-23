import type { ListModalProps } from 'types/modal';
import type { BlockdomiOficioListRow } from './blockdomiListTypes';

type OficioBulkAction<T extends BlockdomiOficioListRow> = NonNullable<
  ListModalProps<T>['bulkActions']
>[number];

export function buildBaixarPdfsBulkAction<T extends BlockdomiOficioListRow>({
  label,
  variant,
  isPending,
  onDownload,
}: {
  label: string;
  variant: OficioBulkAction<T>['variant'];
  isPending: boolean;
  onDownload: () => void;
}): OficioBulkAction<T> {
  return {
    label,
    variant,
    requiresSelection: false,
    disabled: () => isPending,
    action: () => {
      onDownload();
    },
  };
}
