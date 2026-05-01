import React, { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useModalSelect } from 'hooks/useModalSelect';
import { useTableFilters } from 'hooks/useTableFilters';
import { useAuditoria } from 'hooks/useAuditoria';
import { TemplateWhatsAppService, TemplateWhatsApp } from 'services/templateWhatsAppService';
import Table from 'components/tables/Table';
import { TableConfig } from 'components/tables/types';
import { useI18n } from 'contexts/I18nContext';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import ImprimirModal from 'components/common/ImprimirModal';

export interface TemplatesTabProps {
  /** Placeholder para compatibilidade */
  embedded?: boolean;
}

const TemplatesTab: React.FC<TemplatesTabProps> = () => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { success, error: showError } = useNotificationContext();
  const auditoria = useAuditoria();

  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 15,
    searchDebounceMs: 300,
    resetPageOnFilterChange: true,
  });

  const { handleSelectionChange } = useModalSelect<TemplateWhatsApp>(undefined);

  const { data: templatesData, isLoading, error, refetch } = useQuery({
    queryKey: ['templates-whatsapp'],
    queryFn: () => TemplateWhatsAppService.list(),
  });

  const templates = useMemo(() => templatesData?.data ?? [], [templatesData?.data]);

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: number) => TemplateWhatsAppService.delete(id),
    onSuccess: () => {
      success('Template removido com sucesso');
      queryClient.invalidateQueries({ queryKey: ['templates-whatsapp'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (err as Error).message
        ?? 'Erro ao remover template';
      showError(msg);
    },
  });

  const handleRemover = useCallback((selectedItems: TemplateWhatsApp[]) => {
    const item = selectedItems?.[0];
    if (!item) return;
    if (!window.confirm(`Remover o template "${item.nome}" (${item.idioma})?`)) return;
    deleteTemplateMutation.mutate(item.id);
  }, [deleteTemplateMutation]);

  const handleAudit = useCallback((item: TemplateWhatsApp) => {
    auditoria.handleAudit('TemplateWhatsApp', item.id);
  }, [auditoria]);

  const filteredTemplates = useMemo(() => {
    const search = (tableFilters.search || '').toLowerCase().trim();
    let result = templates;
    if (search) {
      const field = tableFilters.searchField || 'nome';
      result = templates.filter((item) => {
        const val = field === 'id' ? String(item.id) : String((item as unknown as Record<string, unknown>)[field] ?? '').toLowerCase();
        return (field === 'id' ? val : val.toLowerCase()).includes(search);
      });
    }
    const col = tableFilters.sortColumn;
    const dir = tableFilters.sortDirection;
    if (!col) return result;
    return [...result].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[col];
      const bv = (b as unknown as Record<string, unknown>)[col];
      const cmp = String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true });
      return dir === 'asc' ? cmp : -cmp;
    });
  }, [templates, tableFilters.search, tableFilters.searchField, tableFilters.sortColumn, tableFilters.sortDirection]);

  const bulkActions = useMemo(() => [
    {
      key: 'deletar',
      label: t('buttons.delete'),
      variant: 'danger' as const,
      disabled: (items: TemplateWhatsApp[]) => items.length === 0,
      onClick: (selectedItems: TemplateWhatsApp[]) => handleRemover(selectedItems)
    }
  ], [handleRemover, t]);

  const tableColumns: TableConfig<TemplateWhatsApp>['columns'] = useMemo(() => [
    {
      key: 'id',
      label: t('table.id'),
      sortable: true,
      width: '60px',
      render: (item: TemplateWhatsApp) => <span>{item.id}</span>
    },
    {
      key: 'nome',
      label: t('form.name'),
      sortable: true,
      render: (item: TemplateWhatsApp) => item.nome
    },
    {
      key: 'idioma',
      label: 'Idioma',
      sortable: true,
      width: '100px',
      render: (item: TemplateWhatsApp) => item.idioma
    }
  ], [t]);

  if (error) {
    return (
      <div className="alert alert-danger">
        Erro ao buscar templates: {error instanceof Error ? error.message : 'Erro desconhecido'}
      </div>
    );
  }

  return (
    <>
      <div className="list-modal-table-wrapper" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="list-modal-scroll-wrapper" style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <Table
          syncWithHeader={false}
          title=""
          config={{
            columns: tableColumns,
            data: filteredTemplates,
            loading: isLoading,
            searchable: true,
            searchPlaceholder: '',
            searchField: tableFilters.searchField || 'nome',
            searchFields: [{ key: 'id', label: t('table.id') }, { key: 'nome', label: t('form.name') }, { key: 'idioma', label: 'Idioma' }],
            sortable: true,
            sortColumn: tableFilters.sortColumn,
            sortDirection: tableFilters.sortDirection,
            striped: true,
            hover: true,
            responsive: true,
            selectable: true,
            multiSelect: false,
            bulkActions,
            emptyMessage: 'Nenhum template criado. Crie os templates na aba Templates Meta.',
            pagination: undefined,
            className: 'no-padding'
          }}
          tableId="templates-whatsapp-table"
          onSelectionChange={handleSelectionChange}
          onRefresh={refetch}
          onAudit={handleAudit}
          auditEntity="TemplateWhatsApp"
          onSort={(column, direction) => {
            setTimeout(() => tableFilters.setSort(column, direction), 0);
          }}
          onSearch={(s, f) => { tableFilters.setSearch(s); if (f) tableFilters.setSearchField(f); }}
          onSearchFieldChange={(f) => tableFilters.setSearchField(f)}
          search={tableFilters.search}
        />
        </div>
      </div>
      <ImprimirModal
        show={auditoria.showPreview}
        onClose={auditoria.handleClosePreview}
        pdfUrl={auditoria.pdfUrl}
        isGenerating={auditoria.isGeneratingPdf}
        title="Logs de Auditoria"
        modalId="auditoria-template-whatsapp-modal"
      />
    </>
  );
};

export default TemplatesTab;
