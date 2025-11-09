import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import Table from '../../../../tables/Table';
import { TableConfig } from '../../../../tables/types';
import { DocumentoUnion } from '../types';
import { useNotificationContext } from '../../../../../components/notifications/NotificationProvider';
import DocumentoSistemaService from '../../../../../services/documentoSistemaService';
import ModeloReciboService from '../../../../../services/modeloReciboService';
import ModeloCartaService from '../../../../../services/modeloCartaService';
import ModeloTermoService from '../../../../../services/modeloTermoService';
import { DocumentoTabProps } from '../types';

const DocumentoTab: React.FC<DocumentoTabProps> = ({
  tipo,
  onShowDocumentoModal,
  selectedDocumentoId: _selectedDocumentoId,
  getTipoLabel,
  onDocumentoSelected,
  onDocumentosLoaded
}) => {
  const queryClient = useQueryClient();
  const { success, error: showError } = useNotificationContext();
  const [, setSelectedItems] = useState<DocumentoUnion[]>([]);

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
    if (onDocumentosLoaded) {
      onDocumentosLoaded(documentos?.data ? (documentos.data as DocumentoUnion[]) : []);
    }
  }, [documentos, onDocumentosLoaded]);

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
        default:
          return DocumentoSistemaService.delete(id);
      }
    },
    onSuccess: () => {
      success( 'Documento excluído com sucesso');
      queryClient.invalidateQueries({ queryKey: ['documentos-sistema', tipo] });
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<{ message?: string }>;
      showError( axiosError?.response?.data?.message || 'Erro ao excluir documento');
    }
  });

  // Definir colunas da tabela
  const columns: TableConfig<DocumentoUnion>['columns'] = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      render: (item: DocumentoUnion) => (
        <div>{item.id}</div>
      )
    },
    {
      key: 'nome',
      label: 'Nome',
      sortable: true,
      render: (item: DocumentoUnion) => (
        <div className="fw-medium">{item.nome || '-'}</div>
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
      key: 'ativo',
      label: 'Status',
      sortable: true,
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
      key: 'created_at',
      label: 'Criado em',
      sortable: true,
      render: (item: DocumentoUnion) => {
        if (!('created_at' in item) || !item.created_at) return '-';
        try {
          return (
            <span className="text-secondary">
              {new Date(item.created_at).toLocaleDateString('pt-BR')}
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
        if (selectedItems.length > 0 && window.confirm(`Tem certeza que deseja deletar ${selectedItems.length} documento(s)?`)) {
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

  return (
    <Table
      config={{
        columns,
        data: documentos?.data as DocumentoUnion[] || [],
        loading: isLoading,
        searchable: true,
        searchPlaceholder: `Buscar ${getTipoLabel(tipo).toLowerCase()}...`,
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
    />
  );
};

export default DocumentoTab;

