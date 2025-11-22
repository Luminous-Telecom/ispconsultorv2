import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDeleteContrato, Contrato } from '../../../hooks/useContratos';
import { ContratoService } from '../../../services/ContratoService';
import { useNotificationContext } from '../../../components/notifications/NotificationProvider';
import DraggableModal from '../../common/DraggableModal';
import Table from '../../tables/Table';
import { TableConfig } from '../../tables/types';
import ContratoModal from '../clientes/contrato/ContratoModal';
import { AxiosError } from 'axios';
import DocumentoSistemaService from '../../../services/documentoSistemaService';
import ImprimirModal from '../../common/ImprimirModal';
import { formatDateTime } from '../../../utils/formatters';

interface ContratoListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectContrato?: (contrato: Contrato) => void;
  title?: string;
}

const ContratoListModal: React.FC<ContratoListModalProps> = ({
  show,
  onClose,
  onSelectContrato,
  title = "Contratos"
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedContratoId, setSelectedContratoId] = useState<number | null>(null);
  const [selectedItems, setSelectedItems] = useState<Contrato[]>([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showImprimirModal, setShowImprimirModal] = useState(false);
  
  const { success, error } = useNotificationContext();
  
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
      if (err instanceof Error && 'response' in err) {
        const axiosError = err as AxiosError<{ message?: string; error?: string }>;
        const errorMessage = axiosError.response?.data?.message || 
                            axiosError.response?.data?.error ||
                            'Erro ao excluir contrato';
        error(errorMessage);
      } else {
        error('Erro ao excluir contrato');
      }
    }
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
        valor_final_num: c.valor_final ? Number(c.valor_final) : 0
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
      render: (item: Contrato) => <span>{item.id}</span>
    },
    {
      key: 'cliente_razao_social',
      label: 'Cliente',
      sortable: true,
      searchable: true,
      render: (item: Contrato & { cliente_razao_social?: string }) => (
        <div className="fw-bold">{item.cliente?.razao_social || item.cliente_razao_social || '-'}</div>
      )
    },
    {
      key: 'plano_nome',
      label: 'Plano',
      sortable: true,
      searchable: true,
      render: (item: Contrato & { plano_nome?: string }) => item.plano?.nome_plano || item.plano_nome || '-'
    },
    {
      key: 'valor_plano_num',
      label: 'Valor Plano',
      sortable: true,
      searchable: true,
      render: (item: Contrato) => 
        item.plano?.valor_mensal ? `R$ ${Number(item.plano.valor_mensal).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}` : '-'
    },
    {
      key: 'desconto_num',
      label: 'Desconto',
      sortable: true,
      searchable: false,
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
        item.data_inicio ? new Date(item.data_inicio).toLocaleDateString('pt-BR') : '-'
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
      action: (selectedItems: Contrato[]) => {
        if (selectedItems.length > 0 && 
            window.confirm(`Tem certeza que deseja excluir ${selectedItems.length} contrato(s)?`)) {
          selectedItems.forEach(item => handleDelete(item.id));
        }
      },
      disabled: (selectedItems: Contrato[]) => selectedItems.length === 0
    },
    {
      label: isGeneratingPdf ? 'Gerando...' : 'Imprimir',
      disabled: (selectedItems: Contrato[]) => selectedItems.length === 0 || isGeneratingPdf,
      dropdown: [
        {
          label: 'Contrato',
          action: async () => {
            if (selectedItems.length > 0) {
              const contrato = selectedItems[0];
              if (!contrato.cliente_id) {
                error('Contrato sem cliente associado');
                return;
              }
              
              setIsGeneratingPdf(true);
              try {
                await new Promise(resolve => {
                  if (window.requestIdleCallback) {
                    window.requestIdleCallback(resolve);
                  } else {
                    setTimeout(resolve, 0);
                  }
                });
                
                const modeloContrato = await DocumentoSistemaService.getDefaultByType('contrato');
                
                if (modeloContrato.success && modeloContrato.data) {
                  // Usar generateTestPdf em vez de generateTestPdfWithContent
                  // Isso garante que o backend processe as variáveis corretamente
                  // e preserve a formatação do modelo
                  const pdfBlob = await DocumentoSistemaService.generateTestPdf(
                    modeloContrato.data.id,
                    contrato.cliente_id,
                    contrato.id // Passar contrato_id para usar o contrato específico
                  );
                  
                  const url = window.URL.createObjectURL(pdfBlob);
                  setPdfUrl(url);
                  setShowImprimirModal(true);
                  
                  success('Contrato gerado com sucesso!');
                } else {
                  error('Nenhum modelo de contrato encontrado. Cadastre um modelo primeiro.');
                }
              } catch (err) {
                const axiosError = err as AxiosError<{ message?: string }>;
                let errorMessage = 'Erro ao gerar contrato';
                
                if (axiosError.response) {
                  // Tentar extrair mensagem de erro do response
                  if (axiosError.response.data instanceof Blob) {
                    try {
                      const text = await axiosError.response.data.text();
                      const errorData = JSON.parse(text);
                      errorMessage = errorData.message || errorMessage;
                    } catch {
                      errorMessage = `Erro ${axiosError.response.status}: ${axiosError.response.statusText}`;
                    }
                  } else if (typeof axiosError.response.data === 'object' && axiosError.response.data !== null) {
                    errorMessage = (axiosError.response.data as { message?: string }).message || errorMessage;
                  }
                  
                  if (axiosError.response.status === 404) {
                    errorMessage = 'Modelo de contrato não encontrado. Verifique se existe um modelo padrão cadastrado.';
                  } else if (axiosError.response.status === 500) {
                    errorMessage = 'Erro interno do servidor ao gerar contrato. Tente novamente.';
                  }
                } else if (axiosError.message) {
                  errorMessage = axiosError.message;
                } else if (err instanceof Error) {
                  errorMessage = err.message;
                }
                
                error(errorMessage);
              } finally {
                setIsGeneratingPdf(false);
              }
            }
          }
        },
        {
          label: 'Termo de Adesão',
          action: async () => {
            if (selectedItems.length > 0) {
              const contrato = selectedItems[0];
              if (!contrato.cliente_id) {
                error('Contrato sem cliente associado');
                return;
              }
              
              setIsGeneratingPdf(true);
              try {
                const modeloAdesao = await DocumentoSistemaService.getDefaultByType('contrato');
                
                if (modeloAdesao.success && modeloAdesao.data) {
                  const modelosData = await DocumentoSistemaService.getModelosByModeloContrato(modeloAdesao.data.id);
                  const conteudoAdesao = modelosData.data?.modelo_termo_adesao || modeloAdesao.data.conteudo;
                  const pdfBlob = await DocumentoSistemaService.generateTestPdfWithContent(
                    modeloAdesao.data.id,
                    contrato.cliente_id,
                    conteudoAdesao
                  );
                  
                  const url = window.URL.createObjectURL(pdfBlob);
                  setPdfUrl(url);
                  setShowImprimirModal(true);
                  
                  success('Termo de Adesão gerado com sucesso!');
                } else {
                  error('Nenhum modelo de contrato encontrado. Cadastre um modelo primeiro.');
                }
              } catch (err) {
                const axiosError = err as AxiosError<{ message: string }>;
                if (axiosError.response?.status === 404) {
                  error('Modelo de contrato não encontrado. Verifique se existe um modelo padrão cadastrado.');
                } else {
                  error('Erro ao gerar termo de adesão');
                }
              } finally {
                setIsGeneratingPdf(false);
              }
            }
          }
        },
        {
          label: 'Contrato Permanência',
          action: async () => {
            if (selectedItems.length > 0) {
              const contrato = selectedItems[0];
              if (!contrato.cliente_id) {
                error('Contrato sem cliente associado');
                return;
              }
              
              setIsGeneratingPdf(true);
              try {
                const modeloPermanencia = await DocumentoSistemaService.getDefaultByType('contrato');
                
                if (modeloPermanencia.success && modeloPermanencia.data) {
                  const modelosData = await DocumentoSistemaService.getModelosByModeloContrato(modeloPermanencia.data.id);
                  const conteudoPermanencia = modelosData.data?.modelo_contrato_permanencia || modeloPermanencia.data.conteudo;
                  const pdfBlob = await DocumentoSistemaService.generateTestPdfWithContent(
                    modeloPermanencia.data.id,
                    contrato.cliente_id,
                    conteudoPermanencia
                  );
                  
                  const url = window.URL.createObjectURL(pdfBlob);
                  setPdfUrl(url);
                  setShowImprimirModal(true);
                  
                  success('Contrato de Permanência gerado com sucesso!');
                } else {
                  error('Nenhum modelo de contrato encontrado. Cadastre um modelo primeiro.');
                }
              } catch (err) {
                const axiosError = err as AxiosError<{ message: string }>;
                if (axiosError.response?.status === 404) {
                  error('Modelo de contrato não encontrado. Verifique se existe um modelo padrão cadastrado.');
                } else {
                  error('Erro ao gerar contrato de permanência');
                }
              } finally {
                setIsGeneratingPdf(false);
              }
            }
          }
        }
      ]
    }
  ];


  // Removido headerActions - botões agora ficam apenas na div interna do Table

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={title}
      size="lg"
      modalId="contrato-list-modal"
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Table
            config={{
              columns,
              data: dataWithVirtualFields,
              loading: isLoading,
              searchable: true,
              searchPlaceholder: 'Buscar por cliente ou plano...',
              sortable: true,
              striped: true,
              hover: true,
              responsive: true,
              selectable: true,
              multiSelect: !onSelectContrato, // Seleção múltipla se não for modo de seleção única
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
              // Se é modo seleção única (onSelectContrato presente)
              if (onSelectContrato) {
                if (items.length > 0) {
                  // Sempre pega o último item selecionado (mais recente)
                  const selectedItem = items[items.length - 1];
                  onSelectContrato(selectedItem);
                  onClose();
                }
              }
            }}
            onRowClick={onSelectContrato ? (item) => {
              // Clique na linha seleciona e fecha quando em modo seleção
              onSelectContrato(item);
              onClose();
            } : undefined}
            onRefresh={refetch}
          />
        </div>
        
        {/* Valor total mensal e descontos - no final do modal */}
        <div className="p-2 border-top" style={{ flexShrink: 0 }}>
          <div className="d-flex justify-content-between align-items-center mb-1">
            <span className="small text-muted">Valor Total Mensal:</span>
            <span className="small fw-bold">{formatCurrency(valorTotalMensal)}</span>
          </div>
          <div className="d-flex justify-content-between align-items-center">
            <span className="small text-muted">Valor Total Descontos:</span>
            <span className="small fw-bold">{formatCurrency(valorTotalDescontos)}</span>
          </div>
        </div>
      </div>

      {/* Modal de Contrato (criação e edição unificados) */}
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
          // Não fechar o modal automaticamente - permitir criar múltiplos contratos
          refetch();
        }}
      />

      {/* Modal de Impressão */}
      {pdfUrl && (
        <ImprimirModal
          show={showImprimirModal}
          onClose={() => {
            setShowImprimirModal(false);
            setPdfUrl(null);
          }}
          pdfUrl={pdfUrl}
        />
      )}
    </DraggableModal>
  );
};

export default ContratoListModal;

