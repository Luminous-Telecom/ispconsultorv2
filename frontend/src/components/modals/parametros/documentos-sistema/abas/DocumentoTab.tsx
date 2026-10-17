import React, { useEffect, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import DocumentoSistemaService from 'services/documentoSistemaService';
import ModeloReciboService from 'services/modeloReciboService';
import ModeloCartaService from 'services/modeloCartaService';
import ModeloTermoService from 'services/modeloTermoService';
import { formatDateTime } from 'utils/formatters';
import EmbeddedTablePanel from 'components/common/EmbeddedTablePanel';
import { TableConfig } from 'components/tables/types';
import { DocumentoUnion } from '../types';
import { DocumentoTabProps } from '../types';
import { useAuditoria } from 'hooks/useAuditoria';
import ImprimirModal from 'components/common/ImprimirModal';

const DocumentoTab: React.FC<DocumentoTabProps> = ({
  tipo,
  onShowDocumentoModal,
  selectedDocumentoId: _selectedDocumentoId,
  getTipoLabel,
  onDocumentoSelected,
  onDocumentosLoaded
}) => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const [, setSelectedItems] = useState<DocumentoUnion[]>([]);
  const auditoria = useAuditoria();
  const onDocumentosLoadedRef = useRef(onDocumentosLoaded);
  
  // Atualizar ref quando a função mudar
  useEffect(() => {
    onDocumentosLoadedRef.current = onDocumentosLoaded;
  }, [onDocumentosLoaded]);
  
  // Limpar seleção quando mudar de tipo
  useEffect(() => {
    setSelectedItems([]);
  }, [tipo]);

  // Função para obter o nome da entidade baseado no tipo
  const getAuditEntity = (tipo: string): string | null => {
    switch (tipo) {
      case 'contrato':
        return 'ModeloDocumento';
      case 'recibo':
        return 'ModeloDocumento'; // Usa /modelos-documento com tipo=recibo
      case 'carta_cobranca':
        return 'ModeloDocumento'; // Usa /modelos-documento com tipo=carta
      case 'termo':
        return 'ModeloTermo'; // Usa /modelos-termo
      case 'ordem_servico':
        return 'ModeloDocumento';
      default:
        return null;
    }
  };

  const handleAudit = (documento: DocumentoUnion) => {
    const entity = getAuditEntity(tipo);
    if (entity) {
      auditoria.handleAudit(entity, documento.id);
    }
  };

  // Query para buscar documentos por tipo
  const { data: documentos, isLoading, refetch } = useQuery({
    queryKey: ['documentos-sistema', tipo],
    queryFn: async () => {
      let response;
      switch (tipo) {
        case 'contrato':
          response = await DocumentoSistemaService.getByType('contrato');
          break;
        case 'recibo':
          response = await ModeloReciboService.list();
          break;
        case 'carta_cobranca':
          response = await ModeloCartaService.list();
          break;
        case 'termo':
          response = await ModeloTermoService.list();
          break;
        case 'ordem_servico':
          response = await DocumentoSistemaService.getByType('ordem_servico');
          break;
        default:
          response = await DocumentoSistemaService.getByType('contrato');
      }
      // Garantir que a resposta tenha a estrutura esperada
      if (response && response.data) {
        return {
          success: response.success !== undefined ? response.success : true,
          data: Array.isArray(response.data) ? response.data : [],
          message: ('message' in response && response.message) ? response.message : ''
        };
      }
      return { success: true, data: [], message: '' };
    },
    staleTime: 30 * 1000, // 30 segundos
    refetchOnMount: false,
  });

  useEffect(() => {
    if (onDocumentosLoadedRef.current) {
      onDocumentosLoadedRef.current(documentos?.data ? (documentos.data as DocumentoUnion[]) : []);
    }
  }, [documentos]);

  // Mutation para deletar documento
  const deleteDocumentoMutation = useMutation({
    mutationFn: async (id: number) => {
      switch (tipo) {
        case 'contrato':
          return DocumentoSistemaService.delete(id);
        case 'recibo':
          return ModeloReciboService.delete(id);
        case 'carta_cobranca':
          return ModeloCartaService.delete(id);
        case 'termo':
          return ModeloTermoService.delete(id);
        case 'ordem_servico':
          return DocumentoSistemaService.delete(id);
        default:
          return DocumentoSistemaService.delete(id);
      }
    },
    onSuccess: () => {
      success( 'Documento excluído com sucesso');
      queryClient.invalidateQueries({ queryKey: ['documentos-sistema', tipo] });
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.DOCUMENT_DELETE_ERROR),
  });

  // Definir colunas da tabela
  const columns: TableConfig<DocumentoUnion>['columns'] = [
    {
      key: 'ativo',
      label: 'Status',
      sortable: true,
      badgeLabels: ['Ativo', 'Inativo'],
      render: (item: DocumentoUnion) => {
        const isAtivo = 'ativo' in item ? item.ativo : true;
        return (
          <span className={`badge ${isAtivo ? 'bg-success' : 'bg-secondary'}`}>
            {isAtivo ? 'Ativo' : 'Inativo'}
          </span>
        );
      }
    },
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      resizable: true,
      render: (item: DocumentoUnion) => (
        <div>{item.id}</div>
      )
    },
    {
      key: 'nome',
      label: 'Nome',
      sortable: true,
      render: (item: DocumentoUnion) => (
        <div>{item.nome || '-'}</div>
      )
    },
    {
      key: 'descricao',
      label: 'Descrição',
      sortable: true,
      render: (item: DocumentoUnion) => (
        <div className="text-secondary">
          {item.descricao || '-'}
        </div>
      )
    },
    {
      key: 'created_at',
      label: 'Data cadastro',
      sortable: true,
      render: (item: DocumentoUnion) => {
        if (!('created_at' in item) || !item.created_at) return '-';
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
        onShowDocumentoModal('create', null);
      }
    },
    {
      label: 'Editar',
      onClick: (selectedItems: DocumentoUnion[]) => {
        if (selectedItems.length > 0) {
          const documento = selectedItems[0];
          onDocumentoSelected(documento);
          onShowDocumentoModal('edit', documento.id);
        }
      },
      disabled: (selectedItems: DocumentoUnion[]) => selectedItems.length === 0
    },
    {
      label: 'Deletar',
      variant: 'primary' as const,
      onClick: async (selectedItems: DocumentoUnion[]) => {
        if (selectedItems.length === 0) return;
        
        const confirmed = window.confirm(`Tem certeza que deseja deletar ${selectedItems.length} documento(s)?`);
        if (confirmed) {
          try {
            await Promise.all(selectedItems.map(item => deleteDocumentoMutation.mutateAsync(item.id)));
            refetch();
          } catch (error) {
            // Erro já é tratado pelo onError da mutation
          }
        }
      },
      disabled: (selectedItems: DocumentoUnion[]) => selectedItems.length === 0
    }
  ];

  const auditEntity = getAuditEntity(tipo);

  return (
    <>
      <EmbeddedTablePanel
        key={`documentos-table-${tipo}`}
        title={getTipoLabel(tipo)}
        config={{
          columns,
          data: documentos?.data as DocumentoUnion[] || [],
          loading: isLoading,
          searchable: true,
          searchPlaceholder: `Buscar ${getTipoLabel(tipo).toLowerCase()}...`,
          searchFields: [
            { key: 'status', label: 'Status' },
            { key: 'id', label: 'ID' },
            { key: 'nome', label: 'Nome' },
            { key: 'tipo', label: 'Tipo' },
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
            ...('disabled' in action && { disabled: action.disabled as boolean | ((selectedItems: DocumentoUnion[]) => boolean) })
          })),
          emptyMessage: `Nenhum modelo de ${getTipoLabel(tipo).toLowerCase()} cadastrado ainda.`,
          className: 'no-padding'
        }}
        tableId={`documentos-${tipo}`}
        onSelectionChange={setSelectedItems}
        onRefresh={refetch}
        onAudit={auditEntity ? handleAudit : undefined}
        auditEntity={auditEntity || undefined}
      />

      {auditEntity && (
        <ImprimirModal
          show={auditoria.showPreview}
          onClose={auditoria.handleClosePreview}
          pdfUrl={auditoria.pdfUrl}
          isGenerating={auditoria.isGeneratingPdf}
          title="Relatórios de logs"
          modalId={`auditoria-modelo-documento-${tipo}-modal`}
        />
      )}
    </>
  );
};

export default DocumentoTab;

