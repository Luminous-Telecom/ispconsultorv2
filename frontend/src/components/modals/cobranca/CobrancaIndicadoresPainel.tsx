import React, { useMemo } from 'react';
import StatTilesCard from 'components/dashboard/cards/StatTilesCard';
import Table from 'components/tables/Table';
import { FormField, StatusBadge } from 'components/ui';
import { COLOR } from 'constants/colors';
import { useI18n } from 'contexts/I18nContext';
import { IndicadoresCobranca } from 'services/cobrancaPainelService';
import { formatCurrency } from 'utils/formatters';
import { formatarPercentual, rotuloFaixa } from './cobrancaLabels';

interface CobrancaIndicadoresPainelProps {
  mes: string;
  onMesChange: (mes: string) => void;
  dados: IndicadoresCobranca;
}

const CobrancaIndicadoresPainel: React.FC<CobrancaIndicadoresPainelProps> = ({ mes, onMesChange, dados }) => {
  const { t, language } = useI18n();
  const percentual = (valor: number) => formatarPercentual(valor, language);

  const faixas = useMemo(
    () => dados.faixas.map((faixa) => ({ ...faixa, id: faixa.faixa })),
    [dados.faixas]
  );
  const dias = useMemo(
    () => dados.melhores_datas.map((dia) => ({ ...dia, id: dia.dia })),
    [dados.melhores_datas]
  );

  return (
    <div className="cobranca-painel-tab-content cobranca-painel-tab-content-padded overflow-auto">
      <form className="form-modal-simple">
        <div className="row g-2">
          <div className="col-12">
            <FormField
              name="mes"
              type="month"
              size="sm"
              label={t('cobranca.month')}
              value={mes}
              onChange={(value) => onMesChange(String(value ?? ''))}
            />
          </div>
        </div>
      </form>
      <StatTilesCard
        title={t('cobranca.tabIndicators')}
        columns={3}
        tiles={[
          { label: t('cobranca.openInMonth'), value: percentual(dados.inadimplencia_mes.percentual), accent: COLOR.amber },
          { label: t('cobranca.delinquency'), value: percentual(dados.inadimplencia_estoque.percentual), accent: COLOR.red },
          { label: t('cobranca.overdueAmount'), value: formatCurrency(dados.valor_em_atraso), accent: COLOR.redDark },
          { label: t('cobranca.delinquentClients'), value: percentual(dados.clientes.percentual), accent: COLOR.sky },
          { label: t('cobranca.averageDelay'), value: t('cobranca.days', { count: dados.atraso_medio_dias }), accent: COLOR.indigo },
        ]}
      />
      <p className="form-helper-message">{t('cobranca.bestDatesHelp', { min: dados.volume_minimo })}</p>
      {dados.melhor_dia == null ? <p className="form-helper-message">{t('cobranca.noBestDay')}</p> : null}
      <Table
        tableId="cobranca-faixas"
        title={t('cobranca.agingTitle')}
        syncWithHeader={false}
        config={{
          columns: [
            { key: 'faixa', label: t('cobranca.bucket'), render: (item) => rotuloFaixa(t, item.faixa) },
            { key: 'titulos', label: t('cobranca.titles') },
            { key: 'clientes', label: t('cobranca.clients') },
            { key: 'valor', label: t('cobranca.amount'), render: (item) => formatCurrency(item.valor) },
          ],
          data: faixas,
          searchable: false,
          selectable: false,
          showToolbar: false,
          emptyMessage: t('cobranca.emptyIndicators'),
        }}
      />
      <Table
        tableId="cobranca-datas"
        title={t('cobranca.bestDatesTitle')}
        syncWithHeader={false}
        config={{
          columns: [
            { key: 'dia', label: t('cobranca.dueDay') },
            { key: 'percentual_no_prazo', label: t('cobranca.onTime'), render: (item) => percentual(item.percentual_no_prazo) },
            { key: 'percentual_ate_5_dias', label: t('cobranca.within5'), render: (item) => percentual(item.percentual_ate_5_dias) },
            { key: 'atraso_medio_dias', label: t('cobranca.averageDelay'), render: (item) => t('cobranca.days', { count: item.atraso_medio_dias }) },
            { key: 'titulos', label: t('cobranca.volume') },
            {
              key: 'destaque',
              label: t('cobranca.best'),
              render: (item) => {
                if (item.dia === dados.melhor_dia) return <StatusBadge variant="success" label={t('cobranca.best')} />;
                if (item.abaixo_do_minimo) return <StatusBadge variant="secondary" label={t('cobranca.lowVolume')} />;
                return '—';
              },
            },
          ],
          data: dias,
          searchable: false,
          selectable: false,
          showToolbar: false,
          emptyMessage: t('cobranca.noBestDay'),
        }}
      />
    </div>
  );
};

export default CobrancaIndicadoresPainel;
