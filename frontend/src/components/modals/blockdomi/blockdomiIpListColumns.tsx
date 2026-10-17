import type { ListModalConfig } from 'types/modal';
import type { BlockdomiIpRow } from './blockdomiIpListVariants';
import type { BlockdomiTranslateFn } from './blockdomiListTypes';
import {
  getBlockdomiAtivoColumn,
  getBlockdomiCommonColumns,
  getBlockdomiIdColumn,
} from './blockdomiListCommonColumns';

export interface BlockdomiIpColumnOptions {
  ipColumnLabel: string;
  ipColumnWidth: string;
  t: BlockdomiTranslateFn;
}

export function getBlockdomiIpColumns({
  ipColumnLabel,
  ipColumnWidth,
  t,
}: BlockdomiIpColumnOptions): ListModalConfig<BlockdomiIpRow>['columns'] {
  return [
    getBlockdomiAtivoColumn<BlockdomiIpRow>(t),
    getBlockdomiIdColumn<BlockdomiIpRow>(t),
    {
      key: 'ip',
      label: ipColumnLabel,
      sortable: true,
      width: ipColumnWidth,
      render: (item) => item.ip,
    },
    ...getBlockdomiCommonColumns<BlockdomiIpRow>(t),
  ];
}
