import React, { useMemo } from 'react';
import Table from 'components/tables/Table';
import { DateRangeFilter, StatusBadge } from 'components/ui';
import { useI18n } from 'contexts/I18nContext';
import { AgendaCobranca } from 'services/cobrancaPainelService';
import { formatCurrency, formatDate } from 'utils/formatters';
import { rotuloCanal, rotuloPasso, rotuloSituacao } from './cobrancaLabels';

interface CobrancaAgendaPainelProps {
  dados?: AgendaCobranca;
  loading: boolean;
  fetching: boolean;
  dataInicio: string;
  dataFim: string;
  search: string;
  searchField: string;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  onDataInicioChange: (valor: string) => void;
  onDataFimChange: (valor: string) => void;
  onSearch: (termo: string, campo: string) => void;
  onSearchFieldChange: (campo: string) => void;
  onSort: (coluna: string, direcao: 'asc' | 'desc') => void;
  onPageChange: (pagina: number) => void;
  onLimitChange: (limite: number) => void;
  onRefresh: () => void;
}

const VARIANTE_SITUACAO = {
  vai_sair: 'info',
  sai_hoje: 'warning',
  ja_passou: 'secondary',
} as const;

const CobrancaAgendaPainel: React.FC<CobrancaAgendaPainelProps> = ({
  dados,
  loading,
  fetching,
  dataInicio,
  dataFim,
  search,
  searchField,
  sortColumn,
  sortDirection,
  onDataInicioChange,
  onDataFimChange,
  onSearch,
  onSearchFieldChange,
  onSort,
  onPageChange,
  onLimitChange,
  onRefresh,
}) => {
  const { t } = useI18n();
  const itens = dados?.itens ?? [];
  const paginacao = dados?.pagination;
  const searchFields = useMemo(
    () => [
      { key: 'cliente', label: t('cobranca.searchClient') },
      { key: 'numero_titulo', label: t('cobranca.searchTitle') },
    ],
    [t]
  );

  return (
    <div className="d-flex flex-column flex-grow-1 min-h-0">
      <p className="form-helper-message px-3 pt-2 mb-0">
        {dados?.sem_passos ? t('cobranca.agendaSemPassos') : t('cobranca.agendaHelp')}
      </p>
      <Table
        tableId="cobranca-agenda"
        title={t('cobranca.tabAgenda')}
        syncWithHeader={false}
        search={search}
        onSearch={onSearch}
        onSearchFieldChange={onSearchFieldChange}
        onSort={onSort}
        onPageChange={onPageChange}
        onPageSizeChange={onLimitChange}
        onRefresh={onRefresh}
        config={{
          searchField,
          searchFields,
          sortColumn,
          sortDirection,
          loading,
          fetching,
          selectable: false,
          emptyMessage: t('cobranca.emptyAgenda'),
          customControls: (
            <DateRangeFilter
              variant="table"
              idPrefix="cobranca-agenda"
              startDate={dataInicio}
              endDate={dataFim}
              onStartDateChange={onDataInicioChange}
              onEndDateChange={onDataFimChange}
            />
          ),
          pagination: paginacao
            ? {
                currentPage: paginacao.current_page,
                lastPage: paginacao.last_page,
                perPage: paginacao.per_page,
                total: paginacao.total,
                from: paginacao.from,
                to: paginacao.to,
              }
            : undefined,
          data: itens,
          columns: [
            { key: 'cliente', label: t('form.client'), sortable: true },
            { key: 'numero_titulo', label: t('form.title'), sortable: true },
            { key: 'data_vencimento', label: t('form.dueDate'), sortable: true, render: (item) => formatDate(item.data_vencimento) },
            { key: 'data_envio', label: t('cobranca.sendDate'), sortable: true, render: (item) => formatDate(item.data_envio) },
            { key: 'dias', label: t('cobranca.notice'), render: (item) => rotuloPasso(t, item.momento, item.dias) },
            { key: 'canal', label: t('cobranca.channel'), sortable: true, render: (item) => rotuloCanal(t, item.canal) },
            {
              key: 'situacao',
              label: t('table.status'),
              sortable: true,
              render: (item) => <StatusBadge variant={VARIANTE_SITUACAO[item.situacao]} label={rotuloSituacao(t, item.situacao)} />,
            },
            { key: 'valor', label: t('form.value'), sortable: true, render: (item) => formatCurrency(item.valor) },
          ],
        }}
      />
    </div>
  );
};

export default CobrancaAgendaPainel;
