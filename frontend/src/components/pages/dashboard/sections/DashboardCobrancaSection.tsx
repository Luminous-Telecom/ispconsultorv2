import React from 'react';
import Loading from 'components/common/Loading';
import { useDashboardFilters } from 'contexts/DashboardFiltersContext';
import { useI18n } from 'contexts/I18nContext';
import { useCobrancaIndicadores } from 'hooks/useCobrancaPainel';
import CobrancaIndicadoresPainel from 'components/modals/cobranca/CobrancaIndicadoresPainel';
import { mesAtual } from 'components/modals/cobranca/cobrancaLabels';

const DashboardCobrancaSection: React.FC = () => {
  const { t } = useI18n();
  const { startDate } = useDashboardFilters();
  const mes = startDate.length >= 7 ? startDate.slice(0, 7) : mesAtual();
  const indicadores = useCobrancaIndicadores(mes, true);

  if (indicadores.isLoading) {
    return <Loading variant="inline" />;
  }

  if (!indicadores.data?.data) {
    return <p className="form-helper-message">{t('cobranca.emptyIndicators')}</p>;
  }

  return <CobrancaIndicadoresPainel dados={indicadores.data.data} />;
};

export default DashboardCobrancaSection;
