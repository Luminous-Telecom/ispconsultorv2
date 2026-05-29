import type { ListModalConfig } from 'types/modal';
import { Dominio } from 'types';
import type { BlockdomiTranslateFn } from './blockdomiListTypes';
import { getBlockdomiCommonColumns, getBlockdomiIdColumn } from './blockdomiListCommonColumns';

export function getBlockdomiDominioColumns(
  t: BlockdomiTranslateFn
): ListModalConfig<Dominio>['columns'] {
  return [
    getBlockdomiIdColumn<Dominio>(t),
    {
      key: 'dominio',
      label: t('blockdomi.domain'),
      sortable: true,
      width: '200px',
      render: (item) => item.dominio,
    },
    ...getBlockdomiCommonColumns<Dominio>(t),
  ];
}

export function getBlockdomiDominioSearchFields(t: BlockdomiTranslateFn) {
  return [
    { key: 'id', label: t('table.id') },
    { key: 'dominio', label: t('blockdomi.domain') },
    { key: 'descricao', label: t('form.description') },
    { key: 'nome_oficio', label: t('blockdomi.nomeOficio') },
    { key: 'numero_sei_anatel', label: t('blockdomi.numeroSeiAnatel') },
  ];
}
