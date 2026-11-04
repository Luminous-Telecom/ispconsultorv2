import { useState } from 'react';
import { TableFilterCheckbox } from 'components/ui';
import { useI18n } from 'contexts/I18nContext';

/** Com o checkbox desmarcado, a lista pede só ativos. Marcado, não filtra status. */
export function filtroSomenteAtivos<T>(showInactive: boolean, valorAtivo: T): T | undefined {
  return showInactive ? undefined : valorAtivo;
}

export function useMostrarInativos(setPage?: (page: number) => void) {
  const { t } = useI18n();
  const [showInactive, setShowInactive] = useState(false);

  const control = (
    <TableFilterCheckbox
      name="mostrar-inativos"
      label={t('filter.showInactive')}
      checked={showInactive}
      onChange={(checked) => {
        setShowInactive(checked);
        setPage?.(1);
      }}
    />
  );

  return { showInactive, control };
}
