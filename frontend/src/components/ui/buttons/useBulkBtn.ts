import { useMemo } from 'react';
import { useI18n } from 'contexts/I18nContext';
import { getSystemButtonBulkProps } from './config';
import type { ButtonVariant } from '../Button';

export type BulkBtnProps = { label: string; variant: ButtonVariant };

/** Props de bulk action padronizadas — inclua `bulkBtn` nas deps do useMemo. */
export function useBulkBtn() {
  const { t } = useI18n();

  return useMemo(
    () => ({
      cancelar: getSystemButtonBulkProps('cancelar', t),
      selecionar: getSystemButtonBulkProps('selecionar', t),
      novo: getSystemButtonBulkProps('novo', t),
      editar: getSystemButtonBulkProps('editar', t),
      deletar: getSystemButtonBulkProps('deletar', t),
      imprimir: getSystemButtonBulkProps('imprimir', t),
      enviar: getSystemButtonBulkProps('enviar', t),
      receber: getSystemButtonBulkProps('receber', t),
      estornar: getSystemButtonBulkProps('estornar', t),
      visualizar: getSystemButtonBulkProps('visualizar', t),
      baixar: getSystemButtonBulkProps('baixar', t),
      inserir: getSystemButtonBulkProps('inserir', t),
      pagar: getSystemButtonBulkProps('pagar', t),
      duplicar: getSystemButtonBulkProps('duplicar', t),
      nfse: getSystemButtonBulkProps('nfse', t),
    }),
    [t]
  );
}
