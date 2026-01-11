import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { extractApiErrorMessage } from '@/utils/apiErrorHelper';
import { useDeleteContrato, Contrato } from '@/hooks/useContratos';
import { ContratoService } from '@/services/contratoService';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import DocumentoSistemaService from '@/services/documentoSistemaService';
import { formatDate, formatDateTime } from '@/utils/formatters';
import { useImpressaoContrato } from '@/hooks/useImpressaoContrato';
import DraggableModal from '@/components/common/DraggableModal';
import Table from '@/components/tables/Table';
import { TableConfig } from '@/components/tables/types';
import ContratoModal from '@/components/modals/clientes/contrato/ContratoModal';
import ImprimirModal from '@/components/common/ImprimirModal';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useAuditoria } from '@/hooks/useAuditoria';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import ConfirmModal from '@/components/modals/ConfirmModal';

interface ContratoListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectContrato?: (contrato: Contrato) => void;
  title?: string;
  skipWrapper?: boolean;
}

const ContratoListModal: React.FC<ContratoListModalProps> = ({
  show,
  onClose,
  onSelectContrato,
  title = "Contratos",
  skipWrapper = false
}) => {
  const isMobile = useIsMobile();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedContratoId, setSelectedContratoId] = useState<number | null>(null);
  const [, setSelectedItems] = useState<Contrato[]>([]);
  const [showImprimirModal, setShowImprimirModal] = useState(false);
  // Estado local para PDFs de outros documentos (Termo de Adesão, Contrato Permanência)
  const [pdfUrlLocal, setPdfUrlLocal] = useState<string | null>(null);
  const [isGeneratingPdfLocal, setIsGeneratingPdfLocal] = useState(false);
  
  const { success, error } = useNotificationContext();
  const auditoria = useAuditoria();
  const { confirm, modalProps } = useConfirmModal();

  // Hook para impressão de contratos
  const impressaoHook = useImpressaoContrato({});
  
  // Buscar todos os contratos ativos
  const { data: contratos, isLoading, refetch } = useQuery({
    queryKey: ['contratos', 'ativos'],
    queryFn: () => ContratoService.getAtivos(),
    staleTime: 30 * 1000, // 30 segundos
    refetchOnMount: false,
  });

  const deleteContratoMutation = useDeleteContrato();

  const handleDelete = async (id: number) => {
    try {
      await deleteContratoMutation.mutateAsync(id);
      success('Contrato excluído com sucesso!');
      refetch();
    } catch (err: unknown) {
      const errorMessage = await extractApiErrorMessage(err, {
        defaultMessage: 'Erro ao excluir contrato',
        handleBlobResponse: false
      });
      error(errorMessage);
    }
  };

  const handleAudit = (contrato: Contrato) => {
    auditoria.handleAudit('Contrato', contrato.id);
  };

  // Adicionar campos virtuais para busca e ordenação funcionar com campos aninhados
  const dataWithVirtualFields = React.useMemo(() => {
    if (!contratos) return [];
    
    return contratos.map((c: Contrato) => {
      // Calcular desconto para ordenação
      let descontoValor = 0;
      if (c.desconto_valor && Number(c.desconto_valor) > 0) {
        descontoValor = Number(c.desconto_valor);
      } else if (c.desconto_percentual && Number(c.desconto_percentual) > 0 && c.plano?.valor_mensal) {
        const valorPlano = Number(c.plano.valor_mensal);
        descontoValor = valorPlano * (Number(c.desconto_percentual) / 100);
      }

      return {
        ...c,
        // Adicionar campos virtuais para busca funcionar com campos aninhados
        cliente_razao_social: c.cliente?.razao_social || '',
        plano_nome: c.plano?.nome_plano || '',
        valor_plano_str: (c.plano?.valor_mensal || 0).toString(),
        valor_final_str: (c.valor_final || 0).toString(),
        // Campos numéricos para ordenação
        valor_plano_num: c.plano?.valor_mensal ? Number(c.plano.valor_mensal) : 0,
        desconto_num: descontoValor,
        valor_final_num: c.valor_final ? Number(c.valor_final) : 0,
        // Campos de endereço para ordenação (usando endereço do contrato)
        endereco: c.endereco || '',
        numero: c.numero || '',
        complemento: c.complemento || '',
        bairro: c.bairro || '',
        cidade: c.cidade || '',
        estado: c.estado || ''
      };
    });
  }, [contratos]);

  // Calcular valor total mensal de todos os contratos
  const valorTotalMensal = React.useMemo(() => {
    if (!contratos) return 0;
    
    return contratos.reduce((total, contrato) => {
      const valor = contrato.valor_final 
        ? parseFloat(contrato.valor_final.toString())
        : (contrato.plano?.valor_mensal ? parseFloat(contrato.plano.valor_mensal.toString()) : 0);
      return total + valor;
    }, 0);
  }, [contratos]);

  // Calcular valor total de descontos
  const valorTotalDescontos = React.useMemo(() => {
    if (!contratos) return 0;
    
    return contratos.reduce((total, contrato) => {
      let desconto = 0;
      
      // Priorizar desconto em valor
      if (contrato.desconto_valor && Number(contrato.desconto_valor) > 0) {
        desconto = Number(contrato.desconto_valor);
      }
      // Se não tiver desconto em valor, calcular a partir do percentual
      else if (contrato.desconto_percentual && Number(contrato.desconto_percentual) > 0 && contrato.plano?.valor_mensal) {
        const valorPlano = Number(contrato.plano.valor_mensal);
        desconto = valorPlano * (Number(contrato.desconto_percentual) / 100);
      }
      
      return total + desconto;
    }, 0);
  }, [contratos]);

  const formatCurrency = (value: number): string => {
    return `R$ ${value.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
  };

  const columns: TableConfig<Contrato & { cliente_razao_social?: string; plano_nome?: string; valor_plano_str?: string; valor_final_str?: string; valor_plano_num?: number; desconto_num?: number; valor_final_num?: number }>['columns'] = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      searchable: true,
      width: 42,
      resizable: true,
      render: (item: Contrato) => <span>{item.id}</span>
    },
    {
      key: 'cliente_razao_social',
      label: 'Cliente',
      sortable: true,
      searchable: true,
      width: 200,
      resizable: true,
      render: (item: Contrato & { cliente_razao_social?: string }) => (
        <div className="fw-bold">{item.cliente?.razao_social || item.cliente_razao_social || '-'}</div>
      )
    },
    {
      key: 'endereco',
      label: 'Endereço',
      sortable: true,
      searchable: false,
      width: 180,
      resizable: true,
      render: (item: Contrato) => (
        <span>{item.endereco || '-'}</span>
      )
    },
    {
      key: 'numero',
      label: 'Número',
      sortable: true,
      width: 90,
      resizable: true,
      searchable: false,
      render: (item: Contrato) => (
        <span>{item.numero || '-'}</span>
      )
    },
    {
      key: 'complemento',
      label: 'Complemento',
      sortable: true,
      searchable: false,
      width: 120,
      resizable: true,
      render: (item: Contrato) => (
        <span>{item.complemento || '-'}</span>
      )
    },
    {
      key: 'bairro',
      label: 'Bairro',
      sortable: true,
      searchable: false,
      width: 120,
      resizable: true,
      render: (item: Contrato) => (
        <span>{item.bairro || '-'}</span>
      )
    },
    {
      key: 'cidade',
      label: 'Cidade',
      sortable: true,
      searchable: false,
      width: 130,
      resizable: true,
      render: (item: Contrato) => (
        <span>{item.cidade || '-'}</span>
      )
    },
    {
      key: 'estado',
      label: 'Estado',
      sortable: true,
      searchable: false,
      width: 80,
      resizable: true,
      render: (item: Contrato) => (
        <span>{item.estado || '-'}</span>
      )
    },
    {
      key: 'plano_nome',
      label: 'Plano',
      sortable: true,
      searchable: true,
      width: 140,
      resizable: true,
      render: (item: Contrato & { plano_nome?: string }) => item.plano?.nome_plano || item.plano_nome || '-'
    },
    {
      key: 'valor_plano_num',
      label: 'Valor Plano',
      sortable: true,
      searchable: true,
      width: 110,
      resizable: true,
      render: (item: Contrato) =>
        item.plano?.valor_mensal ? `R$ ${Number(item.plano.valor_mensal).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}` : '-'
    },
    {
      key: 'desconto_num',
      label: 'Desconto',
      sortable: true,
      searchable: false,
      width: 100,
      resizable: true,
      render: (item: Contrato) => {
        // Priorizar desconto em valor
        if (item.desconto_valor && Number(item.desconto_valor) > 0) {
          return `R$ ${Number(item.desconto_valor).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
        }
        // Se não tiver desconto em valor, calcular a partir do percentual
        if (item.desconto_percentual && Number(item.desconto_percentual) > 0 && item.plano?.valor_mensal) {
          const valorPlano = Number(item.plano.valor_mensal);
          const descontoValor = valorPlano * (Number(item.desconto_percentual) / 100);
          return `R$ ${descontoValor.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
        }
        return '-';
      }
    },
    {
      key: 'valor_final_num',
      label: 'Valor Final',
      sortable: true,
      searchable: true,
      render: (item: Contrato) => 
        item.valor_final ? `R$ ${Number(item.valor_final).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}` : '-'
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      searchable: true,
      render: (item: Contrato) => {
        const getStatusColor = (status: string) => {
          switch (status?.toLowerCase()) {
            case 'ativo':
              return 'bg-success';
            case 'inativo':
              return 'bg-danger';
            case 'suspenso':
              return 'bg-warning text-dark';
            case 'cancelado':
              return 'bg-secondary';
            default:
              return 'bg-warning text-dark';
          }
        };
        return (
          <span className={`badge ${getStatusColor(item.status || '')}`}>
            {item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1).toLowerCase() : '-'}
          </span>
        );
      }
    },
    {
      key: 'data_inicio',
      label: 'Data Início',
      sortable: true,
      searchable: false,
      render: (item: Contrato) => 
        formatDate(item.data_inicio)
    },
    {
      key: 'created_at',
      label: 'Criado em',
      sortable: true,
      searchable: false,
      render: (item: Contrato & { created_at?: string; created_at_formatada?: string | null }) => {
        // Usar created_at_formatada se disponível (vem do backend já formatada)
        if (item.created_at_formatada) {
          return item.created_at_formatada;
        }
        // Fallback para formatDateTime se não tiver formato do backend
        return item.created_at ? formatDateTime(item.created_at) : '-';
      }
    }
  ];

  const bulkActions = onSelectContrato ? [] : [
    {
      label: 'Novo',
      action: () => setShowCreateModal(true)
    },
    {
      label: 'Editar',
      action: (selectedItems: Contrato[]) => {
        if (selectedItems.length > 0) {
          setSelectedContratoId(selectedItems[0].id);
          setShowEditModal(true);
        }
      },
      disabled: (selectedItems: Contrato[]) => selectedItems.length === 0
    },
    {
      label: 'Excluir',
      action: async (selectedItems: Contrato[]) => {
        if (selectedItems.length === 0) return;
        
        const confirmed = await confirm({
          message: `Tem certeza que deseja excluir ${selectedItems.length} contrato(s)?`,
          variant: 'danger',
          title: 'Excluir contratos',
          confirmText: 'Excluir',
          cancelText: 'Cancelar',
        });
        
        if (confirmed) {
          selectedItems.forEach(item => handleDelete(item.id));
        }
      },
      disabled: (selectedItems: Contrato[]) => selectedItems.length === 0
    },
    {
      label: 'Imprimir',
      disabled: (selectedItems: Contrato[]) => selectedItems.length === 0,
      dropdown: [
        {
          label: 'Contrato',
          action: async (selectedItems?: Contrato[]) => {
            const items = selectedItems || [];
            if (items.length > 0) {
              const contrato = items[0];
              if (!contrato.cliente_id) {
                error('Contrato sem cliente associado');
                return;
              }
              
              await impressaoHook.imprimirContrato(
                contrato.id,
                contrato.cliente_id
              );
            }
          }
        },
        {
          label: 'Termo de Adesão',
          action: async (selectedItems?: Contrato[]) => {
            const items = selectedItems || [];
            if (items.length > 0) {
              const contrato = items[0];
              
              if (!contrato.cliente_id) {
                error('Contrato sem cliente associado');
                return;
              }
              
              // Abrir modal imediatamente
              setShowImprimirModal(true);
              setIsGeneratingPdfLocal(true);
              
              // Limpar URL anterior se existir
              if (pdfUrlLocal) {
                window.URL.revokeObjectURL(pdfUrlLocal);
                setPdfUrlLocal(null);
              }
              
              try {
                const modeloAdesao = await DocumentoSistemaService.getDefaultByType('contrato');
                
                if (modeloAdesao.success && modeloAdesao.data) {
                  const modelosData = await DocumentoSistemaService.getModelosByModeloContrato(modeloAdesao.data.id);
                  const conteudoAdesao = modelosData.data?.modelo_termo_adesao || modeloAdesao.data.conteudo;
                  
                  if (!conteudoAdesao || conteudoAdesao.trim() === '') {
                    error('Conteúdo do termo de adesão não encontrado. Verifique se o modelo possui conteúdo cadastrado.');
                    setShowImprimirModal(false);
                    setIsGeneratingPdfLocal(false);
                    return;
                  }
                  
                  const pdfBlob = await DocumentoSistemaService.generateTestPdfWithContent(
                    modeloAdesao.data.id,
                    contrato.cliente_id,
                    conteudoAdesao
                  );
                  
                  const url = window.URL.createObjectURL(pdfBlob);
                  setPdfUrlLocal(url);
                  setIsGeneratingPdfLocal(false);
                  
                  success('Termo de Adesão gerado com sucesso!');
                } else {
                  error('Nenhum modelo de contrato encontrado. Cadastre um modelo primeiro.');
                  setShowImprimirModal(false);
                  setIsGeneratingPdfLocal(false);
                }
              } catch (err) {
                const errorMessage = await extractApiErrorMessage(err, {
                  defaultMessage: 'Erro ao gerar termo de adesão',
                  handleBlobResponse: true,
                  customStatusMessages: {
                    404: 'Modelo de contrato não encontrado. Verifique se existe um modelo padrão cadastrado.',
                    500: 'Erro interno do servidor ao gerar termo de adesão. Tente novamente.'
                  }
                });
                error(errorMessage);
                setShowImprimirModal(false);
                setIsGeneratingPdfLocal(false);
              }
            }
          }
        },
        {
          label: 'Contrato Permanência',
          action: async (selectedItems?: Contrato[]) => {
            const items = selectedItems || [];
            if (items.length > 0) {
              const contrato = items[0];
              
              if (!contrato.cliente_id) {
                error('Contrato sem cliente associado');
                return;
              }
              
              // Abrir modal imediatamente
              setShowImprimirModal(true);
              setIsGeneratingPdfLocal(true);
              
              // Limpar URL anterior se existir
              if (pdfUrlLocal) {
                window.URL.revokeObjectURL(pdfUrlLocal);
                setPdfUrlLocal(null);
              }
              
              try {
                const modeloPermanencia = await DocumentoSistemaService.getDefaultByType('contrato');
                
                if (modeloPermanencia.success && modeloPermanencia.data) {
                  const modelosData = await DocumentoSistemaService.getModelosByModeloContrato(modeloPermanencia.data.id);
                  const conteudoPermanencia = modelosData.data?.modelo_contrato_permanencia || modeloPermanencia.data.conteudo;
                  
                  if (!conteudoPermanencia || conteudoPermanencia.trim() === '') {
                    error('Conteúdo do contrato de permanência não encontrado. Verifique se o modelo possui conteúdo cadastrado.');
                    setShowImprimirModal(false);
                    setIsGeneratingPdfLocal(false);
                    return;
                  }
                  
                  const pdfBlob = await DocumentoSistemaService.generateTestPdfWithContent(
                    modeloPermanencia.data.id,
                    contrato.cliente_id,
                    conteudoPermanencia
                  );
                  
                  const url = window.URL.createObjectURL(pdfBlob);
                  setPdfUrlLocal(url);
                  setIsGeneratingPdfLocal(false);
                  
                  success('Contrato de Permanência gerado com sucesso!');
                } else {
                  error('Nenhum modelo de contrato encontrado. Cadastre um modelo primeiro.');
                  setShowImprimirModal(false);
                  setIsGeneratingPdfLocal(false);
                }
              } catch (err) {
                const errorMessage = await extractApiErrorMessage(err, {
                  defaultMessage: 'Erro ao gerar contrato de permanência',
                  handleBlobResponse: true,
                  customStatusMessages: {
                    404: 'Modelo de contrato não encontrado. Verifique se existe um modelo padrão cadastrado.',
                    500: 'Erro interno do servidor ao gerar contrato de permanência. Tente novamente.'
                  }
                });
                error(errorMessage);
                setShowImprimirModal(false);
                setIsGeneratingPdfLocal(false);
              }
            }
          }
        }
      ]
    }
  ];


  const modalContent = (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <Table
            title={title}
            config={{
              columns,
              data: dataWithVirtualFields,
              loading: isLoading,
              searchable: true,
              searchPlaceholder: '',
              searchFields: [
                { key: 'id', label: 'ID' },
                { key: 'cliente_razao_social', label: 'Cliente' },
                { key: 'plano_nome', label: 'Plano' },
                { key: 'status', label: 'Status' },
                { key: 'valor_final_num', label: 'Valor Final' },
                { key: 'endereco', label: 'Endereço' },
                { key: 'cidade', label: 'Cidade' },
                { key: 'estado', label: 'Estado' }
              ],
              sortable: true,
              striped: true,
              hover: true,
              responsive: true,
              selectable: true,
              multiSelect: true,
              bulkActions: bulkActions.map(action => ({
                key: action.label.toLowerCase().replace(/\s+/g, '-'),
                label: action.label,
                onClick: action.action,
                disabled: action.disabled,
                dropdown: action.dropdown
              })),
              emptyMessage: 'Nenhum contrato encontrado'
            }}
            tableId="contrato-list-modal"
            onSelectionChange={(items) => {
              setSelectedItems(items);
              if (onSelectContrato) {
                if (items.length > 0) {
                  const selectedItem = items[items.length - 1];
                  onSelectContrato(selectedItem);
                  onClose();
                }
              }
            }}
            onRowClick={onSelectContrato ? (item) => {
              onSelectContrato(item);
              onClose();
            } : undefined}
            onRefresh={refetch}
            onAudit={handleAudit}
            auditEntity="Contrato"
          />
        </div>
        
        <div 
          className="p-3 bg-light rounded contrato-totais-resumo" 
          style={{ 
            flexShrink: 0,
            marginTop: isMobile ? '0.25rem' : '1rem',
            marginBottom: isMobile ? '3rem' : '1rem',
            marginLeft: isMobile ? '0.5rem' : '1rem',
            marginRight: isMobile ? '0.5rem' : '1rem'
          }}
        >
          <div className="d-flex flex-wrap gap-2 gap-md-4 justify-content-end">
            <div className="text-end">
              <div className="small text-muted">Valor Total Mensal:</div>
              <strong>{formatCurrency(valorTotalMensal)}</strong>
            </div>
            <div className="text-end">
              <div className="small text-muted">Valor Total Descontos:</div>
              <strong>{formatCurrency(valorTotalDescontos)}</strong>
            </div>
          </div>
        </div>
      </div>

      <ContratoModal
        show={showCreateModal || showEditModal}
        clienteId={undefined}
        contratoId={showEditModal ? selectedContratoId : null}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedContratoId(null);
        }}
        onSuccess={() => {
          refetch();
        }}
      />

      <ImprimirModal
        show={impressaoHook.showModal || showImprimirModal}
        onClose={() => {
          if (impressaoHook.showModal) {
            impressaoHook.limparPdfUrl();
          }
          setShowImprimirModal(false);
          if (pdfUrlLocal) {
            window.URL.revokeObjectURL(pdfUrlLocal);
            setPdfUrlLocal(null);
          }
        }}
        pdfUrl={impressaoHook.pdfUrl || pdfUrlLocal || null}
        isGenerating={impressaoHook.isGeneratingPdf || isGeneratingPdfLocal}
        title="Visualizar Documento"
        modalId="contrato-list-imprimir-modal"
      />

      {/* Modal de Visualização de PDF de Auditoria */}
      <ImprimirModal
        show={auditoria.showPreview}
        onClose={auditoria.handleClosePreview}
        pdfUrl={auditoria.pdfUrl}
        isGenerating={auditoria.isGeneratingPdf}
        title="Relatórios de logs"
        modalId="auditoria-contrato-modal"
      />

      {/* ConfirmModal */}
      {modalProps && <ConfirmModal {...modalProps} />}
    </>
  );

  if (skipWrapper) {
    return modalContent;
  }

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={title}
      size="lg"
      modalId="contrato-list-modal"
      className="no-padding"
    >
      {modalContent}
    </DraggableModal>
  );
};

export default ContratoListModal;

