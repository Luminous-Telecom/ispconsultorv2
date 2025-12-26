import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { usePlanos } from '@/hooks/usePlanos';
import { useBancos } from '@/hooks/useBancos';
import { useSelectedEntity } from '@/hooks/useSelectedEntity';
import { useContratoForm } from '@/hooks/useContratoForm';
import { useTermosContrato, useDeleteTermoContrato } from '@/hooks/useTermosContrato';
import { TermoContrato } from '@/services/termoContratoService';
import { TituloService } from '@/services/tituloService';
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
import { formatDate, formatDateTime } from '@/utils/formatters';
import { useImpressaoContrato } from '@/hooks/useImpressaoContrato';
import { useIsMobile } from '@/hooks/useMediaQuery';
import ModeloContratoSelectModal from '@/components/modals/parametros/ModeloContratoSelectModal';
import { Button } from '@/components/ui';
import '../../contratos/ContratoModals.css';
import ContratoTab from './abas/ContratoTab';
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
  const isMobile = useIsMobile();
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
  const [isCreatingAvulso, setIsCreatingAvulso] = useState(false);
  const [showTituloEditModal, setShowTituloEditModal] = useState(false);
  const [showReceberModal, setShowReceberModal] = useState(false);
  const [selectedTituloId, setSelectedTituloId] = useState<number | null>(null);
  const [selectedParcela, setSelectedParcela] = useState<Titulo | null>(null);
  const [selectedItems, setSelectedItems] = useState<Titulo[]>([]);
  const [selectedAvulsosItems, setSelectedAvulsosItems] = useState<Titulo[]>([]);
  const [selectedTermosItems, setSelectedTermosItems] = useState<TermoContrato[]>([]);
  const [selectedServicosAdicionaisItems, setSelectedServicosAdicionaisItems] = useState<ContratoPlanoAdicional[]>([]);
  
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
  const [showCancelados, setShowCancelados] = useState(false);
  const [showCanceladosAvulsos, setShowCanceladosAvulsos] = useState(false);
  const { success, error } = useNotificationContext();
  const queryClient = useQueryClient();

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

  // Hooks para termos (apenas no modo edição)
  const { data: termosData, isLoading: isLoadingTermosContrato, refetch: refetchTermos } = useTermosContrato(isEditMode ? (internalContratoId || 0) : 0);
  const deleteTermoMutation = useDeleteTermoContrato();

  // Hooks para serviços adicionais (apenas no modo edição)
  const { data: servicosAdicionaisData, isLoading: isLoadingServicosAdicionais, refetch: refetchServicosAdicionais } = useContratoPlanosAdicionais(isEditMode ? (internalContratoId || 0) : 0);
  const deleteServicoAdicionalMutation = useDeleteContratoPlanoAdicional();

  // Garantir que termosData seja sempre um array
  const termosArray = Array.isArray(termosData) ? termosData : [];
  
  // Usar dados do contrato do hook
  const contratoData = formHook.contrato;
  const isLoading = formHook.isLoadingContrato;

  // Buscar títulos/financeiros do contrato (apenas no modo edição)
  const { data: titulosData, isLoading: isLoadingTitulos, refetch: refetchTitulos } = useQuery({
    queryKey: ['titulos', 'contrato', internalContratoId],
    queryFn: async () => {
      const titulos = await TituloService.findByContrato(internalContratoId!);
      return { data: titulos };
    },
    enabled: isEditMode && !!internalContratoId,
    staleTime: 30 * 1000,
  });

  // Buscar títulos avulsos do contrato (apenas no modo edição)
  const { data: titulosAvulsosData, isLoading: isLoadingTitulosAvulsos, refetch: refetchTitulosAvulsos } = useQuery({
    queryKey: ['titulos', 'contrato', internalContratoId, 'avulsos'],
    queryFn: async () => {
      const titulos = await TituloService.findAvulsosByContrato(internalContratoId!);
      return { data: titulos };
    },
    enabled: isEditMode && !!internalContratoId,
    staleTime: 30 * 1000,
  });

  // Mutations são gerenciadas pelo hook useContratoForm

  // Hook para impressão de contratos
  const impressaoHook = useImpressaoContrato({
    clienteId: contratoData?.cliente_id || undefined,
    onPdfGenerated: (_url) => {
      setShowPreview(true);
    }
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
    setIsGeneratingPdfLocal(true);
    try {
      const ids = selectedItems.map(item => item.id);
      const pdfBlob = await TituloService.gerarPdfBoletosMultiplos(ids);
      
      const url = window.URL.createObjectURL(pdfBlob);
      // Limpar URL anterior se existir
      if (pdfUrlLocal) {
        window.URL.revokeObjectURL(pdfUrlLocal);
      }
      setPdfUrlLocal(url);
      setShowPreview(true);
      
      success('Boletos selecionados gerados com sucesso!');
    } catch (err) {
      error('Erro ao gerar boletos selecionados');
    } finally {
      setIsGeneratingPdfLocal(false);
    }
  };

  const handleImprimirContrato = async () => {
    if (!contratoData?.cliente_id) {
      error('Cliente não encontrado');
      return;
    }
    
    await impressaoHook.imprimirContrato(
      internalContratoId || undefined,
      contratoData.cliente_id
    );
  };

  const handleImprimirTodosEmAberto = async () => {
    if (!titulosData?.data) {
      success('Nenhum título encontrado');
      return;
    }
    const titulosEmAberto = titulosData.data.filter((titulo: Titulo) => 
      titulo.status === 'pendente' || titulo.status === 'vencido'
    );
    if (titulosEmAberto.length === 0) {
      success('Nenhum título em aberto encontrado');
      return;
    }
    setIsGeneratingPdfLocal(true);
    try {
      const ids = titulosEmAberto.map((titulo: Titulo) => titulo.id);
      const pdfBlob = await TituloService.gerarPdfBoletosMultiplos(ids);
      
      const url = window.URL.createObjectURL(pdfBlob);
      // Limpar URL anterior se existir
      if (pdfUrlLocal) {
        window.URL.revokeObjectURL(pdfUrlLocal);
      }
      setPdfUrlLocal(url);
      setShowPreview(true);
      
      success('Boletos em aberto gerados com sucesso!');
    } catch (err) {
      error('Erro ao gerar boletos em aberto');
    } finally {
      setIsGeneratingPdfLocal(false);
    }
  };

  // Funções para impressão de títulos avulsos
  const handleImprimirSelecionadosAvulsos = async () => {
    if (selectedAvulsosItems.length === 0) return;
    setIsGeneratingPdfLocal(true);
    try {
      const ids = selectedAvulsosItems.map(item => item.id);
      const pdfBlob = await TituloService.gerarPdfBoletosMultiplos(ids);
      
      const url = window.URL.createObjectURL(pdfBlob);
      if (pdfUrlLocal) {
        window.URL.revokeObjectURL(pdfUrlLocal);
      }
      setPdfUrlLocal(url);
      setShowPreview(true);
      
      success('Boletos selecionados gerados com sucesso!');
    } catch (err) {
      error('Erro ao gerar boletos selecionados');
    } finally {
      setIsGeneratingPdfLocal(false);
    }
  };

  const handleImprimirTodosEmAbertoAvulsos = async () => {
    if (!titulosAvulsosData?.data) {
      success('Nenhum título encontrado');
      return;
    }
    const titulosEmAberto = titulosAvulsosData.data.filter((titulo: Titulo) => 
      titulo.status === 'pendente' || titulo.status === 'vencido'
    );
    if (titulosEmAberto.length === 0) {
      success('Nenhum título em aberto encontrado');
      return;
    }
    setIsGeneratingPdfLocal(true);
    try {
      const ids = titulosEmAberto.map((titulo: Titulo) => titulo.id);
      const pdfBlob = await TituloService.gerarPdfBoletosMultiplos(ids);
      
      const url = window.URL.createObjectURL(pdfBlob);
      if (pdfUrlLocal) {
        window.URL.revokeObjectURL(pdfUrlLocal);
      }
      setPdfUrlLocal(url);
      setShowPreview(true);
      
      success('Boletos em aberto gerados com sucesso!');
    } catch (err) {
      error('Erro ao gerar boletos em aberto');
    } finally {
      setIsGeneratingPdfLocal(false);
    }
  };

  // Bulk actions para títulos (apenas no modo edição)
  const bulkActions: BulkAction<Titulo>[] = isEditMode ? [
    {
      label: 'Novo',
      action: () => {
        setIsCreatingAvulso(false);
        setShowTituloCreateModal(true);
      }
    },
    {
      label: 'Editar',
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
      label: 'Receber',
      variant: 'success',
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
      label: 'Cancelar',
      variant: 'danger',
      action: async (selectedItems: Titulo[]) => {
        if (selectedItems.length > 0) {
          const confirmMessage = selectedItems.length === 1 
            ? 'Tem certeza que deseja cancelar este título?'
            : `Tem certeza que deseja cancelar ${selectedItems.length} títulos?`;
            
          if (window.confirm(confirmMessage)) {
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
              
              if (successCount > 0) {
                const message = successCount === 1 
                  ? 'Título cancelado com sucesso!'
                  : `${successCount} títulos cancelados com sucesso!`;
                success(message);
              }
              
              if (errorCount > 0) {
                const message = errorCount === 1 
                  ? '1 título não pôde ser cancelado'
                  : `${errorCount} títulos não puderam ser cancelados`;
                error(message);
              }
              
              queryClient.invalidateQueries({ queryKey: ['titulos', 'contrato', internalContratoId] });
            } catch (err) {
              error('Erro ao cancelar títulos');
            }
          }
        }
      },
      disabled: (selectedItems: Titulo[]) => {
        if (selectedItems.length === 0) return true;
        return selectedItems.every(item => item.status === 'pago' || item.status === 'cancelado');
      }
    },
    {
      label: 'Estornar',
      variant: 'warning',
      action: async (selectedItems: Titulo[]) => {
        if (selectedItems.length > 0) {
          const item = selectedItems[0];
          if (item.status === 'pago') {
            const confirmar = window.confirm(
              `Tem certeza que deseja estornar o título ${item.numero_titulo}?\n\n` +
              `Valor: R$ ${item.valor_pago || item.valor}\n` +
              `O título voltará para status PENDENTE.`
            );
            
            if (confirmar) {
              try {
                await TituloService.estornar(item.id);
                success('Título estornado com sucesso!');
                queryClient.invalidateQueries({ queryKey: ['titulos', 'contrato', internalContratoId] });
              } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Erro ao estornar título.';
                error(errorMessage);
              }
            }
          } else {
            success('Só é possível estornar títulos que estão pagos');
          }
        }
      },
      disabled: (selectedItems: Titulo[]) => {
        if (selectedItems.length === 0) return true;
        return selectedItems.every(item => item.status !== 'pago');
      }
    },
    {
      label: (impressaoHook.isGeneratingPdf || isGeneratingPdfLocal) ? 'Gerando...' : 'Imprimir',
      variant: 'primary',
      disabled: () => impressaoHook.isGeneratingPdf || isGeneratingPdfLocal,
      dropdown: [
        {
          label: 'Selecionados',
          action: handleImprimirSelecionados
        },
        {
          label: 'Abertos',
          action: handleImprimirTodosEmAberto
        }
      ]
    },
    {
      label: 'Enviar',
      variant: 'info',
      disabled: (selectedItems: Titulo[]) => {
        if (selectedItems.length === 0) return true;
        return selectedItems.every(item => item.status === 'cancelado');
      },
      dropdown: [
        {
          label: 'Via WhatsApp',
          action: async (selectedItems?: Titulo[]) => {
            const items = selectedItems || [];
            if (items.length > 0) {
              try {
                let successCount = 0;
                let errorCount = 0;
                
                for (const item of items) {
                  if (item.status === 'cancelado') continue;
                  try {
                    const response = await TituloService.enviarWhatsApp(item.id);
                    if (response.success) {
                      successCount++;
                    } else {
                      errorCount++;
                    }
                  } catch (err) {
                    errorCount++;
                  }
                }
                
                if (successCount > 0) {
                  const message = successCount === 1 
                    ? 'Mensagem enviada com sucesso!'
                    : `${successCount} mensagens enviadas com sucesso!`;
                  success(message);
                }
                
                if (errorCount > 0) {
                  const message = errorCount === 1 
                    ? '1 mensagem não pôde ser enviada'
                    : `${errorCount} mensagens não puderam ser enviadas`;
                  error(message);
                }
              } catch (err) {
                error('Erro ao enviar mensagens');
              }
            }
          }
        },
        {
          label: 'Via Email',
          action: async (selectedItems?: Titulo[]) => {
            const items = selectedItems || [];
            if (items.length > 0) {
              try {
                let successCount = 0;
                let errorCount = 0;
                
                for (const item of items) {
                  if (item.status === 'cancelado') continue;
                  try {
                    const response = await TituloService.enviarEmail(item.id);
                    if (response.success) {
                      successCount++;
                    } else {
                      errorCount++;
                    }
                  } catch (err) {
                    errorCount++;
                  }
                }
                
                if (successCount > 0) {
                  const message = successCount === 1 
                    ? 'Email enviado com sucesso!'
                    : `${successCount} emails enviados com sucesso!`;
                  success(message);
                }
                
                if (errorCount > 0) {
                  const message = errorCount === 1 
                    ? '1 email não pôde ser enviado'
                    : `${errorCount} emails não puderam ser enviados`;
                  error(message);
                }
              } catch (err) {
                error('Erro ao enviar emails');
              }
            }
          }
        }
      ]
    }
  ] : [];

  // Bulk actions para títulos avulsos (apenas no modo edição)
  const bulkActionsAvulsos: BulkAction<Titulo>[] = isEditMode ? [
    {
      label: 'Novo',
      action: () => {
        setIsCreatingAvulso(true);
        setShowTituloCreateModal(true);
      }
    },
    {
      label: 'Editar',
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
      label: 'Receber',
      variant: 'success',
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
      label: 'Cancelar',
      variant: 'danger',
      action: async (selectedItems: Titulo[]) => {
        if (selectedItems.length > 0) {
          const confirmMessage = selectedItems.length === 1 
            ? 'Tem certeza que deseja cancelar este título?'
            : `Tem certeza que deseja cancelar ${selectedItems.length} títulos?`;
            
          if (window.confirm(confirmMessage)) {
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
              
              if (successCount > 0) {
                const message = successCount === 1 
                  ? 'Título cancelado com sucesso!'
                  : `${successCount} títulos cancelados com sucesso!`;
                success(message);
              }
              
              if (errorCount > 0) {
                const message = errorCount === 1 
                  ? '1 título não pôde ser cancelado'
                  : `${errorCount} títulos não puderam ser cancelados`;
                error(message);
              }
              
              queryClient.invalidateQueries({ queryKey: ['titulos', 'contrato', internalContratoId, 'avulsos'] });
            } catch (err) {
              error('Erro ao cancelar títulos');
            }
          }
        }
      },
      disabled: (selectedItems: Titulo[]) => {
        if (selectedItems.length === 0) return true;
        return selectedItems.every(item => item.status === 'pago' || item.status === 'cancelado');
      }
    },
    {
      label: 'Estornar',
      variant: 'warning',
      action: async (selectedItems: Titulo[]) => {
        if (selectedItems.length > 0) {
          const item = selectedItems[0];
          if (item.status === 'pago') {
            const confirmar = window.confirm(
              `Tem certeza que deseja estornar o título ${item.numero_titulo}?\n\n` +
              `Valor: R$ ${item.valor_pago || item.valor}\n` +
              `O título voltará para status PENDENTE.`
            );
            
            if (confirmar) {
              try {
                await TituloService.estornar(item.id);
                success('Título estornado com sucesso!');
                queryClient.invalidateQueries({ queryKey: ['titulos', 'contrato', internalContratoId, 'avulsos'] });
              } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Erro ao estornar título.';
                error(errorMessage);
              }
            }
          } else {
            success('Só é possível estornar títulos que estão pagos');
          }
        }
      },
      disabled: (selectedItems: Titulo[]) => {
        if (selectedItems.length === 0) return true;
        return selectedItems.every(item => item.status !== 'pago');
      }
    },
    {
      label: (impressaoHook.isGeneratingPdf || isGeneratingPdfLocal) ? 'Gerando...' : 'Imprimir',
      variant: 'primary',
      disabled: () => impressaoHook.isGeneratingPdf || isGeneratingPdfLocal,
      dropdown: [
        {
          label: 'Selecionados',
          action: handleImprimirSelecionadosAvulsos
        },
        {
          label: 'Abertos',
          action: handleImprimirTodosEmAbertoAvulsos
        }
      ]
    },
    {
      label: 'Enviar',
      variant: 'info',
      disabled: (selectedItems: Titulo[]) => {
        if (selectedItems.length === 0) return true;
        return selectedItems.every(item => item.status === 'cancelado');
      },
      dropdown: [
        {
          label: 'Via WhatsApp',
          action: async (selectedItems?: Titulo[]) => {
            const items = selectedItems || [];
            if (items.length > 0) {
              try {
                let successCount = 0;
                let errorCount = 0;
                
                for (const item of items) {
                  if (item.status === 'cancelado') continue;
                  try {
                    const response = await TituloService.enviarWhatsApp(item.id);
                    if (response.success) {
                      successCount++;
                    } else {
                      errorCount++;
                    }
                  } catch (err) {
                    errorCount++;
                  }
                }
                
                if (successCount > 0) {
                  const message = successCount === 1 
                    ? 'Mensagem enviada com sucesso!'
                    : `${successCount} mensagens enviadas com sucesso!`;
                  success(message);
                }
                
                if (errorCount > 0) {
                  const message = errorCount === 1 
                    ? '1 mensagem não pôde ser enviada'
                    : `${errorCount} mensagens não puderam ser enviadas`;
                  error(message);
                }
              } catch (err) {
                error('Erro ao enviar mensagens');
              }
            }
          }
        },
        {
          label: 'Via Email',
          action: async (selectedItems?: Titulo[]) => {
            const items = selectedItems || [];
            if (items.length > 0) {
              try {
                let successCount = 0;
                let errorCount = 0;
                
                for (const item of items) {
                  if (item.status === 'cancelado') continue;
                  try {
                    const response = await TituloService.enviarEmail(item.id);
                    if (response.success) {
                      successCount++;
                    } else {
                      errorCount++;
                    }
                  } catch (err) {
                    errorCount++;
                  }
                }
                
                if (successCount > 0) {
                  const message = successCount === 1 
                    ? 'Email enviado com sucesso!'
                    : `${successCount} emails enviados com sucesso!`;
                  success(message);
                }
                
                if (errorCount > 0) {
                  const message = errorCount === 1 
                    ? '1 email não pôde ser enviado'
                    : `${errorCount} emails não puderam ser enviados`;
                  error(message);
                }
              } catch (err) {
                error('Erro ao enviar emails');
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
      label: 'Novo',
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
      label: 'Editar',
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
      label: 'Deletar',
      variant: 'danger',
      action: async (selectedItems: TermoContrato[]) => {
        const items = selectedItems && selectedItems.length > 0 ? selectedItems : selectedTermosItems;
        if (items.length > 0) {
          const confirmMessage = items.length === 1 
            ? 'Tem certeza que deseja deletar este termo?'
            : `Tem certeza que deseja deletar ${items.length} termos?`;
            
          if (window.confirm(confirmMessage)) {
            try {
              for (const item of items) {
                await deleteTermoMutation.mutateAsync(item.id);
              }
              success('Termo(s) deletado(s) com sucesso!');
              queryClient.invalidateQueries({ queryKey: ['termos-contrato', internalContratoId] });
            } catch (err) {
              error('Erro ao deletar termo(s)');
            }
          }
        }
      },
      disabled: (selectedItems: TermoContrato[]) => selectedItems.length === 0 && selectedTermosItems.length === 0
    },
    {
      label: 'Imprimir',
      variant: 'primary',
      disabled: () => selectedTermosItems.length === 0,
      action: async () => {
        if (selectedTermosItems.length > 0 && internalContratoId) {
          const termo = selectedTermosItems[0];
          if (termo.modelo_documento_id && internalContratoId) {
            setIsGeneratingPdfLocal(true);
            try {
              const blob = await ModeloTermoService.generatePdfWithContrato(termo.modelo_documento_id, internalContratoId);
              const url = window.URL.createObjectURL(blob);
              // Limpar URL anterior se existir
              if (pdfUrlLocal) {
                window.URL.revokeObjectURL(pdfUrlLocal);
              }
              setPdfUrlLocal(url);
              setShowPreview(true);
            } catch (err) {
              error(err instanceof Error ? err.message : 'Erro ao gerar documento para impressão');
            } finally {
              setIsGeneratingPdfLocal(false);
            }
          }
        }
      }
    },
    {
      label: 'Enviar para Assinatura',
      variant: 'info',
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
      label: 'Novo',
      action: () => {
        setEditingServicoAdicional(null);
        setShowServicoAdicionalModal(true);
      }
    },
    {
      label: 'Editar',
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
      label: 'Deletar',
      variant: 'danger',
      action: async (selectedItems: ContratoPlanoAdicional[]) => {
        if (selectedItems.length > 0) {
          const confirmMessage = selectedItems.length === 1 
            ? 'Tem certeza que deseja deletar este serviço adicional?'
            : `Tem certeza que deseja deletar ${selectedItems.length} serviços adicionais?`;
            
          if (window.confirm(confirmMessage)) {
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
                  ? 'Serviço adicional deletado com sucesso!'
                  : `${successCount} serviços adicionais deletados com sucesso!`;
                success(message);
              }
              
              if (errorCount > 0 && selectedItems.length > 1) {
                error(`${errorCount} serviço(s) adicional(is) não puderam ser deletados`);
              }
              
              queryClient.invalidateQueries({ queryKey: ['contrato-planos-adicionais', internalContratoId] });
            } catch (err: unknown) {
              const errorMessage = extractApiErrorMessageSync(err, {
                defaultMessage: CONTEXT_ERROR_MESSAGES.SERVICOS_ADICIONAIS_DELETE_ERROR
              });
              error(errorMessage);
            }
          }
        }
      },
      disabled: (selectedItems: ContratoPlanoAdicional[]) => selectedItems.length === 0
    }
  ] : [];

  // Colunas para a tabela de títulos (com endereço)
  const columns = [
    { 
      key: 'id', 
      label: 'ID', 
      sortable: true, 
      searchable: true,
      render: (item: Titulo) => item.id 
    },
    {
      key: 'contrato_id',
      label: 'Contrato',
      sortable: true,
      searchable: true,
      render: (item: Titulo) => item.contrato_id || '-'
    },
    {
      key: 'endereco',
      label: 'Endereço',
      sortable: true,
      searchable: false,
      render: (item: Titulo) => (
        <span>{item.cliente?.endereco || '-'}</span>
      )
    },
    {
      key: 'numero',
      label: 'Número',
      sortable: true,
      searchable: false,
      render: (item: Titulo) => (
        <span>{item.cliente?.numero || '-'}</span>
      )
    },
    {
      key: 'complemento',
      label: 'Complemento',
      sortable: true,
      searchable: false,
      render: (item: Titulo) => (
        <span>{item.cliente?.complemento || '-'}</span>
      )
    },
    {
      key: 'bairro',
      label: 'Bairro',
      sortable: true,
      searchable: false,
      render: (item: Titulo) => (
        <span>{item.cliente?.bairro || '-'}</span>
      )
    },
    {
      key: 'cidade',
      label: 'Cidade',
      sortable: true,
      searchable: false,
      render: (item: Titulo) => (
        <span>{item.cliente?.cidade || '-'}</span>
      )
    },
    {
      key: 'estado',
      label: 'Estado',
      sortable: true,
      searchable: false,
      render: (item: Titulo) => (
        <span>{item.cliente?.estado || '-'}</span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      searchable: true,
      render: (item: Titulo) => (
        <span className={`badge bg-${getStatusColor(item.status)}`}>{item.status}</span>
      )
    },
    { 
      key: 'plano', 
      label: 'Plano', 
      sortable: true,
      searchable: true,
      render: (item: Titulo) => item.plano?.nome_plano || '-' 
    },
    { 
      key: 'numero_titulo', 
      label: 'Nº Título', 
      sortable: true,
      searchable: true,
      render: (item: Titulo) => item.numero_titulo || '-' 
    },
    {
      key: 'data_vencimento',
      label: 'Vencimento',
      sortable: true,
      searchable: false,
      render: (item: Titulo) => formatDate(item.data_vencimento)
    },
    {
      key: 'valor',
      label: 'Valor',
      sortable: true,
      searchable: true,
      render: (item: Titulo) => `R$ ${Number(item.valor || 0).toFixed(2)}`
    },
    {
      key: 'valor_pago',
      label: 'Valor baixado',
      sortable: true,
      searchable: true,
      render: (item: Titulo) => item.status === 'pago' ? `R$ ${Number(item.valor_pago || item.valor || 0).toFixed(2)}` : 'R$ 0,00'
    },
    {
      key: 'valor_aberto',
      label: 'Valor aberto',
      sortable: true,
      searchable: true,
      render: (item: Titulo) => (item.status === 'pago' || item.status === 'cancelado') ? 'R$ 0,00' : `R$ ${Number(item.valor || 0).toFixed(2)}`
    },
    {
      key: 'data_pagamento',
      label: 'Data Pagamento',
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
      label: 'Charge ID', 
      sortable: true,
      searchable: true,
      render: (item: Titulo) => item.charge_id || '-' 
    },
    { 
      key: 'nosso_numero', 
      label: 'Nosso Número', 
      sortable: true,
      searchable: true,
      render: (item: Titulo) => item.nosso_numero || '-' 
    },
    {
      key: 'created_at',
      label: 'Criado em',
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
      label: 'ID', 
      sortable: true, 
      searchable: true,
      render: (item: Titulo) => item.id 
    },
    {
      key: 'contrato_id',
      label: 'Contrato',
      sortable: true,
      searchable: true,
      render: (item: Titulo) => item.contrato_id || '-'
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      searchable: true,
      render: (item: Titulo) => (
        <span className={`badge bg-${getStatusColor(item.status)}`}>{item.status}</span>
      )
    },
    { 
      key: 'plano', 
      label: 'Plano', 
      sortable: true,
      searchable: true,
      render: (item: Titulo) => item.plano?.nome_plano || '-' 
    },
    { 
      key: 'numero_titulo', 
      label: 'Nº Título', 
      sortable: true,
      searchable: true,
      render: (item: Titulo) => item.numero_titulo || '-' 
    },
    {
      key: 'data_vencimento',
      label: 'Vencimento',
      sortable: true,
      searchable: false,
      render: (item: Titulo) => formatDate(item.data_vencimento)
    },
    {
      key: 'valor',
      label: 'Valor',
      sortable: true,
      searchable: true,
      render: (item: Titulo) => `R$ ${Number(item.valor || 0).toFixed(2)}`
    },
    {
      key: 'valor_pago',
      label: 'Valor baixado',
      sortable: true,
      searchable: true,
      render: (item: Titulo) => item.status === 'pago' ? `R$ ${Number(item.valor_pago || item.valor || 0).toFixed(2)}` : 'R$ 0,00'
    },
    {
      key: 'valor_aberto',
      label: 'Valor aberto',
      sortable: true,
      searchable: true,
      render: (item: Titulo) => (item.status === 'pago' || item.status === 'cancelado') ? 'R$ 0,00' : `R$ ${Number(item.valor || 0).toFixed(2)}`
    },
    {
      key: 'data_pagamento',
      label: 'Data Pagamento',
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
      label: 'Charge ID', 
      sortable: true,
      searchable: true,
      render: (item: Titulo) => item.charge_id || '-' 
    },
    { 
      key: 'nosso_numero', 
      label: 'Nosso Número', 
      sortable: true,
      searchable: true,
      render: (item: Titulo) => item.nosso_numero || '-' 
    },
    {
      key: 'created_at',
      label: 'Criado em',
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
      label: 'ID', 
      sortable: true,
      searchable: true,
      render: (item: ContratoPlanoAdicional) => item.id 
    },
    {
      key: 'plano',
      label: 'Plano',
      sortable: true,
      searchable: true,
      render: (item: ContratoPlanoAdicional) => item.plano?.nome_plano || 'N/A'
    },
    {
      key: 'valor_original',
      label: 'Valor Original',
      sortable: true,
      searchable: false,
      render: (item: ContratoPlanoAdicional) => {
        const valor = parseFloat(item.plano?.valor_mensal?.toString() || '0') || 0;
        return `R$ ${valor.toFixed(2).replace('.', ',')}`;
      }
    },
    {
      key: 'desconto',
      label: 'Desconto',
      sortable: false,
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
      label: 'Valor Final',
      sortable: true,
      searchable: false,
      render: (item: ContratoPlanoAdicional) => {
        const valor = parseFloat(item.valor_final?.toString() || '0') || 0;
        return `R$ ${valor.toFixed(2).replace('.', ',')}`;
      }
    },
    {
      key: 'status',
      label: 'Status',
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
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </span>
        );
      }
    },
    {
      key: 'observacoes',
      label: 'Observações',
      sortable: false,
      searchable: true,
      render: (item: ContratoPlanoAdicional) => item.observacoes || '-'
    }
  ];

  // Colunas para a tabela de termos
  const termosColumns = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'nome_termo', label: 'Nome do Termo', sortable: true, render: (item: TermoContrato) => item.modeloDocumento?.nome || '-' },
    {
      key: 'assinado',
      label: 'Assinado',
      sortable: true,
      render: (item: TermoContrato) => (
        <span className={`badge ${item.assinado === 'SIM' ? 'bg-success' : 'bg-secondary'}`}>{item.assinado}</span>
      )
    },
    {
      key: 'data_aceite',
      label: 'Data Aceite',
      sortable: true,
      render: (item: TermoContrato) => formatDateTime(item.data_aceite)
    },
    { key: 'aceito_por', label: 'Aceito Por', sortable: true, render: (item: TermoContrato) => item.aceito_por || '-' },
    {
      key: 'ativo',
      label: 'Status',
      sortable: true,
      render: (item: TermoContrato) => (
        <span className={`badge ${item.ativo ? 'bg-success' : 'bg-secondary'}`}>{item.ativo ? 'Ativo' : 'Inativo'}</span>
      )
    },
    {
      key: 'created_at',
      label: 'Criado em',
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
  
  const filteredTermosData = isEditMode && termosArray.length > 0
    ? termosArray.filter((termo: TermoContrato) => termo.ativo)
    : [];
  const sortedTermosData = [...filteredTermosData].sort((a: TermoContrato, b: TermoContrato) => (b.id || 0) - (a.id || 0));
  
  // Dados de serviços adicionais
  const servicosAdicionaisArray = servicosAdicionaisData?.data || [];
  const sortedServicosAdicionaisData = [...servicosAdicionaisArray].sort((a: ContratoPlanoAdicional, b: ContratoPlanoAdicional) => (b.id || 0) - (a.id || 0));

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
        title="Carregando..."
        size="lg"
        modalId="contrato-modal-loading"
      >
        <div className="text-center p-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      </DraggableModal>
    );
  }

  return (
    <>
    <DraggableModal
      show={show}
      onClose={onClose}
      title={isEditMode ? `Contrato - ${contratoData?.plano?.nome_plano || 'Carregando...'}` : 'Criar Contrato'}
      size="xl"
      modalId="contrato-modal"
      headerActions={
        <div className="d-flex gap-2">
          {isEditMode && (
            <Button 
              type="button" 
              variant="info"
              size="sm" 
              leftIcon={<i className="bi bi-printer"></i>}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleImprimirContrato();
              }}
              isLoading={impressaoHook.isGeneratingPdf}
            >
              Imprimir
            </Button>
          )}
          <Button 
            type="button" 
            variant="secondary"
            size="sm" 
            leftIcon={<i className="bi bi-x-lg"></i>}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            form="contrato-form"
            variant="primary"
            size="sm"
            leftIcon={<i className="bi bi-check-lg"></i>}
            isLoading={formHook.isSubmitting}
          >
            {isEditMode ? 'Salvar' : 'Criar Contrato'}
          </Button>
        </div>
      }
    >
      <form id="contrato-form" onSubmit={handleSubmit}>
        {/* Sempre mostrar estrutura com abas */}
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Navegação por Abas */}
          <ul className="nav nav-tabs" id="contratoTab" role="tablist" style={{ 
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
                className={`nav-link ${activeTab === 'contrato' ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveTab('contrato')}
              >
                Contrato
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'termos' ? 'active' : ''}`}
                type="button"
                onClick={() => {
                  if (isEditMode) {
                    setActiveTab('termos');
                  }
                }}
                disabled={!isEditMode}
                style={{ cursor: !isEditMode ? 'not-allowed' : 'pointer', opacity: !isEditMode ? 0.6 : 1 }}
              >
                Termos
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'financeiro' ? 'active' : ''}`}
                type="button"
                onClick={() => {
                  if (isEditMode) {
                    setActiveTab('financeiro');
                  }
                }}
                disabled={!isEditMode}
                style={{ cursor: !isEditMode ? 'not-allowed' : 'pointer', opacity: !isEditMode ? 0.6 : 1 }}
              >
                Financeiro
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'financeiro-avulso' ? 'active' : ''}`}
                type="button"
                onClick={() => {
                  if (isEditMode) {
                    setActiveTab('financeiro-avulso');
                  }
                }}
                disabled={!isEditMode}
                style={{ cursor: !isEditMode ? 'not-allowed' : 'pointer', opacity: !isEditMode ? 0.6 : 1 }}
              >
                Financeiro Avulso
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'servicos-adicionais' ? 'active' : ''}`}
                type="button"
                onClick={() => {
                  if (isEditMode) {
                    setActiveTab('servicos-adicionais');
                  }
                }}
                disabled={!isEditMode}
                style={{ cursor: !isEditMode ? 'not-allowed' : 'pointer', opacity: !isEditMode ? 0.6 : 1 }}
              >
                Serviços Adicionais
              </button>
            </li>
          </ul>

          {/* Conteúdo das Abas */}
          <div 
            className="tab-content" 
            style={{ 
              flex: 1, 
              overflow: (activeTab === 'termos' || activeTab === 'financeiro' || activeTab === 'financeiro-avulso' || activeTab === 'servicos-adicionais') ? 'hidden' : 'auto', 
              // No mobile, ResponsiveDialog já aplica padding, então não aplicar aqui
              padding: (activeTab === 'termos' || activeTab === 'financeiro' || activeTab === 'financeiro-avulso' || activeTab === 'servicos-adicionais') ? '0' : (isMobile ? '0' : '16px'),
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column'
            }}
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
                  isGeneratingPdf={impressaoHook.isGeneratingPdf || isGeneratingPdfLocal}
                  onRefresh={refetchTermos}
                />
              ) : (
                <div className="d-flex align-items-center justify-content-center" style={{ height: '100%', padding: '2rem' }}>
                  <div className="text-center">
                    <p className="text-muted">Crie o contrato primeiro para gerenciar termos.</p>
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
                  isGeneratingPdf={impressaoHook.isGeneratingPdf || isGeneratingPdfLocal}
                  onRefresh={refetchTitulos}
                  showCancelados={showCancelados}
                  setShowCancelados={setShowCancelados}
                />
              ) : (
                <div className="d-flex align-items-center justify-content-center" style={{ height: '100%', padding: '2rem' }}>
                  <div className="text-center">
                    <p className="text-muted">Crie o contrato primeiro para gerenciar títulos financeiros.</p>
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
                  isGeneratingPdf={impressaoHook.isGeneratingPdf || isGeneratingPdfLocal}
                  onRefresh={refetchTitulosAvulsos}
                  showCancelados={showCanceladosAvulsos}
                  setShowCancelados={setShowCanceladosAvulsos}
                />
              ) : (
                <div className="d-flex align-items-center justify-content-center" style={{ height: '100%', padding: '2rem' }}>
                  <div className="text-center">
                    <p className="text-muted">Crie o contrato primeiro para gerenciar títulos avulsos.</p>
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
                />
              ) : (
                <div className="d-flex align-items-center justify-content-center" style={{ height: '100%', padding: '2rem' }}>
                  <div className="text-center">
                    <p className="text-muted">Crie o contrato primeiro para gerenciar serviços adicionais.</p>
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
          <TituloModal
            show={showTituloCreateModal}
            clienteId={contratoData?.cliente_id}
            contratoId={internalContratoId || undefined}
            isAvulso={isCreatingAvulso}
            onClose={() => {
              setShowTituloCreateModal(false);
              setIsCreatingAvulso(false);
            }}
            onSuccess={() => {
              setShowTituloCreateModal(false);
              setIsCreatingAvulso(false);
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
            show={showPreview}
            onClose={() => {
              setShowPreview(false);
              impressaoHook.limparPdfUrl();
              // Limpar URL local também
              if (pdfUrlLocal) {
                window.URL.revokeObjectURL(pdfUrlLocal);
                setPdfUrlLocal(null);
              }
            }}
            pdfUrl={impressaoHook.pdfUrl || pdfUrlLocal}
            title="Visualizar Documento"
            modalId="contrato-imprimir-modal"
          />
        </>
      )}

      {/* Modais de seleção */}
      <PlanoListModal
        show={showPlanoModal}
        onClose={() => setShowPlanoModal(false)}
        onSelectPlano={handlePlanoSelect}
        title="Selecionar Plano"
      />

      <BancoListModal
        show={showBancoModal}
        onClose={() => setShowBancoModal(false)}
        onSelectBanco={handleBancoSelect}
        title="Selecionar Banco"
      />

      <ModeloContratoSelectModal
        show={showModeloContratoModal}
        onClose={() => setShowModeloContratoModal(false)}
        onSelect={handleModeloContratoSelect}
        title="Selecionar Modelo de Contrato"
      />
    </>
  );
};

export default ContratoModal;

