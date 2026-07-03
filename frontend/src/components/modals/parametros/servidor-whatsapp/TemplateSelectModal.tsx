import React, { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useModalSelect } from 'hooks/useModalSelect';
import { useTableFilters } from 'hooks/useTableFilters';
import { TemplateWhatsAppService, TemplateWhatsApp } from 'services/templateWhatsAppService';
import type { ApiResponse } from 'types';
import DraggableModal from 'components/common/DraggableModal';
import EmbeddedTablePanel from 'components/common/EmbeddedTablePanel';
import { TableConfig } from 'components/tables/types';
import { useI18n } from 'contexts/I18nContext';
import { useBulkBtn } from 'components/ui';

interface TemplateSelectModalProps {
  show: boolean;
  onClose: () => void;
  onSelect: (data: { template_id: number }) => void;
  title?: string;
}

const TemplateSelectModal: React.FC<TemplateSelectModalProps> = ({
  show,
  onClose,
  onSelect,
  title
}) => {
  const { t } = useI18n();
  const bulkBtn = useBulkBtn();

  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 15,
    searchDebounceMs: 300,
    resetPageOnFilterChange: true,
  });

  const {
    selectedItem,
    handleSelectionChange,
    clearSelection
  } = useModalSelect<TemplateWhatsApp>(undefined);

  const { data: templatesData, isLoading, error, refetch } = useQuery<ApiResponse<TemplateWhatsApp[]>>({
    queryKey: ['templates-whatsapp'],
    queryFn: () => TemplateWhatsAppService.list(),
    enabled: show,
  });

  const templates = useMemo((): TemplateWhatsApp[] => templatesData?.data ?? [], [templatesData?.data]);

  const handleSelect = useCallback((selectedItems?: TemplateWhatsApp[]) => {
    const item = selectedItems && selectedItems.length > 0 ? selectedItems[0] : selectedItem;
    if (item) {
      clearSelection();
      onSelect({ template_id: item.id });
      onClose();
    }
  }, [selectedItem, clearSelection, onSelect, onClose]);

  const bulkActions = useMemo(() => [
    {
      key: 'cancelar',
      label: bulkBtn.cancelar.label,
      variant: bulkBtn.cancelar.variant,
      requiresSelection: false,
      onClick: () => {
        clearSelection();
        onClose();
      }
    },
    {
      key: 'inserir',
      label: bulkBtn.inserir.label,
      variant: bulkBtn.inserir.variant,
      disabled: (items: TemplateWhatsApp[]) => items.length === 0 && !selectedItem,
      onClick: (selectedItems: TemplateWhatsApp[]) => handleSelect(selectedItems)
    }
  ], [bulkBtn, selectedItem, clearSelection, onClose, handleSelect]);

  const filteredTemplates = useMemo(() => {
    const search = (tableFilters.search || '').toLowerCase().trim();
    let result = templates;
    if (search) {
      const field = tableFilters.searchField || 'nome';
      result = templates.filter((t) => {
        const val = field === 'id' ? String(t.id) : String((t as unknown as Record<string, unknown>)[field] ?? '').toLowerCase();
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

  const defaultTitle = title || t('settings.messages.viewTemplates');

  return (
    <DraggableModal
      show={show}
      onClose={() => {
        clearSelection();
        onClose();
      }}
      title={defaultTitle}
      size="lg"
      modalId="template-select-modal"
      className="no-padding"
    >
      <div className="templates-modal-layout terminal-log-panel--300">
        {error && (
          <div className="alert alert-danger m-3">
            Erro ao buscar templates: {error instanceof Error ? error.message : 'Erro desconhecido'}
          </div>
        )}
        {!error && (
          <EmbeddedTablePanel
              title={defaultTitle}
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
                emptyMessage: templates.length === 0
                  ? 'Nenhum template salvo. Salve os templates na aba Templates.'
                  : 'Nenhum resultado',
                pagination: undefined
              }}
              tableId="template-select-table"
              onSelectionChange={handleSelectionChange}
              onRefresh={refetch}
              onSort={(column, direction) => {
                setTimeout(() => tableFilters.setSort(column, direction), 0);
              }}
              onSearch={(s, f) => { tableFilters.setSearch(s); if (f) tableFilters.setSearchField(f); }}
              onSearchFieldChange={(f) => tableFilters.setSearchField(f)}
              search={tableFilters.search}
          />
        )}
      </div>
    </DraggableModal>
  );
};

export default TemplateSelectModal;
