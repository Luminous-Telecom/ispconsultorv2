import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import ModeloCartaService, { ModeloCarta } from 'services/modeloCartaService';
import { formatDateTime } from 'utils/formatters';
import Table from 'components/tables/Table';
import { TableConfig } from 'components/tables/types';
import { useAuditoria } from 'hooks/useAuditoria';
import ImprimirModal from 'components/common/ImprimirModal';
import DocumentoModal from 'components/modals/parametros/documento/DocumentoModal';
import { useConfirmModal } from 'hooks/useConfirmModal';
import ConfirmModal from 'components/modals/ConfirmModal';

interface CartaCobrancaTabProps {
  contratoId?: number | null;
}

const CartaCobrancaTab: React.FC<CartaCobrancaTabProps> = ({ contratoId: _contratoId }) => {
  const queryClient = useQueryClient();
  const { success, error: showError } = useNotificationContext();
  const [_selectedItems, setSelectedItems] = useState<ModeloCarta[]>([]);
  const auditoria = useAuditoria();
  const { confirm, modalProps } = useConfirmModal();
  const [showDocumentoModal, setShowDocumentoModal] = useState(false);
  const [documentoModalMode, setDocumentoModalMode] = useState<'create' | 'edit'>('create');
  const [selectedDocumentoId, setSelectedDocumentoId] = useState<number | null>(null);
  const [selectedDocumento, setSelectedDocumento] = useState<ModeloCarta | null>(null);

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

  const handleAudit = (documento: ModeloCarta) => {
    auditoria.handleAudit('ModeloDocumento', documento.id);
  };

  // Query para buscar cartas de cobrança
  const { data: cartas, isLoading, refetch } = useQuery({
    queryKey: ['modelos-carta'],
    queryFn: async () => {
      const response = await ModeloCartaService.list();
      return response;
    },
    staleTime: 30 * 1000,
    refetchOnMount: false,
  });

  // Buscar documento selecionado quando for edição
  useEffect(() => {
    if (showDocumentoModal && documentoModalMode === 'edit' && selectedDocumentoId) {
      ModeloCartaService.getById(selectedDocumentoId)
        .then((response) => {
          if (response.success && response.data) {
            setSelectedDocumento(response.data as ModeloCarta);
          }
        })
        .catch(() => {
          showError('Erro ao carregar documento');
        });
    }
  }, [showDocumentoModal, documentoModalMode, selectedDocumentoId, showError]);

  // Mutation para deletar carta
  const deleteDocumentoMutation = useMutation({
    mutationFn: async (id: number) => {
      return ModeloCartaService.delete(id);
    },
    onSuccess: () => {
      success('Carta de cobrança excluída com sucesso');
      queryClient.invalidateQueries({ queryKey: ['modelos-carta'] });
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<{ message?: string }>;
      showError(axiosError?.response?.data?.message || 'Erro ao deletar carta de cobrança');
    }
  });

  // Definir colunas da tabela
  const columns: TableConfig<ModeloCarta>['columns'] = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      width: 42,
      resizable: true,
      render: (item: ModeloCarta) => (
        <div>{item.id}</div>
      )
    },
    {
      key: 'nome',
      label: 'Nome',
      sortable: true,
      render: (item: ModeloCarta) => (
        <div>{item.nome || '-'}</div>
      )
    },
    {
      key: 'descricao',
      label: 'Descrição',
      sortable: true,
      render: (item: ModeloCarta) => (
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
      render: (item: ModeloCarta) => {
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
      render: (item: ModeloCarta) => {
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
      onClick: (selectedItems: ModeloCarta[]) => {
        if (selectedItems.length > 0) {
          const documento = selectedItems[0];
          setSelectedDocumento(documento);
          handleShowDocumentoModal('edit', documento.id);
        }
      },
      disabled: (selectedItems: ModeloCarta[]) => selectedItems.length === 0
    },
    {
      label: 'Deletar',
      onClick: async (selectedItems: ModeloCarta[]) => {
        if (selectedItems.length === 0) return;
        
        const confirmed = window.confirm(`Tem certeza que deseja deletar ${selectedItems.length} carta(s) de cobrança?`);
        if (confirmed) {
          try {
            await Promise.all(selectedItems.map(item => deleteDocumentoMutation.mutateAsync(item.id)));
            refetch();
          } catch (error) {
            // Erro já é tratado pelo onError da mutation
          }
        }
      },
      disabled: (selectedItems: ModeloCarta[]) => selectedItems.length === 0
    }
  ];

  return (
    <>
      <div className="row" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', margin: 0, padding: 0 }}>
        <div className="col-12" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}>
          <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            <Table
              key="carta-cobranca-tab-table"
              syncWithHeader={false}
              title="Cartas de Cobrança"
              config={{
                columns,
                data: cartas?.data || [],
                loading: isLoading,
                searchable: true,
                searchPlaceholder: 'Buscar cartas de cobrança...',
                searchFields: [
                  { key: 'id', label: 'ID' },
                  { key: 'numero_carta', label: 'Nº Carta' },
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
                  ...('disabled' in action && { disabled: action.disabled as boolean | ((selectedItems: ModeloCarta[]) => boolean) })
                })),
                emptyMessage: 'Nenhum modelo de carta de cobrança cadastrado ainda.',
                className: 'no-padding'
              }}
              tableId="carta-cobranca-tab"
              onSelectionChange={setSelectedItems}
              onRefresh={refetch}
              onAudit={handleAudit}
              auditEntity="ModeloDocumento"
            />
          </div>
        </div>
      </div>

      {/* Modal de Documento */}
      {showDocumentoModal && (
        <DocumentoModal
          key={`documento-modal-${selectedDocumentoId || 'create'}-carta`}
          show={showDocumentoModal}
          onClose={handleCloseDocumentoModal}
          documento={documentoModalMode === 'edit' && selectedDocumento
            ? selectedDocumento
            : null}
          tipo="carta_cobranca"
          onSuccess={(doc) => {
            setDocumentoModalMode('edit');
            setSelectedDocumentoId(doc.id);
            setSelectedDocumento(doc as ModeloCarta);
            queryClient.invalidateQueries({ queryKey: ['modelos-carta'] });
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
        modalId="auditoria-modelo-carta-modal"
      />

      {/* ConfirmModal */}
      {modalProps && <ConfirmModal {...modalProps} />}
    </>
  );
};

export default CartaCobrancaTab;

