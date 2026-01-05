import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TituloService } from '@/services/tituloService';
import { useFormPrefix } from '@/hooks/useFormId';
import { useClienteForm } from '@/hooks/useClienteForm';
import { useClienteContratos } from '@/hooks/useClienteContratos';
import { useClienteImpressao } from '@/hooks/useClienteImpressao';
import { useClienteBulkActions } from '@/hooks/useClienteBulkActions';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useAuditoria } from '@/hooks/useAuditoria';
import { formatCurrency, formatDate, formatDateTime } from '@/utils/formatters';
import { CarneParcela } from '@/types';
import { TituloItem } from '@/types/cliente';
import DraggableModal from '@/components/common/DraggableModal';
import ImprimirModal from '@/components/common/ImprimirModal';
import { TituloModal } from '@/components/modals/titulos/titulo';
import ReceberModal from '@/components/modals/pagamentos/ReceberModal';
import ContratoModal from '../contrato/ContratoModal';
import GerarNFeModal from '@/components/modals/notas-fiscais/GerarNFeModal';
import { Button } from '@/components/ui';
// Componentes de abas
import DadosBasicosTab from './abas/DadosBasicosTab';
import ContatoTab from './abas/ContatoTab';
import EnderecoTab from './abas/EnderecoTab';
import ContratosTab from './abas/ContratosTab';
import FinanceiroTab from './abas/FinanceiroTab';
import ObservacoesTab from './abas/ObservacoesTab';
import ArquivosTab from './abas/ArquivosTab';

interface ClienteModalProps {
  show: boolean;
  onClose: () => void;
  clienteId?: number | null;
  onSuccess?: () => void;
}

const ClienteModal: React.FC<ClienteModalProps> = ({ 
  show, 
  onClose, 
  clienteId = null,
  onSuccess 
}) => {
  const formPrefix = useFormPrefix('ClienteEditModal');
  const isMobile = useIsMobile();
  
  // Estados de modais aninhados
  const [activeTab, setActiveTab] = useState('dados-basicos');
  const [showCancelados, setShowCancelados] = useState(false);
  const [showTituloEditModal, setShowTituloEditModal] = useState(false);
  const [showReceberModal, setShowReceberModal] = useState(false);
  const [showContratoCreateModal, setShowContratoCreateModal] = useState(false);
  const [showContratoEditModal, setShowContratoEditModal] = useState(false);
  const [selectedContratoId, setSelectedContratoId] = useState<number | null>(null);
  const [selectedTituloId, setSelectedTituloId] = useState<number | null>(null);
  const [selectedParcela, setSelectedParcela] = useState<TituloItem | null>(null);
  const [showGerarNFeModal, setShowGerarNFeModal] = useState(false);
  const [selectedTituloForNFe, setSelectedTituloForNFe] = useState<CarneParcela | null>(null);

  // Resetar aba ativa quando modal abrir
  useEffect(() => {
    if (show) {
      setActiveTab('dados-basicos');
    }
  }, [show]);

  // Hook de formulário
  const formHook = useClienteForm({
    clienteId,
    show,
    onSuccess
  });

  // Hook de contratos
  const contratosHook = useClienteContratos({
    clienteId,
    createdClienteId: formHook.createdClienteId
  });

  // Buscar parcelas do cliente
  const effectiveClienteIdForParcelas = clienteId || formHook.createdClienteId || undefined;
  const { data: parcelasData, isLoading: isLoadingParcelas, refetch: refetchParcelas } = useQuery({
    queryKey: ['parcelas', 'cliente', effectiveClienteIdForParcelas],
    queryFn: () => TituloService.list({ cliente_id: effectiveClienteIdForParcelas!, limit: 100 }),
    enabled: !!effectiveClienteIdForParcelas,
  });

  // Hook de impressão (independente, não precisa de selectedItems na criação)
  const impressaoHook = useClienteImpressao({
    clienteId,
    parcelasData
  });

  // Hook de auditoria
  const auditoria = useAuditoria();

  // Criar handlers que serão passados para bulkActions
  const handleImprimirTitulosSelecionadosWrapper = async (selectedItems: TituloItem[]) => {
    await impressaoHook.handleImprimirTitulosSelecionados(selectedItems);
  };

  // Hook de bulk actions (recebe handlers de impressão)
  const bulkActionsHook = useClienteBulkActions({
    clienteId,
    createdClienteId: formHook.createdClienteId,
    parcelasData,
    contratosData: contratosHook.contratosData,
    onRefreshParcelas: async () => {
      await refetchParcelas();
    },
    onRefreshContratos: async () => {
      await contratosHook.refetchContratos();
    },
    onShowTituloEditModal: (tituloId: number) => {
      setSelectedTituloId(tituloId);
      setShowTituloEditModal(true);
    },
    onShowReceberModal: (parcela: TituloItem) => {
      setSelectedParcela(parcela);
      setShowReceberModal(true);
    },
    onShowContratoCreateModal: () => setShowContratoCreateModal(true),
    onShowContratoEditModal: (contratoId: number) => {
      setSelectedContratoId(contratoId);
      setShowContratoEditModal(true);
    },
    onShowImprimirModal: () => {
      impressaoHook.setShowImprimirModal(true);
    },
    handleImprimirTitulosSelecionados: handleImprimirTitulosSelecionadosWrapper,
    handleImprimirTodosEmAberto: impressaoHook.handleImprimirTodosEmAberto,
    handleImprimirContrato: impressaoHook.handleImprimirContrato,
    handleImprimirTermoAdesao: impressaoHook.handleImprimirTermoAdesao,
    handleImprimirContratoPermanencia: impressaoHook.handleImprimirContratoPermanencia,
    handleImprimirRecibos: impressaoHook.handleImprimirRecibos,
    onShowGerarNFeModal: (titulo?: CarneParcela) => {
      if (titulo) {
        // O titulo já é CarneParcela vindo da tabela
        setSelectedTituloForNFe(titulo);
      }
      setShowGerarNFeModal(true);
    },
    handleImprimirNF: impressaoHook.handleImprimirNF
  });

  // Determinar se as abas Contratos e Financeiro devem ser habilitadas
  const canEditContratosFinanceiro = useMemo(() => {
    return formHook.isEditing || !!formHook.createdClienteId;
  }, [formHook.isEditing, formHook.createdClienteId]);

  // Filtrar e processar dados de parcelas
  const getFilteredData = () => {
    if (!parcelasData?.data) return [];
    
    const allData = parcelasData.data;

    // Filtrar cancelados se não estiver marcado para mostrar
    let filteredData = allData.filter((titulo: CarneParcela) => {
      if (titulo.status === 'cancelado' && !showCancelados) {
        return false;
      }
      return true;
    });

    return filteredData;
  };

  const filteredData = getFilteredData();

  // Adicionar campos virtuais aos dados para busca funcionar
  const sortedData = filteredData.map((titulo: CarneParcela) => ({
    ...titulo,
    plano_nome: titulo.plano?.nome_plano || '',
    numero_titulo_str: (titulo.numero_titulo || titulo.numero_parcela || titulo.id).toString(),
    valor_str: (titulo.valor || titulo.valor_parcela || 0).toString(),
    valor_pago_str: (titulo.valor_pago || 0).toString()
  }));

  // Função para obter a cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pago':
        return 'success';
      case 'pago_atraso':
        return 'warning';
      case 'pendente':
        return 'primary';
      case 'vencido':
        return 'danger';
      case 'parcial':
        return 'info';
      case 'cancelado':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  // Colunas para a tabela de títulos
  const columns = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      searchable: true,
      render: (item: CarneParcela) => item.id
    },
    {
      key: 'contrato_id',
      label: 'Contrato',
      sortable: true,
      searchable: true,
      render: (item: CarneParcela) => {
        const itemAny = item as unknown as { contrato_id?: number; contrato?: { id?: number } };
        const contratoId = itemAny.contrato_id || itemAny.contrato?.id;
        return contratoId || '-';
      }
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      searchable: true,
      render: (item: CarneParcela) => {
        return (
          <span className={`badge bg-${getStatusColor(item.status)}`}>
            {item.status}
          </span>
        );
      }
    },
    {
      key: 'plano_nome',
      label: 'Plano',
      sortable: true,
      searchable: true,
      render: (item: CarneParcela & { plano_nome?: string }) => {
        return item.plano?.nome_plano || item.plano_nome || '-';
      }
    },
    {
      key: 'data_vencimento',
      label: 'Vencimento',
      sortable: true,
      searchable: false,
      render: (item: CarneParcela) => {
        return formatDate(item.data_vencimento);
      }
    },
    {
      key: 'valor',
      label: 'Valor',
      sortable: true,
      searchable: true,
      render: (item: CarneParcela) => {
        return formatCurrency(item.valor || 0);
      }
    },
    {
      key: 'valor_pago',
      label: 'Valor baixado',
      sortable: true,
      searchable: true,
      render: (item: CarneParcela) => {
        return item.status === 'pago' ? formatCurrency(item.valor_pago || item.valor || 0) : formatCurrency(0);
      }
    },
    {
      key: 'valor_aberto',
      label: 'Valor aberto',
      sortable: false,
      searchable: false,
      render: (item: CarneParcela) => {
        return (item.status === 'pago' || item.status === 'cancelado') ? formatCurrency(0) : formatCurrency(item.valor || 0);
      }
    },
    {
      key: 'nfse_numero',
      label: 'NF',
      sortable: true,
      searchable: true,
      render: (item: CarneParcela & { nfse_numero?: string | null }) => item.nfse_numero || '-'
    },
    {
      key: 'nfse_status',
      label: 'Status NF',
      sortable: true,
      searchable: true,
      render: (item: CarneParcela & { nfse_status?: 'agendado' | 'emitida' | 'cancelada' | 'rejeitada' | 'erro' | null }) => {
        if (!item.nfse_status) return '-';
        const statusMap: Record<string, { label: string; color: string }> = {
          'agendado': { label: 'Agendado', color: 'info' },
          'emitida': { label: 'Emitida', color: 'success' },
          'cancelada': { label: 'Cancelada', color: 'danger' },
          'rejeitada': { label: 'Rejeitada', color: 'warning' },
          'erro': { label: 'Erro', color: 'danger' }
        };
        const status = statusMap[item.nfse_status] || { label: item.nfse_status, color: 'secondary' };
        return <span className={`badge bg-${status.color}`}>{status.label}</span>;
      }
    },
    {
      key: 'data_pagamento',
      label: 'Data Pagamento',
      sortable: true,
      searchable: false,
      render: (item: CarneParcela) => {
        if (item.data_pagamento_formatada) {
          return item.data_pagamento_formatada;
        }
        return item.data_pagamento ? formatDate(item.data_pagamento) : '-';
      }
    },
    {
      key: 'charge_id',
      label: 'Charge ID',
      sortable: true,
      searchable: true,
      render: (item: CarneParcela) => {
        return item.charge_id || '-';
      }
    },
    {
      key: 'nosso_numero',
      label: 'Nosso Número',
      sortable: true,
      searchable: true,
      render: (item: CarneParcela) => item.nosso_numero || '-'
    },
    {
      key: 'created_at',
      label: 'Criado em',
      sortable: true,
      searchable: false,
      render: (item: CarneParcela & { created_at?: string }) => 
        item.created_at ? formatDateTime(item.created_at) : '-'
    }
  ];

  // Handler para limpar estado ao fechar
  const handleClose = () => {
    onClose();
  };

  // Determinar título dinamicamente
  const modalTitle = formHook.isLoadingCliente && formHook.isEditing
    ? 'Cliente'
    : (!formHook.cliente && formHook.isEditing)
    ? 'Cliente'
    : (formHook.isEditing ? 'Editar Cliente' : 'Novo Cliente');

  // Renderizar conteúdo baseado no estado
  const renderContent = () => {
    // Estado de loading
    if (formHook.isLoadingCliente && formHook.isEditing) {
      return (
        <div className="text-center p-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
          <p className="mt-2">Carregando dados do cliente...</p>
        </div>
      );
    }

    // Estado de erro (cliente não encontrado)
    if (!formHook.cliente && formHook.isEditing) {
      return (
        <div className="text-center p-4">
          <p>Cliente não encontrado.</p>
        </div>
      );
    }

    // Conteúdo normal do formulário
    return (
      <>
        <div style={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Navegação por Abas - Fixa */}
          <ul className="nav nav-tabs" id="clienteTabs" role="tablist" style={{ 
            flexShrink: 0, 
            marginBottom: isMobile ? '1rem' : 0, 
            marginTop: isMobile ? '0' : '1rem', 
            marginLeft: isMobile ? '0' : '1rem', 
            marginRight: isMobile ? '0' : '1rem',
            ...(isMobile && {
              display: 'flex',
              flexWrap: 'nowrap',
              overflowX: 'auto',
              overflowY: 'hidden',
              WebkitOverflowScrolling: 'touch'
            })
          }}>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'dados-basicos' ? 'active' : ''}`}
                onClick={() => setActiveTab('dados-basicos')}
                type="button"
              >
                Cliente
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'contato' ? 'active' : ''}`}
                onClick={() => setActiveTab('contato')}
                type="button"
              >
                Contato
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'endereco' ? 'active' : ''}`}
                onClick={() => setActiveTab('endereco')}
                type="button"
              >
                Endereço
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'contratos' ? 'active' : ''}`}
                onClick={() => setActiveTab('contratos')}
                type="button"
                disabled={!canEditContratosFinanceiro}
              >
                Contratos
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'financeiro' ? 'active' : ''}`}
                onClick={() => setActiveTab('financeiro')}
                type="button"
                disabled={!canEditContratosFinanceiro}
              >
                Financeiro
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'observacoes' ? 'active' : ''}`}
                onClick={() => setActiveTab('observacoes')}
                type="button"
              >
                Observações
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'arquivos' ? 'active' : ''}`}
                onClick={() => setActiveTab('arquivos')}
                type="button"
                disabled={!canEditContratosFinanceiro}
              >
                Arquivos
              </button>
            </li>
          </ul>

          {/* Conteúdo das Abas - Com Scroll */}
          <div 
            className="tab-content" 
            id="clienteTabContent" 
            style={{ 
              flex: 1, 
              overflow: (activeTab === 'contratos' || activeTab === 'financeiro' || activeTab === 'arquivos') ? 'hidden' : 'auto', 
              // No mobile, ResponsiveDialog já aplica padding, então não aplicar aqui
              padding: (activeTab === 'contratos' || activeTab === 'financeiro' || activeTab === 'arquivos') ? '0' : (isMobile ? '0' : '16px'), 
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Aba Cliente */}
            {activeTab === 'dados-basicos' && (
              <DadosBasicosTab
                formData={formHook.formData}
                errors={formHook.errors}
                handleInputChange={formHook.handleInputChange}
                isSubmitting={formHook.isSubmitting}
                formPrefix={formPrefix}
              />
            )}

            {/* Aba Contato */}
            {activeTab === 'contato' && (
              <ContatoTab
                formData={formHook.formData}
                errors={formHook.errors}
                handleInputChange={formHook.handleInputChange}
                isSubmitting={formHook.isSubmitting}
                formPrefix={formPrefix}
              />
            )}

            {/* Aba Endereço */}
            {activeTab === 'endereco' && (
              <EnderecoTab
                formData={formHook.formData}
                errors={formHook.errors}
                handleInputChange={formHook.handleInputChange}
                isSubmitting={formHook.isSubmitting}
                formPrefix={formPrefix}
              />
            )}

            {/* Aba Contratos */}
            {activeTab === 'contratos' && (
              <ContratosTab
                isLoadingContratos={contratosHook.isLoadingContratos}
                sortedContratosData={contratosHook.sortedContratosData}
                selectedContratosItems={bulkActionsHook.selectedContratosItems}
                setSelectedContratosItems={bulkActionsHook.setSelectedContratosItems}
                contratosBulkActions={bulkActionsHook.contratosBulkActions}
                showInativosContratos={contratosHook.showInativosContratos}
                setShowInativosContratos={contratosHook.setShowInativosContratos}
                onRefresh={() => contratosHook.refetchContratos()}
                onShowCreateModal={() => setShowContratoCreateModal(true)}
                onShowEditModal={(contratoId) => {
                  setSelectedContratoId(contratoId);
                  setShowContratoEditModal(true);
                }}
                isGeneratingPdf={impressaoHook.isGeneratingPdf}
                onAudit={(contrato) => auditoria.handleAudit('Contrato', contrato.id)}
                auditEntity="Contrato"
              />
            )}

            {/* Aba Financeiro */}
            {activeTab === 'financeiro' && (
              <FinanceiroTab
                sortedData={sortedData}
                isLoadingParcelas={isLoadingParcelas}
                selectedItems={bulkActionsHook.selectedItems}
                setSelectedItems={bulkActionsHook.setSelectedItems}
                bulkActions={bulkActionsHook.titulosBulkActions}
                showCancelados={showCancelados}
                setShowCancelados={setShowCancelados}
                onRefresh={() => refetchParcelas()}
                isGeneratingPdf={impressaoHook.isGeneratingPdf}
                columns={columns}
                onAudit={(titulo) => auditoria.handleAudit('Titulo', titulo.id)}
                auditEntity="Titulo"
              />
            )}

            {/* Aba Observações */}
            {activeTab === "observacoes" && (
              <ObservacoesTab
                formData={formHook.formData}
                errors={formHook.errors}
                handleInputChange={formHook.handleInputChange}
                isSubmitting={formHook.isSubmitting}
                formPrefix={formPrefix}
              />
            )}

            {/* Aba Arquivos */}
            {activeTab === "arquivos" && (
              <ArquivosTab
                clienteId={effectiveClienteIdForParcelas}
                onAudit={(arquivo) => auditoria.handleAudit('ClienteArquivo', arquivo.id)}
                auditEntity="ClienteArquivo"
              />
            )}
          </div>
        </div>

        {/* Modal de edição de título */}
        <TituloModal
          show={showTituloEditModal}
          tituloId={selectedTituloId || null}
          onClose={() => {
            setShowTituloEditModal(false);
            setSelectedTituloId(null);
            refetchParcelas();
          }}
          onSuccess={() => {
            setShowTituloEditModal(false);
            setSelectedTituloId(null);
            refetchParcelas();
          }}
        />

        {/* Modal para receber */}
        <ReceberModal
          isOpen={showReceberModal}
          onClose={() => {
            setShowReceberModal(false);
            setSelectedParcela(null);
          }}
          parcela={selectedParcela ? {
            id: selectedParcela.id,
            numero_titulo: (selectedParcela.numero_titulo || selectedParcela.numero_parcela || `Título ${selectedParcela.id}`).toString(),
            valor_parcela: selectedParcela.valor || selectedParcela.valor_parcela,
            data_vencimento: selectedParcela.data_vencimento,
            cliente: (() => {
              const cliente = selectedParcela.cliente || (selectedParcela.carne as { cliente?: { razao_social: string } })?.cliente;
              if (cliente && typeof cliente === 'object' && 'razao_social' in cliente) {
                return cliente as { razao_social: string };
              }
              return undefined;
            })()
          } : null}
          onSuccess={() => {
            setShowReceberModal(false);
            setSelectedParcela(null);
            refetchParcelas();
          }}
        />

        {/* Modal de contrato (criação e edição unificados) */}
        <ContratoModal
          show={showContratoCreateModal || showContratoEditModal}
          clienteId={formHook.cliente?.id || formHook.createdClienteId || undefined}
          contratoId={showContratoEditModal ? selectedContratoId : null}
          onClose={() => {
            setShowContratoCreateModal(false);
            setShowContratoEditModal(false);
            setSelectedContratoId(null);
          }}
          onSuccess={() => {
            // Não fechar o modal automaticamente - permitir criar múltiplos contratos
          }}
        />

        {/* Modal de impressão */}
        <ImprimirModal
          show={impressaoHook.showImprimirModal}
          onClose={impressaoHook.handleCloseImprimirModal}
          pdfUrl={impressaoHook.pdfUrl}
          isGenerating={impressaoHook.isGeneratingPdf}
          title="Visualizar Documento"
          modalId="cliente-imprimir-modal"
        />

        {/* Modal de Visualização de PDF de Auditoria */}
        <ImprimirModal
          show={auditoria.showPreview}
          onClose={auditoria.handleClosePreview}
          pdfUrl={auditoria.pdfUrl}
          isGenerating={auditoria.isGeneratingPdf}
          title="Relatórios de logs"
          modalId="auditoria-cliente-modal"
        />

        {/* Modal de Gerar NFS-e Avulsa */}
        <GerarNFeModal
          show={showGerarNFeModal}
          onClose={() => {
            setShowGerarNFeModal(false);
            setSelectedTituloForNFe(null);
          }}
          cliente={formHook.cliente || undefined}
          titulo={selectedTituloForNFe || undefined}
          onSuccess={() => {
            refetchParcelas();
            setShowGerarNFeModal(false);
            setSelectedTituloForNFe(null);
          }}
        />

      </>
    );
  };

  return (
    <DraggableModal
      show={show}
      onClose={handleClose}
      title={modalTitle}
      size="xl"
      modalId={formHook.isEditing ? "cliente-edit-modal" : "cliente-create-modal"}
      headerActions={
        // Mostrar headerActions apenas quando não estiver carregando ou em erro
        !(formHook.isLoadingCliente && formHook.isEditing) && 
        !(!formHook.cliente && formHook.isEditing) ? (
          <div className="d-flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<i className="bi bi-x-lg"></i>}
              onClick={handleClose}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<i className="bi bi-check-lg"></i>}
              isLoading={formHook.isSubmitting}
              onClick={formHook.handleSubmit}
            >
              Salvar
            </Button>
          </div>
        ) : undefined
      }
    >
      {renderContent()}
    </DraggableModal>
  );
};

export default ClienteModal;
