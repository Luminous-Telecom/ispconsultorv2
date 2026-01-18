import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTableFilters } from '@/hooks/useTableFilters';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { usePlanos } from '@/hooks/usePlanos';
import { useBancos } from '@/hooks/useBancos';
import { useSelectedEntity } from '@/hooks/useSelectedEntity';
import { useContratoForm } from '@/hooks/useContratoForm';
import { useTermosContrato, useDeleteTermoContrato } from '@/hooks/useTermosContrato';
import { TermoContrato } from '@/services/termoContratoService';
import { TituloService } from '@/services/tituloService';
import { ClienteService } from '@/services/clienteService';
import { Titulo, Plano, Cliente } from '@/types';
import ModeloTermoService from '@/services/modeloTermoService';
import DocumentoSistemaService, { DocumentoSistema } from '@/services/documentoSistemaService';
import { DiasVencimentoService } from '@/services/diasVencimentoService';
import DraggableModal from '@/components/common/DraggableModal';
import ImprimirModal from '@/components/common/ImprimirModal';
import { TituloModal } from '@/components/modals/titulos/titulo';
import ReceberModal from '@/components/modals/pagamentos/ReceberModal';
import PlanoListModal from '@/components/modals/planos/PlanoListModal';
import BancoListModal from '@/components/modals/bancos/BancoListModal';
import { Banco } from '@/types';
import { useContratoPlanosAdicionais, useDeleteContratoPlanoAdicional } from '@/hooks/useContratoPlanosAdicionais';
import { ContratoPlanoAdicional } from '@/services/contratoPlanoAdicionalService';
import { extractApiErrorMessageSync } from '@/utils/apiErrorHelper';
import { CONTEXT_ERROR_MESSAGES } from '@/constants/ErrorMessages';
import { formatDate, formatDateTime, formatCurrency } from '@/utils/formatters';
import { useImpressaoContrato } from '@/hooks/useImpressaoContrato';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useAuditoria } from '@/hooks/useAuditoria';
import { useI18n } from '@/contexts/I18nContext';
import ModeloContratoSelectModal from '@/components/modals/parametros/ModeloContratoSelectModal';
import { Button, Spinner } from '@/components/ui';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import ConfirmModal from '@/components/modals/ConfirmModal';
import ContratoTab from './abas/ContratoTab';
import EnderecoTab from './abas/EnderecoTab';
import TermosTab from './abas/TermosTab';
import FinanceiroTab from './abas/FinanceiroTab';
import FinanceiroAvulsoTab from './abas/FinanceiroAvulsoTab';
import ServicosAdicionaisTab from './abas/ServicosAdicionaisTab';
import { TermoEditModal, SelecionarTermoModal, ServicoAdicionalModal, EnviarAssinaturaModal } from './modals';
import { BulkAction } from './types';

interface ContratoModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  contratoId?: number | null; // Se tiver, é edição; se não tiver, é criação
  clienteId?: number; // Obrigatório para criação
}

const ContratoModal: React.FC<ContratoModalProps> = ({ 
  show, 
  onClose, 
  onSuccess,
  contratoId = null,
  clienteId
}) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const auditoria = useAuditoria();
  // Estado interno para controlar o contratoId após criação
  const [internalContratoId, setInternalContratoId] = useState<number | null>(contratoId);
  
  // Atualizar estado interno quando prop contratoId mudar
  useEffect(() => {
    setInternalContratoId(contratoId);
  }, [contratoId]);
  
  // Resetar estado interno quando modal fechar
  useEffect(() => {
    if (!show) {
      setInternalContratoId(contratoId);
      setActiveTab('contrato');
      setShowCancelados(false);
      setShowCanceladosAvulsos(false);
      setPage(1);
      setLimit(10);
      setSelectedItems([]);
      setSelectedAvulsosItems([]);
      setSelectedTermosItems([]);
      setSelectedServicosAdicionaisItems([]);
    }
  }, [show, contratoId]);
  
  // Determina se é modo criação ou edição
  const isEditMode = !!internalContratoId;
  
  // Hook de formulário com React Hook Form + Zod
  const formHook = useContratoForm({
    contratoId: internalContratoId,
    clienteId,
    show,
    onSuccess: () => {
      onSuccess?.();
    }
  });

  // Usar dados do hook
  const formData = formHook.formData;
  const errors = formHook.errors;
  const [activeTab, setActiveTab] = useState('contrato');
  const [showTermoModal, setShowTermoModal] = useState(false);
  const [showSelecionarTermoModal, setShowSelecionarTermoModal] = useState(false);
  const [showEnviarAssinaturaModal, setShowEnviarAssinaturaModal] = useState(false);
  const [termoParaAssinatura, setTermoParaAssinatura] = useState<TermoContrato | null>(null);
  const [editingTermo, setEditingTermo] = useState<TermoContrato | null>(null);
  const [termoFormData, setTermoFormData] = useState({
    assinado: 'NAO' as 'SIM' | 'NAO',
    termoCadastradoId: 0
  });
  const [showTituloCreateModal, setShowTituloCreateModal] = useState(false);
  const [showTituloEditModal, setShowTituloEditModal] = useState(false);
  const [showReceberModal, setShowReceberModal] = useState(false);
  const [selectedTituloId, setSelectedTituloId] = useState<number | null>(null);
  const [selectedParcela, setSelectedParcela] = useState<Titulo | null>(null);
  const [selectedItems, setSelectedItems] = useState<Titulo[]>([]);
  const [selectedAvulsosItems, setSelectedAvulsosItems] = useState<Titulo[]>([]);
  const [selectedTermosItems, setSelectedTermosItems] = useState<TermoContrato[]>([]);
  const [selectedServicosAdicionaisItems, setSelectedServicosAdicionaisItems] = useState<ContratoPlanoAdicional[]>([]);
  
  // Função para mudar de aba e limpar seleções
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    setSelectedItems([]);
    setSelectedAvulsosItems([]);
    setSelectedTermosItems([]);
    setSelectedServicosAdicionaisItems([]);
  };
  
  // Estado para modal de impressão
  const [showPreview, setShowPreview] = useState(false);
  
  // Estados locais para impressão de títulos e termos (não contratos)
  const [pdfUrlLocal, setPdfUrlLocal] = useState<string | null>(null);
  const [isGeneratingPdfLocal, setIsGeneratingPdfLocal] = useState(false);
  
  // Estados dos modais de seleção
  const [showPlanoModal, setShowPlanoModal] = useState(false);
  const [showBancoModal, setShowBancoModal] = useState(false);
  const [showModeloContratoModal, setShowModeloContratoModal] = useState(false);
  const [showServicoAdicionalModal, setShowServicoAdicionalModal] = useState(false);
  const [editingServicoAdicional, setEditingServicoAdicional] = useState<ContratoPlanoAdicional | null>(null);
  
  
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  
  // Gerenciar ordenação para títulos do contrato (backend ordena)
  const titulosTableFilters = useTableFilters({
    initialPage: 1,
    initialLimit: 100,
    initialSortColumn: 'id',
    initialSortDirection: 'desc',
    resetPageOnFilterChange: false,
  });
  
  // Gerenciar ordenação para títulos avulsos (backend ordena)
  const titulosAvulsosTableFilters = useTableFilters({
    initialPage: 1,
    initialLimit: 100,
    initialSortColumn: 'id',
    initialSortDirection: 'desc',
    resetPageOnFilterChange: false,
  });

  // Gerenciar ordenação para termos (backend ordena)
  const termosTableFilters = useTableFilters({
    initialPage: 1,
    initialLimit: 100,
    initialSortColumn: 'id',
    initialSortDirection: 'desc',
    resetPageOnFilterChange: false,
  });
  
  const [showCancelados, setShowCancelados] = useState(false);
  const [showCanceladosAvulsos, setShowCanceladosAvulsos] = useState(false);
  const { success, error } = useNotificationContext();
  const queryClient = useQueryClient();
  const { confirm, modalProps } = useConfirmModal();

  const { data: planosData } = usePlanos();
  const { data: bancosData } = useBancos();
  const { data: modelosContratoData } = useQuery({
    queryKey: ['modelos-documento', 'contrato'],
    queryFn: () => DocumentoSistemaService.getByType('contrato'),
    enabled: show,
  });
  const { data: diasVencimentoData } = useQuery({
    queryKey: ['dias-vencimento'],
    queryFn: () => DiasVencimentoService.get(),
    enabled: show,
  });
  
  const planos = useMemo(() => Array.isArray(planosData) ? planosData : (planosData?.data || []), [planosData]);
  const bancos = useMemo(() => Array.isArray(bancosData) ? bancosData : (bancosData?.data || []), [bancosData]);
  const modelosContrato = useMemo(() => modelosContratoData?.data || [], [modelosContratoData]);
  const diasVencimento = useMemo(() => (diasVencimentoData?.data && Array.isArray(diasVencimentoData.data)) ? diasVencimentoData.data : [], [diasVencimentoData]);
  
  // Objetos selecionados sincronizados com os selects
  const [planoSelecionado, setPlanoSelecionado] = useSelectedEntity<Plano>(formData.plano_id, planos);
  const [bancoSelecionado, setBancoSelecionado] = useSelectedEntity<Banco>(formData.conta_boleto, bancos);
  const [modeloContratoSelecionado, setModeloContratoSelecionado] = useSelectedEntity<DocumentoSistema>(formData.modelo_documento_id, modelosContrato);

  // Sincronizar formData do hook com os selects quando mudar
  useEffect(() => {
    if (formData.plano_id && planos.length > 0) {
      const plano = planos.find(p => p.id === formData.plano_id);
      if (plano && planoSelecionado?.id !== plano.id) {
        setPlanoSelecionado(plano);
      }
    }
  }, [formData.plano_id, planos, planoSelecionado, setPlanoSelecionado]);

  useEffect(() => {
    if (formData.conta_boleto && bancos.length > 0) {
      const banco = bancos.find(b => b.id === formData.conta_boleto);
      if (banco && bancoSelecionado?.id !== banco.id) {
        setBancoSelecionado(banco);
      }
    }
  }, [formData.conta_boleto, bancos, bancoSelecionado, setBancoSelecionado]);

  useEffect(() => {
    if (formData.modelo_documento_id && modelosContrato.length > 0) {
      const modelo = modelosContrato.find(m => m.id === formData.modelo_documento_id);
      if (modelo && modeloContratoSelecionado?.id !== modelo.id) {
        setModeloContratoSelecionado(modelo);
      }
    }
  }, [formData.modelo_documento_id, modelosContrato, modeloContratoSelecionado, setModeloContratoSelecionado]);

  // Hooks para termos (apenas no modo edição) - ordenação no backend
  const { data: termosData, isLoading: isLoadingTermosContrato, refetch: refetchTermos } = useTermosContrato(
    isEditMode ? (internalContratoId || 0) : 0,
    {
      sortColumn: termosTableFilters.sortColumn,
      sortDirection: termosTableFilters.sortDirection as 'asc' | 'desc' | undefined
    }
  );
  const deleteTermoMutation = useDeleteTermoContrato();

  // Hooks para serviços adicionais (apenas no modo edição)
  const { data: servicosAdicionaisData, isLoading: isLoadingServicosAdicionais, refetch: refetchServicosAdicionais } = useContratoPlanosAdicionais(isEditMode ? (internalContratoId || 0) : 0);
  const deleteServicoAdicionalMutation = useDeleteContratoPlanoAdicional();

  // Garantir que termosData seja sempre um array
  const termosArray = Array.isArray(termosData) ? termosData : [];
  
  // Usar dados do contrato do hook
  const contratoData = formHook.contrato;
  const isLoading = formHook.isLoadingContrato;

  // Determinar o ID do cliente para buscar os dados
  const clienteIdToFetch = isEditMode && contratoData?.cliente_id 
    ? contratoData.cliente_id 
    : clienteId;

  // Buscar dados do cliente
  const { data: clienteData } = useQuery({
    queryKey: ['cliente', clienteIdToFetch],
    queryFn: () => ClienteService.getById(clienteIdToFetch!),
    enabled: !!clienteIdToFetch && show,
    staleTime: 60 * 1000,
  });

  // Buscar títulos/financeiros do contrato (apenas no modo edição) - ordenação no backend
  const { data: titulosData, isLoading: isLoadingTitulos, refetch: refetchTitulos } = useQuery({
    queryKey: ['titulos', 'contrato', internalContratoId, titulosTableFilters.sortColumn, titulosTableFilters.sortDirection],
    queryFn: async () => {
      const titulos = await TituloService.findByContrato(internalContratoId!, {
        sortColumn: titulosTableFilters.sortColumn,
        sortDirection: titulosTableFilters.sortDirection
      });
      return { data: titulos };
    },
    enabled: isEditMode && !!internalContratoId,
    staleTime: 30 * 1000,
  });

  // Limpar seleção quando os dados dos títulos mudarem e houver itens inválidos
  useEffect(() => {
    if (titulosData?.data && selectedItems.length > 0) {
      // Verificar se algum item selecionado não existe mais nos dados
      const selectedIds = selectedItems.map(item => item.id);
      const currentIds = titulosData.data.map((titulo: Titulo) => titulo.id);
      const hasInvalidSelection = selectedIds.some(id => !currentIds.includes(id));
      
      if (hasInvalidSelection) {
        // Limpar seleção apenas se houver itens inválidos
        setSelectedItems([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titulosData?.data]);

  // Limpar seleção de itens cancelados quando o filtro de ocultar cancelados for ativado (títulos regulares)
  useEffect(() => {
    if (!showCancelados && selectedItems.length > 0) {
      const canceladosSelecionados = selectedItems.filter(item => item.status?.toLowerCase() === 'cancelado');
      if (canceladosSelecionados.length > 0) {
        const itensNaoCancelados = selectedItems.filter(item => item.status?.toLowerCase() !== 'cancelado');
        setSelectedItems(itensNaoCancelados);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCancelados]);

  // Buscar títulos avulsos do contrato (apenas no modo edição) - ordenação no backend
  const { data: titulosAvulsosData, isLoading: isLoadingTitulosAvulsos, refetch: refetchTitulosAvulsos } = useQuery({
    queryKey: ['titulos', 'contrato', internalContratoId, 'avulsos', titulosAvulsosTableFilters.sortColumn, titulosAvulsosTableFilters.sortDirection],
    queryFn: async () => {
      const titulos = await TituloService.findAvulsosByContrato(internalContratoId!, {
        sortColumn: titulosAvulsosTableFilters.sortColumn,
        sortDirection: titulosAvulsosTableFilters.sortDirection
      });
      return { data: titulos };
    },
    enabled: isEditMode && !!internalContratoId,
    staleTime: 30 * 1000,
  });

  // Limpar seleção quando os dados dos títulos avulsos mudarem e houver itens inválidos
  useEffect(() => {
    if (titulosAvulsosData?.data && selectedAvulsosItems.length > 0) {
      // Verificar se algum item selecionado não existe mais nos dados
      const selectedIds = selectedAvulsosItems.map(item => item.id);
      const currentIds = titulosAvulsosData.data.map((titulo: Titulo) => titulo.id);
      const hasInvalidSelection = selectedIds.some(id => !currentIds.includes(id));
      
      if (hasInvalidSelection) {
        // Limpar seleção apenas se houver itens inválidos
        setSelectedAvulsosItems([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titulosAvulsosData?.data]);

  // Limpar seleção de itens cancelados quando o filtro de ocultar cancelados for ativado (títulos avulsos)
  useEffect(() => {
    if (!showCanceladosAvulsos && selectedAvulsosItems.length > 0) {
      const canceladosSelecionados = selectedAvulsosItems.filter(item => item.status?.toLowerCase() === 'cancelado');
      if (canceladosSelecionados.length > 0) {
        const itensNaoCancelados = selectedAvulsosItems.filter(item => item.status?.toLowerCase() !== 'cancelado');
        setSelectedAvulsosItems(itensNaoCancelados);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCanceladosAvulsos]);

  // Mutations são gerenciadas pelo hook useContratoForm

  // Hook para impressão de contratos
  const impressaoHook = useImpressaoContrato({
    clienteId: contratoData?.cliente_id || undefined
  });

  // handleInputChange é gerenciado pelo hook
  const handleInputChange = formHook.handleInputChange;

  // Callbacks para seleção nos modais
  const handlePlanoSelect = (plano: Plano) => {
    setPlanoSelecionado(plano);
    handleInputChange('plano_id', plano.id);
    setShowPlanoModal(false);
  };

  const handleBancoSelect = (banco: Banco) => {
    setBancoSelecionado(banco);
    handleInputChange('conta_boleto', banco.id);
    setShowBancoModal(false);
  };

  const handleModeloContratoSelect = (modelo: DocumentoSistema) => {
    setModeloContratoSelecionado(modelo);
    handleInputChange('modelo_documento_id', modelo.id);
    setShowModeloContratoModal(false);
  };


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

  // Funções para impressão (apenas no modo edição)
  const handleImprimirSelecionados = async () => {
    if (selectedItems.length === 0) return;
    // Abrir modal imediatamente
    setShowPreview(true);
    setIsGeneratingPdfLocal(true);
    
    // Limpar URL anterior se existir
    if (pdfUrlLocal) {
      window.URL.revokeObjectURL(pdfUrlLocal);
      setPdfUrlLocal(null);
    }
    
    try {
      const ids = selectedItems.map(item => item.id);
      const pdfBlob = await TituloService.gerarPdfBoletosMultiplos(ids);
      
      const url = window.URL.createObjectURL(pdfBlob);
      setPdfUrlLocal(url);
      setIsGeneratingPdfLocal(false);
      
      success(t('messages.successPrintSelected'));
    } catch (err) {
      error(t('messages.errorPrintSelected'));
      setShowPreview(false);
      setIsGeneratingPdfLocal(false);
    }
  };

  const handleImprimirContrato = async () => {
    if (!contratoData?.cliente_id) {
      error(t('messages.clientNotFound'));
      return;
    }
    
    await impressaoHook.imprimirContrato(
      internalContratoId || undefined,
      contratoData.cliente_id
    );
  };

  const handleImprimirTodosEmAberto = async () => {
    if (!titulosData?.data) {
      success(t('messages.noData'));
      return;
    }
    const titulosEmAberto = titulosData.data.filter((titulo: Titulo) => 
      titulo.status === 'pendente' || titulo.status === 'vencido'
    );
    if (titulosEmAberto.length === 0) {
      success(t('messages.noData'));
      return;
    }
    // Abrir modal imediatamente
    setShowPreview(true);
    setIsGeneratingPdfLocal(true);
    
    // Limpar URL anterior se existir
    if (pdfUrlLocal) {
      window.URL.revokeObjectURL(pdfUrlLocal);
      setPdfUrlLocal(null);
    }
    
    try {
      const ids = titulosEmAberto.map((titulo: Titulo) => titulo.id);
      const pdfBlob = await TituloService.gerarPdfBoletosMultiplos(ids);
      
      const url = window.URL.createObjectURL(pdfBlob);
      setPdfUrlLocal(url);
      setIsGeneratingPdfLocal(false);
      
      success(t('messages.successPrintOpen'));
    } catch (err) {
      error(t('messages.errorPrintOpen'));
      setShowPreview(false);
      setIsGeneratingPdfLocal(false);
    }
  };

  // Funções para impressão de títulos avulsos
  const handleImprimirSelecionadosAvulsos = async () => {
    if (selectedAvulsosItems.length === 0) return;
    // Abrir modal imediatamente
    setShowPreview(true);
    setIsGeneratingPdfLocal(true);
    
    // Limpar URL anterior se existir
    if (pdfUrlLocal) {
      window.URL.revokeObjectURL(pdfUrlLocal);
      setPdfUrlLocal(null);
    }
    
    try {
      const ids = selectedAvulsosItems.map(item => item.id);
      const pdfBlob = await TituloService.gerarPdfBoletosMultiplos(ids);
      
      const url = window.URL.createObjectURL(pdfBlob);
      setPdfUrlLocal(url);
      setIsGeneratingPdfLocal(false);
      
      success(t('messages.successPrintSelected'));
    } catch (err) {
      error(t('messages.errorPrintSelected'));
      setShowPreview(false);
      setIsGeneratingPdfLocal(false);
    }
  };

  const handleImprimirTodosEmAbertoAvulsos = async () => {
    if (!titulosAvulsosData?.data) {
      success(t('messages.noData'));
      return;
    }
    const titulosEmAberto = titulosAvulsosData.data.filter((titulo: Titulo) => 
      titulo.status === 'pendente' || titulo.status === 'vencido'
    );
    if (titulosEmAberto.length === 0) {
      success(t('messages.noData'));
      return;
    }
    // Abrir modal imediatamente
    setShowPreview(true);
    setIsGeneratingPdfLocal(true);
    
    // Limpar URL anterior se existir
    if (pdfUrlLocal) {
      window.URL.revokeObjectURL(pdfUrlLocal);
      setPdfUrlLocal(null);
    }
    
    try {
      const ids = titulosEmAberto.map((titulo: Titulo) => titulo.id);
      const pdfBlob = await TituloService.gerarPdfBoletosMultiplos(ids);
      
      const url = window.URL.createObjectURL(pdfBlob);
      setPdfUrlLocal(url);
      setIsGeneratingPdfLocal(false);
      
      success(t('messages.successPrintOpen'));
    } catch (err) {
      error(t('messages.errorPrintOpen'));
      setShowPreview(false);
      setIsGeneratingPdfLocal(false);
    }
  };

  // Bulk actions para títulos (apenas no modo edição)
  const bulkActions: BulkAction<Titulo>[] = isEditMode ? [
    {
      label: t('actions.edit'),
      action: (selectedItems: Titulo[]) => {
        if (selectedItems.length > 0) {
          const item = selectedItems[0];
          setSelectedTituloId(item.id);
          setShowTituloEditModal(true);
        }
      },
      disabled: (selectedItems: Titulo[]) => selectedItems.length !== 1
    },
    {
      label: t('actions.receive'),
      action: (selectedItems: Titulo[]) => {
        if (selectedItems.length > 0) {
          const item = selectedItems[0];
          setSelectedParcela(item);
          setShowReceberModal(true);
        }
      },
      disabled: (selectedItems: Titulo[]) => {
        if (selectedItems.length === 0) return true;
        return selectedItems.every(item => item.status === 'pago' || item.status === 'cancelado');
      }
    },
    {
      label: t('actions.cancel'),
      action: async (selectedItems: Titulo[]) => {
        if (selectedItems.length === 0) return;
        
        const confirmMessage = selectedItems.length === 1 
          ? t('messages.confirmCancelTitle')
          : t('messages.confirmCancelTitles', { count: selectedItems.length });
          
        const confirmed = await confirm({
          message: confirmMessage,
          variant: 'warning',
          title: t('financial.cancelTitles'),
          confirmText: t('actions.cancel'),
          cancelText: t('buttons.back'),
        });
        
        if (confirmed) {
          try {
            let successCount = 0;
            let errorCount = 0;
            
            for (const item of selectedItems) {
              try {
                await TituloService.update(item.id, { status: 'cancelado' });
                successCount++;
              } catch (err) {
                errorCount++;
              }
            }
            
            // Aguardar invalidação e refetch completarem antes de mostrar mensagem
            await queryClient.invalidateQueries({ queryKey: ['titulos', 'contrato', internalContratoId] });
            await refetchTitulos();
            
            // Limpar seleção após cancelamento
            setSelectedItems([]);
            
            if (successCount > 0) {
              const message = successCount === 1 
                ? t('messages.successCancelTitle')
                : t('messages.successCancelTitles', { count: successCount });
              success(message);
            }
            
            if (errorCount > 0) {
              const message = errorCount === 1 
                ? t('messages.errorCancelTitle')
                : t('messages.errorCancelTitles', { count: errorCount });
              error(message);
            }
          } catch (err) {
            error(t('messages.errorCancelTitlesGeneral'));
          }
        }
      },
      disabled: (selectedItems: Titulo[]) => {
        if (selectedItems.length === 0) return true;
        return selectedItems.every(item => item.status === 'pago' || item.status === 'cancelado');
      }
    },
    {
      label: t('actions.reverse'),
      action: async (selectedItems: Titulo[]) => {
        if (selectedItems.length === 0) return;
        
        const item = selectedItems[0];
        if (item.status !== 'pago') {
          error(t('financial.canOnlyReversePaid'));
          return;
        }
        
        const confirmed = await confirm({
          message: `${t('financial.confirmReverse', { number: item.numero_titulo })}\n\n` +
            `${t('form.value')}: ${formatCurrency(item.valor_pago || item.valor || 0)}\n` +
            `${t('financial.titleWillReturnPending')}`,
          variant: 'warning',
          title: t('financial.reverseTitle'),
          confirmText: t('actions.reverse'),
          cancelText: t('actions.cancel'),
        });
        
        if (confirmed) {
          try {
            await TituloService.estornar(item.id);
            success(t('messages.successReverseTitle'));
            queryClient.invalidateQueries({ queryKey: ['titulos', 'contrato', internalContratoId] });
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : t('messages.errorReverseTitle');
            error(errorMessage);
          }
        }
      },
      disabled: (selectedItems: Titulo[]) => {
        if (selectedItems.length === 0) return true;
        return selectedItems.every(item => item.status !== 'pago');
      }
    },
    {
      label: t('buttons.print'),
      variant: 'primary',
      disabled: () => false,
      dropdown: [
        {
          label: t('other.selected'),
          action: handleImprimirSelecionados
        },
        {
          label: t('other.open'),
          action: handleImprimirTodosEmAberto
        }
      ]
    },
    {
      label: t('buttons.send'),
      disabled: (selectedItems: Titulo[]) => {
        if (selectedItems.length === 0) return true;
        return selectedItems.every(item => item.status === 'cancelado');
      },
      dropdown: [
        {
          label: t('other.viaWhatsApp'),
          action: async (selectedItems?: Titulo[]) => {
            const items = selectedItems || [];
            if (items.length > 0) {
              try {
                let successCount = 0;
                let errorCount = 0;
                let firstErrorMessage = '';
                
                for (const item of items) {
                  if (item.status === 'cancelado') continue;
                  try {
                    const response = await TituloService.enviarWhatsApp(item.id);
                    if (response.success) {
                      successCount++;
                    } else {
                      errorCount++;
                      if (!firstErrorMessage && response.message) {
                        firstErrorMessage = response.message;
                      }
                    }
                  } catch (err) {
                    errorCount++;
                    if (!firstErrorMessage) {
                      if (err && typeof err === 'object' && 'message' in err) {
                        firstErrorMessage = (err as { message: string }).message;
                      } else if (err instanceof Error) {
                        firstErrorMessage = err.message;
                      }
                    }
                  }
                }
                
                if (successCount > 0) {
                  const message = successCount === 1 
                    ? t('messages.successSendMessage')
                    : t('messages.successSendMessages', { count: successCount });
                  success(message);
                }
                
                if (errorCount > 0) {
                  const message = firstErrorMessage || (errorCount === 1 
                    ? t('messages.errorSendMessage')
                    : t('messages.errorSendMessages', { count: errorCount }));
                  error(message);
                }
              } catch (err) {
                error(t('messages.errorSendMessagesGeneral'));
              }
            }
          }
        },
        {
          label: t('other.viaEmail'),
          action: async (selectedItems?: Titulo[]) => {
            const items = selectedItems || [];
            if (items.length > 0) {
              try {
                let successCount = 0;
                let errorCount = 0;
                let firstErrorMessage = '';
                
                for (const item of items) {
                  if (item.status === 'cancelado') continue;
                  try {
                    const response = await TituloService.enviarEmail(item.id);
                    if (response.success) {
                      successCount++;
                    } else {
                      errorCount++;
                      if (!firstErrorMessage && response.message) {
                        firstErrorMessage = response.message;
                      }
                    }
                  } catch (err) {
                    errorCount++;
                    if (!firstErrorMessage) {
                      if (err && typeof err === 'object' && 'message' in err) {
                        firstErrorMessage = (err as { message: string }).message;
                      } else if (err instanceof Error) {
                        firstErrorMessage = err.message;
                      }
                    }
                  }
                }
                
                if (successCount > 0) {
                  const message = successCount === 1 
                    ? t('messages.successSendEmail')
                    : t('messages.successSendEmails', { count: successCount });
                  success(message);
                }
                
                if (errorCount > 0) {
                  const message = firstErrorMessage || (errorCount === 1 
                    ? t('messages.errorSendEmail')
                    : t('messages.errorSendEmails', { count: errorCount }));
                  error(message);
                }
              } catch (err) {
                error(t('messages.errorSendEmailsGeneral'));
              }
            }
          }
        }
      ]
    }
  ] : [];

  // Bulk actions para títulos avulsos (apenas no modo edição)
  // Apenas títulos avulsos podem ser criados manualmente (títulos normais são gerados pelo scheduler)
  const bulkActionsAvulsos: BulkAction<Titulo>[] = isEditMode ? [
    {
      label: t('other.newMiscTitle'),
      action: () => {
        setShowTituloCreateModal(true);
      }
    },
    {
      label: t('actions.edit'),
      action: (selectedItems: Titulo[]) => {
        if (selectedItems.length > 0) {
          const item = selectedItems[0];
          setSelectedTituloId(item.id);
          setShowTituloEditModal(true);
        }
      },
      disabled: (selectedItems: Titulo[]) => selectedItems.length !== 1
    },
    {
      label: t('actions.receive'),
      action: (selectedItems: Titulo[]) => {
        if (selectedItems.length > 0) {
          const item = selectedItems[0];
          setSelectedParcela(item);
          setShowReceberModal(true);
        }
      },
      disabled: (selectedItems: Titulo[]) => {
        if (selectedItems.length === 0) return true;
        return selectedItems.every(item => item.status === 'pago' || item.status === 'cancelado');
      }
    },
    {
      label: t('actions.cancel'),
      action: async (selectedItems: Titulo[]) => {
        if (selectedItems.length === 0) return;
        
        const confirmMessage = selectedItems.length === 1 
          ? t('messages.confirmCancelTitle')
          : t('messages.confirmCancelTitles', { count: selectedItems.length });
          
        const confirmed = await confirm({
          message: confirmMessage,
          variant: 'warning',
          title: t('financial.cancelTitles'),
          confirmText: t('actions.cancel'),
          cancelText: t('buttons.back'),
        });
        
        if (confirmed) {
          try {
            let successCount = 0;
            let errorCount = 0;
            
            for (const item of selectedItems) {
              try {
                await TituloService.update(item.id, { status: 'cancelado' });
                successCount++;
              } catch (err) {
                errorCount++;
              }
            }
            
            // Aguardar invalidação e refetch completarem antes de mostrar mensagem
            await queryClient.invalidateQueries({ queryKey: ['titulos', 'contrato', internalContratoId, 'avulsos'] });
            await refetchTitulosAvulsos();
            
            // Limpar seleção após cancelamento
            setSelectedAvulsosItems([]);
            
            if (successCount > 0) {
              const message = successCount === 1 
                ? t('messages.successCancelTitle')
                : t('messages.successCancelTitles', { count: successCount });
              success(message);
            }
            
            if (errorCount > 0) {
              const message = errorCount === 1 
                ? t('messages.errorCancelTitle')
                : t('messages.errorCancelTitles', { count: errorCount });
              error(message);
            }
          } catch (err) {
            error(t('messages.errorCancelTitlesGeneral'));
          }
        }
      },
      disabled: (selectedItems: Titulo[]) => {
        if (selectedItems.length === 0) return true;
        return selectedItems.every(item => item.status === 'pago' || item.status === 'cancelado');
      }
    },
    {
      label: t('actions.reverse'),
      action: async (selectedItems: Titulo[]) => {
        if (selectedItems.length === 0) return;
        
        const item = selectedItems[0];
        if (item.status !== 'pago') {
          error(t('financial.canOnlyReversePaid'));
          return;
        }
        
        const confirmed = await confirm({
          message: `${t('financial.confirmReverse', { number: item.numero_titulo })}\n\n` +
            `${t('form.value')}: ${formatCurrency(item.valor_pago || item.valor || 0)}\n` +
            `${t('financial.titleWillReturnPending')}`,
          variant: 'warning',
          title: t('financial.reverseTitle'),
          confirmText: t('actions.reverse'),
          cancelText: t('actions.cancel'),
        });
        
        if (confirmed) {
          try {
            await TituloService.estornar(item.id);
            success(t('messages.successReverseTitle'));
            queryClient.invalidateQueries({ queryKey: ['titulos', 'contrato', internalContratoId, 'avulsos'] });
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : t('messages.errorReverseTitle');
            error(errorMessage);
          }
        }
      },
      disabled: (selectedItems: Titulo[]) => {
        if (selectedItems.length === 0) return true;
        return selectedItems.every(item => item.status !== 'pago');
      }
    },
    {
      label: t('buttons.print'),
      variant: 'primary',
      disabled: () => false,
      dropdown: [
        {
          label: t('other.selected'),
          action: handleImprimirSelecionadosAvulsos
        },
        {
          label: t('other.open'),
          action: handleImprimirTodosEmAbertoAvulsos
        }
      ]
    },
    {
      label: t('buttons.send'),
      disabled: (selectedItems: Titulo[]) => {
        if (selectedItems.length === 0) return true;
        return selectedItems.every(item => item.status === 'cancelado');
      },
      dropdown: [
        {
          label: t('other.viaWhatsApp'),
          action: async (selectedItems?: Titulo[]) => {
            const items = selectedItems || [];
            if (items.length > 0) {
              try {
                let successCount = 0;
                let errorCount = 0;
                let firstErrorMessage = '';
                
                for (const item of items) {
                  if (item.status === 'cancelado') continue;
                  try {
                    const response = await TituloService.enviarWhatsApp(item.id);
                    if (response.success) {
                      successCount++;
                    } else {
                      errorCount++;
                      if (!firstErrorMessage && response.message) {
                        firstErrorMessage = response.message;
                      }
                    }
                  } catch (err) {
                    errorCount++;
                    if (!firstErrorMessage) {
                      if (err && typeof err === 'object' && 'message' in err) {
                        firstErrorMessage = (err as { message: string }).message;
                      } else if (err instanceof Error) {
                        firstErrorMessage = err.message;
                      }
                    }
                  }
                }
                
                if (successCount > 0) {
                  const message = successCount === 1 
                    ? t('messages.successSendMessage')
                    : t('messages.successSendMessages', { count: successCount });
                  success(message);
                }
                
                if (errorCount > 0) {
                  const message = firstErrorMessage || (errorCount === 1 
                    ? t('messages.errorSendMessage')
                    : t('messages.errorSendMessages', { count: errorCount }));
                  error(message);
                }
              } catch (err) {
                error(t('messages.errorSendMessagesGeneral'));
              }
            }
          }
        },
        {
          label: t('other.viaEmail'),
          action: async (selectedItems?: Titulo[]) => {
            const items = selectedItems || [];
            if (items.length > 0) {
              try {
                let successCount = 0;
                let errorCount = 0;
                let firstErrorMessage = '';
                
                for (const item of items) {
                  if (item.status === 'cancelado') continue;
                  try {
                    const response = await TituloService.enviarEmail(item.id);
                    if (response.success) {
                      successCount++;
                    } else {
                      errorCount++;
                      if (!firstErrorMessage && response.message) {
                        firstErrorMessage = response.message;
                      }
                    }
                  } catch (err) {
                    errorCount++;
                    if (!firstErrorMessage) {
                      if (err && typeof err === 'object' && 'message' in err) {
                        firstErrorMessage = (err as { message: string }).message;
                      } else if (err instanceof Error) {
                        firstErrorMessage = err.message;
                      }
                    }
                  }
                }
                
                if (successCount > 0) {
                  const message = successCount === 1 
                    ? t('messages.successSendEmail')
                    : t('messages.successSendEmails', { count: successCount });
                  success(message);
                }
                
                if (errorCount > 0) {
                  const message = firstErrorMessage || (errorCount === 1 
                    ? t('messages.errorSendEmail')
                    : t('messages.errorSendEmails', { count: errorCount }));
                  error(message);
                }
              } catch (err) {
                error(t('messages.errorSendEmailsGeneral'));
              }
            }
          }
        }
      ]
    }
  ] : [];

  // Bulk actions para termos (apenas no modo edição)
  const termosBulkActions: BulkAction<TermoContrato>[] = isEditMode ? [
    {
      label: t('actions.create'),
      action: () => {
        setEditingTermo(null);
        setTermoFormData({
          assinado: 'NAO',
          termoCadastradoId: 0
        });
        setShowTermoModal(true);
      }
    },
    {
      label: t('actions.edit'),
      action: (selectedItems: TermoContrato[]) => {
        const termo = selectedItems && selectedItems.length > 0 ? selectedItems[0] : (selectedTermosItems.length > 0 ? selectedTermosItems[0] : null);
        if (termo) {
          setEditingTermo(termo);
          setTermoFormData({
            assinado: termo.assinado,
            termoCadastradoId: termo.modelo_documento_id || 0
          });
          setShowTermoModal(true);
        }
      },
      disabled: (selectedItems: TermoContrato[]) => selectedItems.length === 0 && selectedTermosItems.length === 0
    },
    {
      label: t('actions.delete'),
      action: async (selectedItems: TermoContrato[]) => {
        const items = selectedItems && selectedItems.length > 0 ? selectedItems : selectedTermosItems;
        if (items.length === 0) return;
        
        const confirmMessage = items.length === 1 
          ? t('messages.confirmDelete')
          : `${t('messages.confirmDelete')} (${items.length} ${t('tabs.terms').toLowerCase()})`;
          
        const confirmed = await confirm({
          message: confirmMessage,
          variant: 'danger',
          title: t('other.deleteTerms'),
          confirmText: t('actions.delete'),
          cancelText: t('actions.cancel'),
        });
        
        if (confirmed) {
          try {
            let successCount = 0;
            for (const item of items) {
              await deleteTermoMutation.mutateAsync(item.id);
              successCount++;
            }
            if (successCount === 1) {
              success(t('messages.successDeleteTerm'));
            } else {
              success(t('messages.successDeleteTerms'));
            }
            queryClient.invalidateQueries({ queryKey: ['termos-contrato', internalContratoId] });
          } catch (err) {
            if (items.length === 1) {
              error(t('messages.errorDeleteTerm'));
            } else {
              error(t('messages.errorDeleteTerms'));
            }
          }
        }
      },
      disabled: (selectedItems: TermoContrato[]) => selectedItems.length === 0 && selectedTermosItems.length === 0
    },
    {
      label: t('buttons.print'),
      variant: 'primary',
      disabled: () => selectedTermosItems.length === 0,
      action: async () => {
        if (selectedTermosItems.length > 0 && internalContratoId) {
          const termo = selectedTermosItems[0];
          if (termo.modelo_documento_id && internalContratoId) {
            // Abrir modal imediatamente
            setShowPreview(true);
            setIsGeneratingPdfLocal(true);
            
            // Limpar URL anterior se existir
            if (pdfUrlLocal) {
              window.URL.revokeObjectURL(pdfUrlLocal);
              setPdfUrlLocal(null);
            }
            
            try {
              const blob = await ModeloTermoService.generatePdfWithContrato(termo.modelo_documento_id, internalContratoId);
              const url = window.URL.createObjectURL(blob);
              setPdfUrlLocal(url);
              setIsGeneratingPdfLocal(false);
            } catch (err) {
              error(err instanceof Error ? err.message : 'Erro ao gerar documento para impressão');
              setShowPreview(false);
              setIsGeneratingPdfLocal(false);
            }
          }
        }
      }
    },
    {
      label: t('modal.sendSignature'),
      disabled: (selectedItems: TermoContrato[]) => {
        const items = selectedItems && selectedItems.length > 0 ? selectedItems : selectedTermosItems;
        return items.length === 0 || items[0]?.assinado === 'SIM';
      },
      action: (selectedItems: TermoContrato[]) => {
        const items = selectedItems && selectedItems.length > 0 ? selectedItems : selectedTermosItems;
        if (items.length > 0) {
          const termo = items[0];
          setTermoParaAssinatura(termo);
          setShowEnviarAssinaturaModal(true);
        }
      }
    }
  ] : [];

  // Bulk actions para serviços adicionais (apenas no modo edição)
  const servicosAdicionaisBulkActions: BulkAction<ContratoPlanoAdicional>[] = isEditMode ? [
    {
      label: t('actions.create'),
      action: () => {
        setEditingServicoAdicional(null);
        setShowServicoAdicionalModal(true);
      }
    },
    {
      label: t('actions.edit'),
      action: (selectedItems: ContratoPlanoAdicional[]) => {
        if (selectedItems.length > 0) {
          const servico = selectedItems[0];
          setEditingServicoAdicional(servico);
          setShowServicoAdicionalModal(true);
        }
      },
      disabled: (selectedItems: ContratoPlanoAdicional[]) => selectedItems.length === 0
    },
    {
      label: t('actions.delete'),
      action: async (selectedItems: ContratoPlanoAdicional[]) => {
        if (selectedItems.length === 0) return;
        
        const confirmMessage = selectedItems.length === 1 
          ? t('messages.confirmDeleteAdditionalService')
          : t('messages.confirmDeleteAdditionalServices', { count: selectedItems.length });
          
        const confirmed = await confirm({
          message: confirmMessage,
          variant: 'danger',
          title: t('modal.deleteAdditionalServices'),
          confirmText: t('actions.delete'),
          cancelText: t('actions.cancel'),
        });
        
        if (confirmed) {
          try {
            let successCount = 0;
            let errorCount = 0;
            
            for (const item of selectedItems) {
              try {
                await deleteServicoAdicionalMutation.mutateAsync(item.id);
                successCount++;
              } catch (err: unknown) {
                errorCount++;
                const errorMessage = extractApiErrorMessageSync(err, {
                  defaultMessage: CONTEXT_ERROR_MESSAGES.SERVICO_ADICIONAL_DELETE_ERROR
                });
                if (selectedItems.length === 1) {
                  error(errorMessage);
                }
              }
            }
            
            if (successCount > 0) {
              const message = successCount === 1 
                ? t('messages.successDeleteAdditionalService')
                : t('messages.successDeleteAdditionalServices', { count: successCount });
              success(message);
            }
            
            if (errorCount > 0 && selectedItems.length > 1) {
              error(t('messages.errorDeleteAdditionalServices', { count: errorCount }));
            }
            
            queryClient.invalidateQueries({ queryKey: ['contrato-planos-adicionais', internalContratoId] });
          } catch (err: unknown) {
            const errorMessage = extractApiErrorMessageSync(err, {
              defaultMessage: CONTEXT_ERROR_MESSAGES.SERVICOS_ADICIONAIS_DELETE_ERROR
            });
            error(errorMessage);
          }
        }
      },
      disabled: (selectedItems: ContratoPlanoAdicional[]) => selectedItems.length === 0
    }
  ] : [];

  // Colunas para a tabela de títulos
  const columns = [
    {
      key: 'id',
      label: t('table.id'),
      sortable: true,
      searchable: true,
      width: 42,
      resizable: true,
      render: (item: Titulo) => item.id 
    },
    {
      key: 'contrato_id',
      label: t('table.contract'),
      sortable: true,
      searchable: true,
      render: (item: Titulo) => item.contrato_id || '-'
    },
    {
      key: 'status',
      label: t('table.status'),
      sortable: true,
      searchable: true,
      render: (item: Titulo) => (
        <span className={`badge bg-${getStatusColor(item.status)}`}>
          {item.status === 'pago' ? t('status.paid') :
           item.status === 'pago_atraso' ? t('status.paidLate') :
           item.status === 'pendente' ? t('status.pending') :
           item.status === 'vencido' ? t('status.overdue') :
           item.status === 'parcial' ? t('status.partial') :
           item.status === 'cancelado' ? t('status.cancelled') :
           item.status}
        </span>
      )
    },
    { 
      key: 'plano', 
      label: t('table.plan'), 
      sortable: true,
      searchable: true,
      render: (item: Titulo) => item.plano?.nome_plano || '-' 
    },
    { 
      key: 'numero_titulo', 
      label: t('table.titleNumber'), 
      sortable: true,
      searchable: true,
      render: (item: Titulo) => item.numero_titulo || '-' 
    },
    {
      key: 'data_vencimento',
      label: t('table.dueDate'),
      sortable: true,
      searchable: false,
      render: (item: Titulo) => formatDate(item.data_vencimento)
    },
    {
      key: 'valor',
      label: t('form.value'),
      sortable: true,
      searchable: true,
      render: (item: Titulo) => `R$ ${Number(item.valor || 0).toFixed(2)}`
    },
    {
      key: 'valor_pago',
      label: t('table.paidValueDownloaded'),
      sortable: true,
      searchable: true,
      render: (item: Titulo) => item.status === 'pago' ? `R$ ${Number(item.valor_pago || item.valor || 0).toFixed(2)}` : 'R$ 0,00'
    },
    {
      key: 'valor_aberto',
      label: t('table.openValueOpen'),
      sortable: true,
      searchable: true,
      render: (item: Titulo) => (item.status === 'pago' || item.status === 'cancelado') ? 'R$ 0,00' : `R$ ${Number(item.valor || 0).toFixed(2)}`
    },
    {
      key: 'nfse_numero',
      label: t('table.nf'),
      sortable: true,
      searchable: true,
      render: (item: Titulo) => item.nfse_numero || '-'
    },
    {
      key: 'nfse_status',
      label: t('table.nfStatus'),
      sortable: true,
      searchable: true,
      render: (item: Titulo) => {
        if (!item.nfse_status) return '-';
        const statusMap: Record<string, { label: string; color: string }> = {
          'agendado': { label: t('status.scheduled'), color: 'info' },
          'emitida': { label: t('status.issued'), color: 'success' },
          'cancelada': { label: t('status.cancelled'), color: 'danger' },
          'rejeitada': { label: t('status.rejected'), color: 'warning' },
          'erro': { label: t('status.error'), color: 'danger' }
        };
        const status = statusMap[item.nfse_status] || { label: item.nfse_status, color: 'secondary' };
        return <span className={`badge bg-${status.color}`}>{status.label}</span>;
      }
    },
    {
      key: 'data_pagamento',
      label: t('table.paymentDate'),
      sortable: true,
      searchable: false,
      render: (item: Titulo) => {
        // Usar data_pagamento_formatada se disponível (vem do backend já formatada com hora)
        if (item.data_pagamento_formatada) {
          return item.data_pagamento_formatada;
        }
        // Fallback para formatDate se não tiver formato do backend
        return item.data_pagamento ? formatDate(item.data_pagamento) : '-';
      }
    },
    { 
      key: 'charge_id', 
      label: t('table.chargeId'), 
      sortable: true,
      searchable: true,
      render: (item: Titulo) => item.charge_id || '-' 
    },
    { 
      key: 'nosso_numero', 
      label: t('table.ourNumber'), 
      sortable: true,
      searchable: true,
      render: (item: Titulo) => item.nosso_numero || '-' 
    },
    {
      key: 'created_at',
      label: t('table.createdAt'),
      sortable: true,
      searchable: false,
      render: (item: Titulo) => {
        // Usar created_at_formatada se disponível (vem do backend já formatada)
        if (item.created_at_formatada) {
          return item.created_at_formatada;
        }
        // Fallback para formatDateTime se não tiver formato do backend
        return item.created_at ? formatDateTime(item.created_at) : '-';
      }
    }
  ];

  // Colunas para a tabela de títulos avulsos (sem endereço)
  const columnsAvulsos = [
    {
      key: 'id',
      label: t('table.id'),
      sortable: true,
      searchable: true,
      width: 42,
      resizable: true,
      render: (item: Titulo) => item.id 
    },
    {
      key: 'contrato_id',
      label: t('table.contract'),
      sortable: true,
      searchable: true,
      render: (item: Titulo) => item.contrato_id || '-'
    },
    {
      key: 'status',
      label: t('table.status'),
      sortable: true,
      searchable: true,
      render: (item: Titulo) => (
        <span className={`badge bg-${getStatusColor(item.status)}`}>
          {item.status === 'pago' ? t('status.paid') :
           item.status === 'pago_atraso' ? t('status.paidLate') :
           item.status === 'pendente' ? t('status.pending') :
           item.status === 'vencido' ? t('status.overdue') :
           item.status === 'parcial' ? t('status.partial') :
           item.status === 'cancelado' ? t('status.cancelled') :
           item.status}
        </span>
      )
    },
    { 
      key: 'plano', 
      label: t('table.plan'), 
      sortable: true,
      searchable: true,
      render: (item: Titulo) => item.plano?.nome_plano || '-' 
    },
    { 
      key: 'numero_titulo', 
      label: t('table.titleNumber'), 
      sortable: true,
      searchable: true,
      render: (item: Titulo) => item.numero_titulo || '-' 
    },
    {
      key: 'data_vencimento',
      label: t('table.dueDate'),
      sortable: true,
      searchable: false,
      render: (item: Titulo) => formatDate(item.data_vencimento)
    },
    {
      key: 'valor',
      label: t('form.value'),
      sortable: true,
      searchable: true,
      render: (item: Titulo) => `R$ ${Number(item.valor || 0).toFixed(2)}`
    },
    {
      key: 'valor_pago',
      label: t('table.paidValueDownloaded'),
      sortable: true,
      searchable: true,
      render: (item: Titulo) => item.status === 'pago' ? `R$ ${Number(item.valor_pago || item.valor || 0).toFixed(2)}` : 'R$ 0,00'
    },
    {
      key: 'valor_aberto',
      label: t('table.openValueOpen'),
      sortable: true,
      searchable: true,
      render: (item: Titulo) => (item.status === 'pago' || item.status === 'cancelado') ? 'R$ 0,00' : `R$ ${Number(item.valor || 0).toFixed(2)}`
    },
    {
      key: 'data_pagamento',
      label: t('table.paymentDate'),
      sortable: true,
      searchable: false,
      render: (item: Titulo) => {
        if (item.data_pagamento_formatada) {
          return item.data_pagamento_formatada;
        }
        return item.data_pagamento ? formatDate(item.data_pagamento) : '-';
      }
    },
    { 
      key: 'charge_id', 
      label: t('table.chargeId'), 
      sortable: true,
      searchable: true,
      render: (item: Titulo) => item.charge_id || '-' 
    },
    { 
      key: 'nosso_numero', 
      label: t('table.ourNumber'), 
      sortable: true,
      searchable: true,
      render: (item: Titulo) => item.nosso_numero || '-' 
    },
    {
      key: 'created_at',
      label: t('table.createdAt'),
      sortable: true,
      searchable: false,
      render: (item: Titulo) => {
        if (item.created_at_formatada) {
          return item.created_at_formatada;
        }
        return item.created_at ? formatDateTime(item.created_at) : '-';
      }
    }
  ];

  // Colunas para a tabela de serviços adicionais
  const servicosAdicionaisColumns = [
    {
      key: 'id',
      label: t('table.id'),
      sortable: true,
      searchable: true,
      width: 42,
      resizable: true,
      render: (item: ContratoPlanoAdicional) => item.id
    },
    {
      key: 'plano',
      label: t('table.plan'),
      sortable: true,
      searchable: true,
      render: (item: ContratoPlanoAdicional) => item.plano?.nome_plano || 'N/A'
    },
    {
      key: 'valor_original',
      label: t('form.originalValue'),
      sortable: true,
      searchable: false,
      render: (item: ContratoPlanoAdicional) => {
        const valor = parseFloat(item.plano?.valor_mensal?.toString() || '0') || 0;
        return `R$ ${valor.toFixed(2).replace('.', ',')}`;
      }
    },
    {
      key: 'desconto',
      label: t('form.discount'),
      sortable: true,
      searchable: false,
      render: (item: ContratoPlanoAdicional) => {
        if (item.desconto_valor && parseFloat(item.desconto_valor.toString()) > 0) {
          const valor = parseFloat(item.desconto_valor.toString()) || 0;
          return `R$ ${valor.toFixed(2).replace('.', ',')}`;
        }
        if (item.desconto_percentual && parseFloat(item.desconto_percentual.toString()) > 0) {
          const percentual = parseFloat(item.desconto_percentual.toString()) || 0;
          return `${percentual.toFixed(2).replace('.', ',')}%`;
        }
        return '-';
      }
    },
    {
      key: 'valor_final',
      label: t('table.finalValue'),
      sortable: true,
      searchable: false,
      render: (item: ContratoPlanoAdicional) => {
        const valor = parseFloat(item.valor_final?.toString() || '0') || 0;
        return `R$ ${valor.toFixed(2).replace('.', ',')}`;
      }
    },
    {
      key: 'status',
      label: t('table.status'),
      sortable: true,
      searchable: true,
      render: (item: ContratoPlanoAdicional) => {
        const statusColors: Record<string, string> = {
          ativo: 'success',
          inativo: 'secondary',
          suspenso: 'warning'
        };
        const color = statusColors[item.status] || 'secondary';
        return (
          <span className={`badge bg-${color}`}>
            {item.status === 'ativo' ? t('status.active') :
             item.status === 'inativo' ? t('status.inactive') :
             item.status === 'suspenso' ? t('status.suspended') :
             item.status}
          </span>
        );
      }
    },
    {
      key: 'observacoes',
      label: t('form.observations'),
      sortable: true,
      searchable: true,
      render: (item: ContratoPlanoAdicional) => item.observacoes || '-'
    }
  ];

  // Colunas para a tabela de termos
  const termosColumns = [
    { key: 'id', label: t('table.id'), sortable: true, width: 42, resizable: true },
    { key: 'nome_termo', label: t('table.termName'), sortable: true, render: (item: TermoContrato) => item.modeloDocumento?.nome || '-' },
    {
      key: 'assinado',
      label: t('table.accepted'),
      sortable: true,
      render: (item: TermoContrato) => (
        <span className={`badge ${item.assinado === 'SIM' ? 'bg-success' : 'bg-secondary'}`}>
          {item.assinado === 'SIM' ? t('ui.yes') : t('ui.no')}
        </span>
      )
    },
    {
      key: 'data_aceite',
      label: t('table.acceptedDate'),
      sortable: true,
      render: (item: TermoContrato) => formatDateTime(item.data_aceite)
    },
    { key: 'aceito_por', label: t('table.acceptedBy'), sortable: true, render: (item: TermoContrato) => item.aceito_por || '-' },
    {
      key: 'ativo',
      label: t('table.status'),
      sortable: true,
      render: (item: TermoContrato) => (
        <span className={`badge ${item.ativo ? 'bg-success' : 'bg-secondary'}`}>
          {item.ativo ? t('status.active') : t('status.inactive')}
        </span>
      )
    },
    {
      key: 'created_at',
      label: t('table.createdAt'),
      sortable: true,
      render: (item: TermoContrato) => formatDate(item.created_at)
    }
  ];

  // Não filtrar cancelados aqui - deixar o FinanceiroTab gerenciar através do showCancelados
  // Adicionar campos virtuais para ordenação funcionar com campos aninhados (endereço do cliente)
  const sortedData = useMemo(() => {
    const filteredData = isEditMode && titulosData?.data 
      ? titulosData.data
      : [];
    
    if (!filteredData || filteredData.length === 0) return [];
    
    return filteredData.map((titulo: Titulo) => ({
      ...titulo,
      // Campos de endereço para ordenação
      endereco: titulo.cliente?.endereco || '',
      numero: titulo.cliente?.numero || '',
      complemento: titulo.cliente?.complemento || '',
      bairro: titulo.cliente?.bairro || '',
      cidade: titulo.cliente?.cidade || '',
      estado: titulo.cliente?.estado || ''
    }));
  }, [isEditMode, titulosData?.data]);

  // Dados de títulos avulsos (sem campos de endereço)
  const sortedAvulsosData = useMemo(() => {
    const filteredData = isEditMode && titulosAvulsosData?.data 
      ? titulosAvulsosData.data
      : [];
    
    if (!filteredData || filteredData.length === 0) return [];
    
    return filteredData;
  }, [isEditMode, titulosAvulsosData?.data]);
  
  // Backend já ordena termos e serviços adicionais por created_at DESC - não ordenar localmente
  const filteredTermosData = isEditMode && termosArray.length > 0
    ? termosArray.filter((termo: TermoContrato) => termo.ativo)
    : [];
  const sortedTermosData = filteredTermosData; // Backend já ordena
  
  // Dados de serviços adicionais - backend já ordena por created_at DESC
  const servicosAdicionaisArray = servicosAdicionaisData?.data || [];
  const sortedServicosAdicionaisData = servicosAdicionaisArray; // Backend já ordena

  // Atualizar internalContratoId quando contrato for criado
  useEffect(() => {
    if (!isEditMode && formHook.createdContratoId && formHook.createdContratoId !== internalContratoId) {
      setInternalContratoId(formHook.createdContratoId);
    }
  }, [formHook.createdContratoId, isEditMode, internalContratoId]);

  // handleSubmit é gerenciado pelo hook
  const handleSubmit = formHook.handleSubmit;

  if (isEditMode && isLoading) {
    return (
      <DraggableModal
        show={show}
        onClose={onClose}
        title={t('messages.loading')}
        size="lg"
        modalId="contrato-modal-loading"
      >
        <div className="text-center p-4">
          <Spinner size="md" variant="primary" aria-label="Carregando..." />
        </div>
      </DraggableModal>
    );
  }

  return (
    <>
    <DraggableModal
      show={show}
      onClose={onClose}
      title={isEditMode ? t('modal.editContract') : t('modal.createContract')}
      size="xl"
      modalId="contrato-modal"
      headerActions={
        // Mostrar headerActions apenas quando não estiver carregando
        !isLoading ? (
          <div className="contrato-header-unified">
            {/* Botões à direita */}
            <div className="contrato-header-buttons modal-header-actions">
              {isEditMode && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  leftIcon={<i className="bi bi-printer"></i>}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleImprimirContrato();
                  }}
                >
                  {t('buttons.print')}
                </Button>
              )}
              <Button
                type="button"
                variant="primary"
                size="sm"
                leftIcon={<i className="bi bi-x-lg"></i>}
                onClick={onClose}
              >
                {t('buttons.cancel')}
              </Button>
              <Button
                type="submit"
                form="contrato-form"
                variant="primary"
                size="sm"
                leftIcon={<i className="bi bi-check-lg"></i>}
                isLoading={formHook.isSubmitting}
              >
                {isEditMode ? t('buttons.save') : t('modal.createContract')}
              </Button>
            </div>

            {/* Abas na parte inferior do header */}
            <div className="contrato-header-tabs">
              <ul
                className={`nav nav-tabs contrato-tabs-unified ${isMobile ? 'contrato-tabs-mobile' : ''}`}
                id="contratoTab"
                role="tablist"
                style={{
                  margin: 0,
                  padding: 0,
                  borderBottom: 'none',
                  backgroundColor: 'transparent'
                }}
              >
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link modal-tab-hover ${activeTab === 'contrato' ? 'active' : ''}`}
                    type="button"
                    onClick={() => handleTabChange('contrato')}
                  >
                    {t('tabs.contractData')}
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link modal-tab-hover ${activeTab === 'endereco' ? 'active' : ''}`}
                    type="button"
                    onClick={() => handleTabChange('endereco')}
                  >
                    {t('tabs.address')}
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link modal-tab-hover ${activeTab === 'termos' ? 'active' : ''} ${!isEditMode ? 'contrato-tab-disabled' : ''}`}
                    type="button"
                    onClick={() => {
                      if (isEditMode) {
                        handleTabChange('termos');
                      }
                    }}
                    disabled={!isEditMode}
                  >
                    {t('tabs.terms')}
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link modal-tab-hover ${activeTab === 'financeiro' ? 'active' : ''} ${!isEditMode ? 'contrato-tab-disabled' : ''}`}
                    type="button"
                    onClick={() => {
                      if (isEditMode) {
                        handleTabChange('financeiro');
                      }
                    }}
                    disabled={!isEditMode}
                  >
                    {t('tabs.financial')}
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link modal-tab-hover ${activeTab === 'financeiro-avulso' ? 'active' : ''} ${!isEditMode ? 'contrato-tab-disabled' : ''}`}
                    type="button"
                    onClick={() => {
                      if (isEditMode) {
                        handleTabChange('financeiro-avulso');
                      }
                    }}
                    disabled={!isEditMode}
                  >
                    {t('tabs.financialMisc')}
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${activeTab === 'servicos-adicionais' ? 'active' : ''} ${!isEditMode ? 'contrato-tab-disabled' : ''}`}
                    type="button"
                    onClick={() => {
                      if (isEditMode) {
                        handleTabChange('servicos-adicionais');
                      }
                    }}
                    disabled={!isEditMode}
                  >
                    {t('tabs.additionalServices')}
                  </button>
                </li>
              </ul>
            </div>
          </div>
        ) : undefined
      }
    >
      <form id="contrato-form" onSubmit={handleSubmit}>
        <div className="contrato-modal-content">
          {/* Conteúdo das Abas */}
          <div
            className={`tab-content contrato-tab-content ${
              (activeTab === 'termos' || activeTab === 'financeiro' || activeTab === 'financeiro-avulso' || activeTab === 'servicos-adicionais')
                ? 'contrato-tab-content-scrollable'
                : 'contrato-tab-content-padded'
            }`}
          >
            {/* Aba Contrato */}
            {activeTab === 'contrato' && (
              <ContratoTab
                formData={formData}
                errors={errors}
                handleInputChange={handleInputChange}
                planoSelecionado={planoSelecionado}
                bancoSelecionado={bancoSelecionado}
                modeloContratoSelecionado={modeloContratoSelecionado}
                onPlanoSelect={handlePlanoSelect}
                onBancoSelect={handleBancoSelect}
                onModeloContratoSelect={handleModeloContratoSelect}
                planosData={planosData}
                bancosData={bancosData}
                modelosContratoData={modelosContratoData}
                diasVencimento={diasVencimento}
                onShowPlanoModal={() => setShowPlanoModal(true)}
                onShowBancoModal={() => setShowBancoModal(true)}
                onShowModeloContratoModal={() => setShowModeloContratoModal(true)}
              />
            )}

            {/* Aba Endereço */}
            {activeTab === 'endereco' && (
              <EnderecoTab
                formData={formData}
                handleInputChange={handleInputChange}
                clienteData={clienteData || null}
              />
            )}

            {/* Aba Termos */}
            {activeTab === 'termos' && (
              isEditMode ? (
                <TermosTab
                  isLoading={isLoadingTermosContrato}
                  bulkActions={termosBulkActions as unknown as BulkAction[]}
                  limit={limit}
                  setLimit={setLimit}
                  page={page}
                  setPage={setPage}
                  sortedData={sortedTermosData}
                  selectedTermosItems={selectedTermosItems}
                  setSelectedTermosItems={setSelectedTermosItems}
                  columns={termosColumns}
                  onRefresh={refetchTermos}
                  onAudit={(termo) => auditoria.handleAudit('TermoContrato', termo.id)}
                  auditEntity="TermoContrato"
                  sortColumn={termosTableFilters.sortColumn}
                  sortDirection={termosTableFilters.sortDirection}
                  onSort={termosTableFilters.setSort}
                />
              ) : (
                <div className="d-flex align-items-center justify-content-center contrato-placeholder">
                  <div className="text-center">
                    <p className="text-muted">{t('placeholder.contractCreationHelp')}</p>
                  </div>
                </div>
              )
            )}

            {/* Aba Financeiro */}
            {activeTab === 'financeiro' && (
              isEditMode ? (
                <FinanceiroTab
                  isLoading={isLoadingTitulos}
                  bulkActions={bulkActions}
                  limit={limit}
                  setLimit={setLimit}
                  page={page}
                  setPage={setPage}
                  sortedData={sortedData}
                  selectedItems={selectedItems}
                  setSelectedItems={setSelectedItems}
                  columns={columns}
                  onRefresh={refetchTitulos}
                  showCancelados={showCancelados}
                  setShowCancelados={setShowCancelados}
                  onAudit={(titulo) => auditoria.handleAudit('Titulo', titulo.id)}
                  auditEntity="Titulo"
                  sortColumn={titulosTableFilters.sortColumn}
                  sortDirection={titulosTableFilters.sortDirection}
                  onSort={titulosTableFilters.setSort}
                />
              ) : (
                <div className="d-flex align-items-center justify-content-center contrato-placeholder">
                  <div className="text-center">
                    <p className="text-muted">{t('placeholder.financialTitlesCreationHelp')}</p>
                  </div>
                </div>
              )
            )}

            {/* Aba Financeiro Avulso */}
            {activeTab === 'financeiro-avulso' && (
              isEditMode ? (
                <FinanceiroAvulsoTab
                  isLoading={isLoadingTitulosAvulsos}
                  bulkActions={bulkActionsAvulsos}
                  limit={limit}
                  setLimit={setLimit}
                  page={page}
                  setPage={setPage}
                  sortedData={sortedAvulsosData}
                  selectedItems={selectedAvulsosItems}
                  setSelectedItems={setSelectedAvulsosItems}
                  columns={columnsAvulsos}
                  onRefresh={refetchTitulosAvulsos}
                  showCancelados={showCanceladosAvulsos}
                  setShowCancelados={setShowCanceladosAvulsos}
                  onAudit={(titulo) => auditoria.handleAudit('Titulo', titulo.id)}
                  auditEntity="Titulo"
                  sortColumn={titulosAvulsosTableFilters.sortColumn}
                  sortDirection={titulosAvulsosTableFilters.sortDirection}
                  onSort={titulosAvulsosTableFilters.setSort}
                />
              ) : (
                <div className="d-flex align-items-center justify-content-center contrato-placeholder">
                  <div className="text-center">
                    <p className="text-muted">{t('placeholder.financialMiscCreationHelp')}</p>
                  </div>
                </div>
              )
            )}

            {/* Aba Serviços Adicionais */}
            {activeTab === 'servicos-adicionais' && (
              isEditMode ? (
                <ServicosAdicionaisTab
                  isLoading={isLoadingServicosAdicionais}
                  bulkActions={servicosAdicionaisBulkActions as unknown as BulkAction[]}
                  limit={limit}
                  setLimit={setLimit}
                  page={page}
                  setPage={setPage}
                  sortedData={sortedServicosAdicionaisData}
                  selectedItems={selectedServicosAdicionaisItems}
                  setSelectedItems={setSelectedServicosAdicionaisItems}
                  columns={servicosAdicionaisColumns}
                  onRefresh={refetchServicosAdicionais}
                  onAudit={(servico) => auditoria.handleAudit('ContratoPlanoAdicional', servico.id)}
                  auditEntity="ContratoPlanoAdicional"
                />
              ) : (
                <div className="d-flex align-items-center justify-content-center contrato-placeholder">
                  <div className="text-center">
                    <p className="text-muted">{t('placeholder.additionalServicesCreationHelp')}</p>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </form>
      </DraggableModal>

      {/* Modais - apenas no modo edição */}
      {isEditMode && internalContratoId && (
        <>
          {/* Modal de título apenas para títulos avulsos (títulos normais são gerados pelo scheduler) */}
          <TituloModal
            show={showTituloCreateModal}
            clienteId={contratoData?.cliente_id}
            contratoId={internalContratoId || undefined}
            isAvulso={true}
            onClose={() => {
              setShowTituloCreateModal(false);
            }}
            onSuccess={() => {
              setShowTituloCreateModal(false);
              queryClient.invalidateQueries({ queryKey: ['titulos', 'contrato', internalContratoId] });
              queryClient.invalidateQueries({ queryKey: ['titulos', 'contrato', internalContratoId, 'avulsos'] });
              if (contratoData?.cliente_id) {
                queryClient.invalidateQueries({ queryKey: ['titulos', { cliente_id: contratoData.cliente_id }] });
              }
              queryClient.invalidateQueries({ queryKey: ['titulos'] });
              refetchTitulos();
              refetchTitulosAvulsos();
            }}
          />

          <TituloModal
            show={showTituloEditModal}
            tituloId={selectedTituloId || null}
            onClose={() => {
              setShowTituloEditModal(false);
              setSelectedTituloId(null);
            }}
            onSuccess={() => {
              setShowTituloEditModal(false);
              setSelectedTituloId(null);
              queryClient.invalidateQueries({ queryKey: ['titulos', 'contrato', internalContratoId] });
            }}
          />

          <ReceberModal
            isOpen={showReceberModal}
            parcela={selectedParcela ? {
              id: selectedParcela.id,
              numero_titulo: selectedParcela.numero_titulo,
              valor_parcela: selectedParcela.valor,
              data_vencimento: selectedParcela.data_vencimento,
              cliente: selectedParcela.cliente
            } : null}
            onClose={() => {
              setShowReceberModal(false);
              setSelectedParcela(null);
            }}
          />

          <TermoEditModal
            show={showTermoModal}
            onClose={() => {
              setShowTermoModal(false);
              setEditingTermo(null);
              setTermoFormData({
                assinado: 'NAO',
                termoCadastradoId: 0
              });
            }}
            editingTermo={editingTermo}
            contratoId={internalContratoId!}
            termoFormData={termoFormData}
            setTermoFormData={setTermoFormData}
            onShowSelecionarTermo={() => setShowSelecionarTermoModal(true)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['termos-contrato', internalContratoId] });
            }}
          />

          <SelecionarTermoModal
            show={showSelecionarTermoModal}
            onClose={() => setShowSelecionarTermoModal(false)}
            onSelect={(termo) => {
              setTermoFormData({
                ...termoFormData, 
                termoCadastradoId: termo.id
              });
              setShowSelecionarTermoModal(false);
            }}
          />

          <ServicoAdicionalModal
            show={showServicoAdicionalModal}
            onClose={() => {
              setShowServicoAdicionalModal(false);
              setEditingServicoAdicional(null);
            }}
            editingServico={editingServicoAdicional}
            contratoId={internalContratoId!}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['contrato-planos-adicionais', internalContratoId] });
              refetchServicosAdicionais();
            }}
          />

          <EnviarAssinaturaModal
            show={showEnviarAssinaturaModal}
            onClose={() => {
              setShowEnviarAssinaturaModal(false);
              setTermoParaAssinatura(null);
            }}
            termo={termoParaAssinatura}
            cliente={contratoData?.cliente as Cliente | undefined}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['termos-contrato', internalContratoId] });
              queryClient.invalidateQueries({ queryKey: ['assinaturas-digital'] });
              refetchTermos();
            }}
          />

          <ImprimirModal
            show={impressaoHook.showModal || showPreview}
            onClose={() => {
              if (impressaoHook.showModal) {
                impressaoHook.limparPdfUrl();
              }
              setShowPreview(false);
              // Limpar URL local também
              if (pdfUrlLocal) {
                window.URL.revokeObjectURL(pdfUrlLocal);
                setPdfUrlLocal(null);
              }
            }}
            pdfUrl={impressaoHook.pdfUrl || pdfUrlLocal}
            isGenerating={impressaoHook.isGeneratingPdf || isGeneratingPdfLocal}
            title={t('modal.viewDocument')}
            modalId="contrato-imprimir-modal"
          />

          <ImprimirModal
            show={auditoria.showPreview}
            onClose={auditoria.handleClosePreview}
            pdfUrl={auditoria.pdfUrl}
            isGenerating={auditoria.isGeneratingPdf}
            title={t('financial.executionLogs')}
            modalId="auditoria-contrato-modal"
          />
        </>
      )}

      {/* Modais de seleção */}
      <PlanoListModal
        show={showPlanoModal}
        onClose={() => setShowPlanoModal(false)}
        onSelectPlano={handlePlanoSelect}
        title={t('ui.selectPlan')}
      />

      <BancoListModal
        show={showBancoModal}
        onClose={() => setShowBancoModal(false)}
        onSelectBanco={handleBancoSelect}
        title={t('ui.selectBank')}
      />

      <ModeloContratoSelectModal
        show={showModeloContratoModal}
        onClose={() => setShowModeloContratoModal(false)}
        onSelect={handleModeloContratoSelect}
        title={t('form.contractModel')}
      />

      {/* ConfirmModal */}
      {modalProps && <ConfirmModal {...modalProps} />}
    </>
  );
};

export default ContratoModal;

