import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { TemplateWhatsAppService, TemplateWhatsApp } from '@/services/templateWhatsAppService';
import Table from '@/components/tables/Table';
import { TableConfig } from '@/components/tables/types';
import { Button, Spinner } from '@/components/ui';
import { useI18n } from '@/contexts/I18nContext';

export interface TemplatesTabProps {
  /** Placeholder para compatibilidade */
  embedded?: boolean;
}

const TemplatesTab: React.FC<TemplatesTabProps> = () => {
  const isMobile = useIsMobile();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { success, error: showError } = useNotificationContext();

  const { data: templatesData, isLoading, error, refetch } = useQuery({
    queryKey: ['templates-whatsapp'],
    queryFn: () => TemplateWhatsAppService.list(),
  });

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

  const handleDeletarTemplate = (template: TemplateWhatsApp) => {
    if (!window.confirm(`Remover o template "${template.nome}" (${template.idioma})?`)) return;
    deleteTemplateMutation.mutate(template.id);
  };

  const templates = templatesData?.data ?? [];

  const tableColumns: TableConfig<TemplateWhatsApp>['columns'] = [
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
    },
    {
      key: 'actions',
      label: '',
      width: '100px',
      render: (item: TemplateWhatsApp) => (
        <Button
          type="button"
          variant="outline-danger"
          size="sm"
          onClick={() => handleDeletarTemplate(item)}
          disabled={deleteTemplateMutation.isPending}
        >
          Remover
        </Button>
      )
    }
  ];

  return (
    <div style={{ padding: isMobile ? '0' : '16px' }}>
      {error && (
        <div className="alert alert-danger mb-3">
          Erro ao buscar templates: {error instanceof Error ? error.message : 'Erro desconhecido'}
        </div>
      )}
      {!error && (
        <div style={{ minHeight: '200px' }}>
          {isLoading ? (
            <div className="d-flex justify-content-center align-items-center py-5">
              <Spinner size="md" variant="primary" aria-label="Carregando..." />
            </div>
          ) : (
            <Table
              title=""
              config={{
                columns: tableColumns,
                data: templates,
                loading: false,
                searchable: false,
                sortable: true,
                striped: true,
                hover: true,
                responsive: true,
                selectable: false,
                emptyMessage: 'Nenhum template criado. Crie os templates na aba Templates Meta.',
                pagination: undefined
              }}
              tableId="templates-whatsapp-table"
              onRefresh={refetch}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default TemplatesTab;
