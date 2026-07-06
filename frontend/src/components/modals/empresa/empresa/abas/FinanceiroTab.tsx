import React, { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DadosEmpresaService } from 'services/dadosEmpresaService';
import type { SaasTitulo } from 'services/saas/saasCrudService';
import { formatDate, formatCurrency } from 'utils/formatters';
import { getTituloStatusEfetivo } from 'utils/tituloStatus';
import { useI18n } from 'contexts/I18nContext';
import { Loading, useBulkBtn } from 'components/ui';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import SearchBar from 'components/ui/SearchBar';
import EmbeddedTablePanel from 'components/common/EmbeddedTablePanel';
import { TableConfig, BulkAction, SortDirection } from 'components/tables/types';
import ImprimirModal from 'components/common/ImprimirModal';

interface FinanceiroTabProps {
  empresaId?: number | null;
  tipo: 'abertas' | 'pagas';
}

type SaasTituloComPlano = SaasTitulo & { plano_nome?: string };

const FinanceiroTab: React.FC<FinanceiroTabProps> = ({ empresaId, tipo }) => {
  const { t } = useI18n();
  const bulkBtn = useBulkBtn();
  const { success, error } = useNotificationContext();
  const [selectedItems, setSelectedItems] = useState<SaasTitulo[]>([]);
  const [showImprimirModal, setShowImprimirModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [sortColumn, setSortColumn] = useState<string>('data_vencimento');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState('plano_nome');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dados-empresa-titulos-saas', empresaId, tipo],
    queryFn: () => DadosEmpresaService.getTitulosSaas(empresaId!, tipo),
    enabled: empresaId != null && empresaId > 0,
    staleTime: 0,
  });

  const titulos = useMemo(() => {
    const items = (data?.data ?? []) as SaasTitulo[];
    return items.map(t => ({ ...t, plano_nome: (t.plano as { nome?: string })?.nome ?? '' })) as SaasTituloComPlano[];
  }, [data?.data]);

  const searchFields = useMemo(() => [
    { key: 'plano_nome', label: t('table.plan') },
    { key: 'numero_titulo', label: t('table.titleNumber') },
    { key: 'valor', label: t('table.value') },
    { key: 'status', label: t('table.status') },
  ], [t]);

  const titulosFiltrados = useMemo(() => {
    if (!searchTerm.trim()) return titulos;
    const term = searchTerm.toLowerCase().trim();
    return titulos.filter(t => {
      let value: string;
      if (searchField === 'plano_nome') {
        value = (t as SaasTituloComPlano).plano_nome ?? (t.plano as { nome?: string })?.nome ?? '';
      } else if (searchField === 'numero_titulo') {
        value = String(t.numero_titulo ?? '');
      } else if (searchField === 'valor') {
        value = String(t.valor ?? '');
      } else {
        value = String(t.status ?? '');
      }
      return value.toLowerCase().includes(term);
    });
  }, [titulos, searchTerm, searchField]);

  const clearPdfUrl = useCallback(() => {
    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  }, [pdfUrl]);

  const openPrintModal = useCallback(() => {
    clearPdfUrl();
    setShowImprimirModal(true);
    setIsGeneratingPdf(true);
  }, [clearPdfUrl]);

  const statusAbertos = useMemo(() => ['pendente', 'vencido'], []);
  const statusPagas = useMemo(() => ['pago', 'pago_atraso', 'parcial'], []);

  const handleImprimirSelecionados = useCallback(async () => {
    if (selectedItems.length === 0) {
      error(t('messages.noTitleSelected'));
      return;
    }
    const statusValidos = tipo === 'abertas' ? statusAbertos : statusPagas;
    const filtrados = selectedItems.filter(t => statusValidos.includes(t.status || ''));
    if (filtrados.length === 0) {
      error(tipo === 'abertas' ? t('messages.noOpenTitlesFound') : t('messages.noPaidTitlesFound'));
      return;
    }
    if (!empresaId) return;
    openPrintModal();
    try {
      const blob = await DadosEmpresaService.getTitulosSaasBoletosPdf(filtrados.map(x => x.id), empresaId);
      const url = window.URL.createObjectURL(blob);
      setPdfUrl(url);
      setIsGeneratingPdf(false);
      success(t('messages.successPrintSelected'));
    } catch {
      error(t('messages.errorPrintSelected'));
      setShowImprimirModal(false);
      setIsGeneratingPdf(false);
    }
  }, [selectedItems, empresaId, tipo, statusAbertos, statusPagas, error, success, openPrintModal, t]);

  const handleImprimirTodosEmAberto = useCallback(async () => {
    const statusValidos = tipo === 'abertas' ? statusAbertos : statusPagas;
    const filtrados = titulosFiltrados.filter(t => statusValidos.includes(t.status || ''));
    if (filtrados.length === 0) {
      error(tipo === 'abertas' ? t('messages.noOpenTitlesFound') : t('messages.noPaidTitlesFound'));
      return;
    }
    if (!empresaId) return;
    openPrintModal();
    try {
      const blob = await DadosEmpresaService.getTitulosSaasBoletosPdf(filtrados.map(x => x.id), empresaId);
      const url = window.URL.createObjectURL(blob);
      setPdfUrl(url);
      setIsGeneratingPdf(false);
      success(t('messages.successPrintOpen'));
    } catch {
      error(t('messages.errorPrintOpen'));
      setShowImprimirModal(false);
      setIsGeneratingPdf(false);
    }
  }, [titulosFiltrados, empresaId, tipo, statusAbertos, statusPagas, error, success, openPrintModal, t]);

  const getStatusBadge = useCallback((item: SaasTitulo) => {
    const status = getTituloStatusEfetivo(item);
    if (!status) return '-';
    const map: Record<string, { label: string; cls: string }> = {
      pendente: { label: t('status.pending'), cls: 'bg-info' },
      vencido: { label: t('status.overdue'), cls: 'bg-warning text-dark' },
      pago: { label: t('status.paid'), cls: 'bg-success' },
      pago_atraso: { label: t('status.paidLate'), cls: 'bg-success' },
      parcial: { label: t('status.partial'), cls: 'bg-primary' },
    };
    const s = map[status.toLowerCase()] || { label: status, cls: 'bg-secondary' };
    return <span className={`badge ${s.cls}`}>{s.label}</span>;
  }, [t]);

  const columns: TableConfig<SaasTitulo>['columns'] = useMemo(() => {
    const base = [
      {
        key: 'plano_nome',
        label: t('table.plan'),
        sortable: true,
        searchable: true,
        render: (item: SaasTitulo & { plano_nome?: string }) => item.plano_nome || (item.plano as { nome?: string })?.nome || '-',
      },
      {
        key: 'numero_titulo',
        label: t('table.titleNumber'),
        sortable: true,
        searchable: true,
        render: (item: SaasTitulo) => item.numero_titulo || '-',
      },
      {
        key: 'data_vencimento',
        label: t('table.dueDate'),
        sortable: true,
        render: (item: SaasTitulo) => formatDate(item.data_vencimento),
      },
      {
        key: 'valor',
        label: t('table.value'),
        sortable: true,
        searchable: true,
        render: (item: SaasTitulo) => formatCurrency(item.valor ?? 0),
      },
      {
        key: 'status',
        label: t('table.status'),
        sortable: true,
        searchable: true,
        badgeLabels: [t('status.pending'), t('status.overdue'), t('status.paid'), t('status.paidLate'), t('status.partial')],
        render: (item: SaasTitulo) => getStatusBadge(item),
      },
    ];
    if (tipo === 'pagas') {
      base.splice(3, 0, {
        key: 'data_pagamento',
        label: t('form.paymentDate'),
        sortable: true,
        render: (item: SaasTitulo) => item.data_pagamento ? formatDate(item.data_pagamento) : '-',
      });
    }
    return base;
  }, [t, getStatusBadge, tipo]);


  const handleSort = useCallback((col: string, dir: SortDirection) => {
    setSortColumn(col);
    setSortDirection(dir);
  }, []);

  const bulkActions: BulkAction<SaasTitulo>[] = useMemo(() => {
    const dropdown = tipo === 'pagas'
      ? [
          { label: t('other.selected'), action: () => handleImprimirSelecionados() },
          { label: t('other.all'), action: () => handleImprimirTodosEmAberto() },
        ]
      : [
          { label: t('other.selected'), action: () => handleImprimirSelecionados() },
          { label: t('other.open'), action: () => handleImprimirTodosEmAberto() },
        ];
    return [
      {
        key: 'imprimir',
        label: bulkBtn.imprimir.label,
        variant: bulkBtn.imprimir.variant,
        requiresSelection: false,
        dropdown,
      },
    ];
  }, [bulkBtn, t, tipo, handleImprimirSelecionados, handleImprimirTodosEmAberto]);

  if (isLoading) {
    return (
      <Loading variant="centered" showMessage={false} className="py-5" />
    );
  }

  const searchControls = (
    <SearchBar
      id="empresa-financeiro-search"
      variant="table"
      value={searchTerm}
      onChange={setSearchTerm}
      onSearch={(value) => setSearchTerm(value)}
      placeholder={t('layout.searchPlaceholder')}
      searchField={searchField}
      onSearchFieldChange={setSearchField}
      searchFields={searchFields}
      className="flex-grow-1"
      autoComplete="off"
    />
  );

  return (
    <div className="empresa-financeiro-tab-full d-flex flex-column flex-grow-1 min-h-0">
      <EmbeddedTablePanel
          key={`dados-empresa-faturas-tab-${tipo}`}
          title={tipo === 'abertas' ? t('tabs.faturasAbertas') : t('tabs.faturasPagas')}
          config={{
            columns,
            data: titulosFiltrados,
            loading: isLoading,
            selectable: true,
            multiSelect: true,
            searchable: false,
            sortable: true,
            sortColumn,
            sortDirection,
            bulkActions,
            emptyMessage: tipo === 'abertas' ? t('messages.noOpenTitlesFound') : t('messages.noPaidTitlesFound'),
            striped: true,
            hover: true,
            responsive: true,
            className: 'no-padding',
            customControls: searchControls,
          }}
          onSelectionChange={(items) => setSelectedItems(items as SaasTitulo[])}
          onRefresh={refetch}
          onSort={handleSort}
          />
      {titulos.length >= 50 && !searchTerm && (
        <div className="small text-muted mt-2 px-3 pb-2">
          Exibindo até 50 registros. Use Contas a Receber para ver todos.
        </div>
      )}

      <ImprimirModal
        show={showImprimirModal}
        onClose={() => {
          setShowImprimirModal(false);
          clearPdfUrl();
        }}
        pdfUrl={pdfUrl}
        isGenerating={isGeneratingPdf}
        title={t('financial.viewDocument')}
        modalId="dados-empresa-financeiro-imprimir-modal"
      />
    </div>
  );
};

export default FinanceiroTab;
