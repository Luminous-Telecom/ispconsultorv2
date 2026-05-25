import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import ModeloReciboService, { ModeloRecibo } from 'services/modeloReciboService';
import { formatDateTime } from 'utils/formatters';
import Table from 'components/tables/Table';
import { TableConfig } from 'components/tables/types';
import { useAuditoria } from 'hooks/useAuditoria';
import ImprimirModal from 'components/common/ImprimirModal';
import DocumentoModal from 'components/modals/parametros/documento/DocumentoModal';
import { useConfirmModal } from 'hooks/useConfirmModal';
import ConfirmModal from 'components/modals/ConfirmModal';

interface RecibosTabProps {
  contratoId?: number | null;
}

const RecibosTab: React.FC<RecibosTabProps> = ({ contratoId: _contratoId }) => {
  const queryClient = useQueryClient();
  const { success, error: showError } = useNotificationContext();
  const [_selectedItems, setSelectedItems] = useState<ModeloRecibo[]>([]);
  const auditoria = useAuditoria();
  const { confirm, modalProps } = useConfirmModal();
  const [showDocumentoModal, setShowDocumentoModal] = useState(false);
  const [documentoModalMode, setDocumentoModalMode] = useState<'create' | 'edit'>('create');
  const [selectedDocumentoId, setSelectedDocumentoId] = useState<number | null>(null);
  const [selectedDocumento, setSelectedDocumento] = useState<ModeloRecibo | null>(null);

  const handleShowDocumentoModal = (mode: 'create' | 'edit', documentoId: number | null) => {
    setDocumentoModalMode(mode);
    setSelectedDocumentoId(documentoId);
    if (mode === 'create') {
      setSelectedDocumento(null);
    }
    setShowDocumentoModal(true);
  };

  const handleCloseDocumentoModal = () => {
    setShowDocumentoModal(false);
    setSelectedDocumentoId(null);
    setSelectedDocumento(null);
  };

  const handleAudit = (documento: ModeloRecibo) => {
    auditoria.handleAudit('ModeloDocumento', documento.id);
  };

  // Query para buscar recibos
  const { data: recibos, isLoading, refetch } = useQuery({
    queryKey: ['modelos-recibo'],
    queryFn: async () => {
      const response = await ModeloReciboService.list();
      return response;
    },
    staleTime: 30 * 1000,
    refetchOnMount: false,
  });

  // Buscar documento selecionado quando for edição
  useEffect(() => {
    if (showDocumentoModal && documentoModalMode === 'edit' && selectedDocumentoId) {
      ModeloReciboService.getById(selectedDocumentoId)
        .then((response) => {
          if (response.success && response.data) {
            setSelectedDocumento(response.data as ModeloRecibo);
          }
        })
        .catch(() => {
          showError('Erro ao carregar documento');
        });
    }
  }, [showDocumentoModal, documentoModalMode, selectedDocumentoId, showError]);

  // Mutation para deletar recibo
  const deleteDocumentoMutation = useMutation({
    mutationFn: async (id: number) => {
      return ModeloReciboService.delete(id);
    },
    onSuccess: () => {
      success('Recibo excluído com sucesso');
      queryClient.invalidateQueries({ queryKey: ['modelos-recibo'] });
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<{ message?: string }>;
      showError(axiosError?.response?.data?.message || 'Erro ao deletar recibo');
    }
  });

  // Definir colunas da tabela
  const columns: TableConfig<ModeloRecibo>['columns'] = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      width: 42,
      resizable: true,
      render: (item: ModeloRecibo) => (
        <div>{item.id}</div>
      )
    },
    {
      key: 'nome',
      label: 'Nome',
      sortable: true,
      render: (item: ModeloRecibo) => (
        <div>{item.nome || '-'}</div>
      )
    },
    {
      key: 'descricao',
      label: 'Descrição',
      sortable: true,
      render: (item: ModeloRecibo) => (
        <div className="text-secondary">
          {item.descricao || '-'}
        </div>
      )
    },
    {
      key: 'ativo',
      label: 'Status',
      sortable: true,
      badgeLabels: ['Ativo', 'Inativo'],
      render: (item: ModeloRecibo) => {
        return (
          <span className={`badge ${item.ativo ? 'bg-success' : 'bg-secondary'}`}>
            {item.ativo ? 'Ativo' : 'Inativo'}
          </span>
        );
      }
    },
    {
      key: 'created_at',
      label: 'Criado em',
      sortable: true,
      render: (item: ModeloRecibo) => {
        if (!item.created_at) return '-';
        try {
          return (
            <span className="text-secondary">
              {formatDateTime(item.created_at)}
            </span>
          );
        } catch {
          return '-';
        }
      }
    }
  ];

  // Ações em massa
  const bulkActions = [
    {
      label: 'Novo',
      variant: 'primary' as const,
      onClick: () => {
        handleShowDocumentoModal('create', null);
      }
    },
    {
      label: 'Editar',
      onClick: (selectedItems: ModeloRecibo[]) => {
        if (selectedItems.length > 0) {
          const documento = selectedItems[0];
          setSelectedDocumento(documento);
          handleShowDocumentoModal('edit', documento.id);
        }
      },
      disabled: (selectedItems: ModeloRecibo[]) => selectedItems.length === 0
    },
    {
      label: 'Deletar',
      onClick: async (selectedItems: ModeloRecibo[]) => {
        if (selectedItems.length === 0) return;
        
        const confirmed = window.confirm(`Tem certeza que deseja deletar ${selectedItems.length} recibo(s)?`);
        if (confirmed) {
          try {
            await Promise.all(selectedItems.map(item => deleteDocumentoMutation.mutateAsync(item.id)));
            refetch();
          } catch (error) {
            // Erro já é tratado pelo onError da mutation
          }
        }
      },
      disabled: (selectedItems: ModeloRecibo[]) => selectedItems.length === 0
    }
  ];

  return (
    <>
      <Table
              key="recibos-tab-table"
              syncWithHeader={false}
              title="Recibos"
              config={{
                columns,
                data: recibos?.data || [],
                loading: isLoading,
                searchable: true,
                searchPlaceholder: 'Buscar recibos...',
                searchFields: [
                  { key: 'id', label: 'ID' },
                  { key: 'numero_recibo', label: 'Nº Recibo' },
                  { key: 'cliente', label: 'Cliente' },
                  { key: 'valor', label: 'Valor' },
                  { key: 'status', label: 'Status' }
                ],
                sortable: true,
                striped: true,
                hover: true,
                responsive: true,
                bulkActions: bulkActions.map(action => ({
                  key: action.label.toLowerCase().replace(/\s+/g, '-'),
                  label: action.label,
                  variant: action.variant,
                  onClick: action.onClick,
                  ...('disabled' in action && { disabled: action.disabled as boolean | ((selectedItems: ModeloRecibo[]) => boolean) })
                })),
                emptyMessage: 'Nenhum modelo de recibo cadastrado ainda.',
                className: 'no-padding'
              }}
              tableId="recibos-tab"
              onSelectionChange={setSelectedItems}
              onRefresh={refetch}
              onAudit={handleAudit}
              auditEntity="ModeloDocumento"
          />

      {/* Modal de Documento */}
      {showDocumentoModal && (
        <DocumentoModal
          key={`documento-modal-${selectedDocumentoId || 'create'}-recibo`}
          show={showDocumentoModal}
          onClose={handleCloseDocumentoModal}
          documento={documentoModalMode === 'edit' && selectedDocumento
            ? selectedDocumento
            : null}
          tipo="recibo"
          onSuccess={(doc) => {
            setDocumentoModalMode('edit');
            setSelectedDocumentoId(doc.id);
            setSelectedDocumento(doc as ModeloRecibo);
            queryClient.invalidateQueries({ queryKey: ['modelos-recibo'] });
            refetch();
          }}
        />
      )}

      {/* Modal de Auditoria */}
      <ImprimirModal
        show={auditoria.showPreview}
        onClose={auditoria.handleClosePreview}
        pdfUrl={auditoria.pdfUrl}
        isGenerating={auditoria.isGeneratingPdf}
        title="Relatórios de logs"
        modalId="auditoria-modelo-recibo-modal"
      />

      {/* ConfirmModal */}
      {modalProps && <ConfirmModal {...modalProps} />}
    </>
  );
};

export default RecibosTab;

