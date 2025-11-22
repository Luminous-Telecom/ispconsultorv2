import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNotificationContext } from '../../../../components/notifications/NotificationProvider';
import { usePlanos } from '../../../../hooks/usePlanos';
import { useBancos } from '../../../../hooks/useBancos';
import { useSelectedEntity } from '../../../../hooks/useSelectedEntity';
import { useCreateContrato, useUpdateContrato, CreateContratoData } from '../../../../hooks/useContratos';
import { useTermosContrato, useDeleteTermoContrato } from '../../../../hooks/useTermosContrato';
import { TermoContrato } from '../../../../services/TermoContratoService';
import { TituloService } from '../../../../services/tituloService';
import { ContratoService } from '../../../../services/ContratoService';
import { Titulo, Plano } from '../../../../types';
import DraggableModal from '../../../common/DraggableModal';
import ImprimirModal from '../../../common/ImprimirModal';
import ModeloTermoService from '../../../../services/modeloTermoService';
import { TituloModal } from '../../titulos/titulo';
import ReceberModal from '../../pagamentos/ReceberModal';
import DocumentoSistemaService, { DocumentoSistema } from '../../../../services/documentoSistemaService';
import { DiasVencimentoService } from '../../../../services/diasVencimentoService';
import PlanoListModal from '../../planos/PlanoListModal';
import BancoListModal from '../../bancos/BancoListModal';
import ModeloContratoSelectModal from '../../parametros/ModeloContratoSelectModal';
import '../../contratos/ContratoModals.css';
import { Banco } from '../../../../types';
import ContratoTab from './abas/ContratoTab';
import TermosTab from './abas/TermosTab';
import FinanceiroTab from './abas/FinanceiroTab';
import ServicosAdicionaisTab from './abas/ServicosAdicionaisTab';
import { ContratoForm } from './types';
import { TermoEditModal, SelecionarTermoModal, ServicoAdicionalModal } from './modals';
import { useContratoPlanosAdicionais, useDeleteContratoPlanoAdicional } from '../../../../hooks/useContratoPlanosAdicionais';
import { ContratoPlanoAdicional } from '../../../../services/contratoPlanoAdicionalService';
import { ensureString } from '../../../../utils/stringUtils';
import { BulkAction } from './types';
import { formatDate, formatDateTime } from '../../../../utils/formatters';

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
      setPage(1);
      setLimit(10);
    }
  }, [show, contratoId]);
  
  // Determina se é modo criação ou edição
  const isEditMode = !!internalContratoId;
  
  const [formData, setFormData] = useState<ContratoForm>({
    plano_id: 0,
    desconto_percentual: 0,
    desconto_valor: 0,
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: '',
    status: 'ativo',
    observacoes: '',
    isento_mensalidade: false,
    dia_vencimento_id: 0,
    conta_boleto: 0,
    data_validade_desconto: '',
    modelo_documento_id: 0
  });

  const [errors, setErrors] = useState<Partial<ContratoForm>>({});
  const [activeTab, setActiveTab] = useState('contrato');
  const [showTermoModal, setShowTermoModal] = useState(false);
  const [showSelecionarTermoModal, setShowSelecionarTermoModal] = useState(false);
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
  const [selectedTermosItems, setSelectedTermosItems] = useState<TermoContrato[]>([]);
  const [selectedServicosAdicionaisItems, setSelectedServicosAdicionaisItems] = useState<ContratoPlanoAdicional[]>([]);
  
  // Estados para modal de impressão
  const [showPreview, setShowPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // Estados dos modais de seleção
  const [showPlanoModal, setShowPlanoModal] = useState(false);
  const [showBancoModal, setShowBancoModal] = useState(false);
  const [showModeloContratoModal, setShowModeloContratoModal] = useState(false);
  const [showServicoAdicionalModal, setShowServicoAdicionalModal] = useState(false);
  const [editingServicoAdicional, setEditingServicoAdicional] = useState<ContratoPlanoAdicional | null>(null);
  
  
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [showCancelados, setShowCancelados] = useState(false);
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

  // Hooks para termos (apenas no modo edição)
  const { data: termosData, isLoading: isLoadingTermosContrato, refetch: refetchTermos } = useTermosContrato(isEditMode ? (internalContratoId || 0) : 0);
  const deleteTermoMutation = useDeleteTermoContrato();

  // Hooks para serviços adicionais (apenas no modo edição)
  const { data: servicosAdicionaisData, isLoading: isLoadingServicosAdicionais, refetch: refetchServicosAdicionais } = useContratoPlanosAdicionais(isEditMode ? (internalContratoId || 0) : 0);
  const deleteServicoAdicionalMutation = useDeleteContratoPlanoAdicional();

  // Garantir que termosData seja sempre um array
  const termosArray = Array.isArray(termosData) ? termosData : [];
  
  // Buscar dados do contrato (apenas no modo edição)
  const { data: contratoData, isLoading } = useQuery({
    queryKey: ['contrato', internalContratoId],
    queryFn: () => ContratoService.getById(internalContratoId!),
    enabled: isEditMode && !!internalContratoId,
    staleTime: 60 * 1000,
  });

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

  // Mutations para criar e atualizar
  const createContratoMutation = useCreateContrato();
  const updateContratoMutation = useUpdateContrato();

  // Função auxiliar para normalizar data (evitar problemas de timezone)
  const normalizeDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      // Usar apenas ano, mês e dia (sem hora/timezone) para evitar problemas de conversão
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  };

  // Carregar dados do contrato quando entrar em modo edição
  useEffect(() => {
    if (isEditMode && contratoData) {
      setFormData({
        plano_id: contratoData.plano_id || 0,
        desconto_percentual: parseFloat(String(contratoData.desconto_percentual || 0)) || 0,
        desconto_valor: parseFloat(String(contratoData.desconto_valor || 0)) || 0,
        data_inicio: normalizeDate(contratoData.data_inicio) || new Date().toISOString().split('T')[0],
        data_fim: normalizeDate(contratoData.data_fim),
        status: contratoData.status || 'ativo',
        observacoes: ensureString(contratoData.observacoes),
        isento_mensalidade: contratoData.isento_mensalidade || false,
        dia_vencimento_id: contratoData.dia_vencimento_id || 0,
        conta_boleto: contratoData.conta_boleto || 0,
        data_validade_desconto: normalizeDate(contratoData.data_validade_desconto),
        modelo_documento_id: contratoData.modelo_documento_id || 0
      });
      setErrors({});
    } else if (!isEditMode && show) {
      // Resetar formulário quando abrir em modo criação
      setFormData({
        plano_id: 0,
        desconto_percentual: 0,
        desconto_valor: 0,
        data_inicio: new Date().toISOString().split('T')[0],
        data_fim: '',
        status: 'ativo',
        observacoes: '',
        isento_mensalidade: false,
        dia_vencimento_id: 0,
        conta_boleto: 0,
        data_validade_desconto: '',
        modelo_documento_id: 0
      });
      setErrors({});
    }
  }, [isEditMode, contratoData, show]);

  const handleInputChange = (field: keyof ContratoForm, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  // Callbacks para seleção nos modais
  const handlePlanoSelect = (plano: Plano) => {
    setPlanoSelecionado(plano);
    setFormData(prev => ({ ...prev, plano_id: plano.id }));
    setShowPlanoModal(false);
  };

  const handleBancoSelect = (banco: Banco) => {
    setBancoSelecionado(banco);
    setFormData(prev => ({ ...prev, conta_boleto: banco.id }));
    setShowBancoModal(false);
  };

  const handleModeloContratoSelect = (modelo: DocumentoSistema) => {
    setModeloContratoSelecionado(modelo);
    setFormData(prev => ({ ...prev, modelo_documento_id: modelo.id }));
    setShowModeloContratoModal(false);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.plano_id) {
      newErrors.plano_id = 'Plano é obrigatório';
    }

    if (!formData.modelo_documento_id || formData.modelo_documento_id === 0) {
      newErrors.modelo_documento_id = 'Modelo de contrato é obrigatório';
    }

    if (!formData.dia_vencimento_id || formData.dia_vencimento_id === 0) {
      newErrors.dia_vencimento_id = 'Dia de vencimento é obrigatório';
    }

    if (!formData.conta_boleto || formData.conta_boleto === 0) {
      newErrors.conta_boleto = 'Banco para boleto é obrigatório';
    }

    if (formData.desconto_percentual < 0 || formData.desconto_percentual > 100) {
      newErrors.desconto_percentual = 'Desconto percentual deve estar entre 0 e 100';
    }

    if (formData.desconto_valor < 0) {
      newErrors.desconto_valor = 'Desconto valor não pode ser negativo';
    }

    if (!formData.data_inicio) {
      newErrors.data_inicio = 'Data de início é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
    setIsGeneratingPdf(true);
    try {
      const ids = selectedItems.map(item => item.id);
      const pdfBlob = await TituloService.gerarPdfBoletosMultiplos(ids);
      
      const url = window.URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      setShowPreview(true);
      
      success('Boletos selecionados gerados com sucesso!');
    } catch (err) {
      error('Erro ao gerar boletos selecionados');
    } finally {
      setIsGeneratingPdf(false);
    }
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
    setIsGeneratingPdf(true);
    try {
      const ids = titulosEmAberto.map((titulo: Titulo) => titulo.id);
      const pdfBlob = await TituloService.gerarPdfBoletosMultiplos(ids);
      
      const url = window.URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      setShowPreview(true);
      
      success('Boletos em aberto gerados com sucesso!');
    } catch (err) {
      error('Erro ao gerar boletos em aberto');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Bulk actions para títulos (apenas no modo edição)
  const bulkActions: BulkAction<Titulo>[] = isEditMode ? [
    {
      label: 'Novo',
      action: () => {
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
      label: isGeneratingPdf ? 'Gerando...' : 'Imprimir',
      variant: 'primary',
      disabled: () => isGeneratingPdf,
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
          action: async () => {
            if (selectedItems.length > 0) {
              try {
                let successCount = 0;
                let errorCount = 0;
                
                for (const item of selectedItems) {
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
          action: async () => {
            if (selectedItems.length > 0) {
              try {
                let successCount = 0;
                let errorCount = 0;
                
                for (const item of selectedItems) {
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
        if (selectedItems.length > 0) {
          const termo = selectedItems[0];
          setEditingTermo(termo);
          setTermoFormData({
            assinado: termo.assinado,
            termoCadastradoId: termo.modelo_documento_id || 0
          });
          setShowTermoModal(true);
        }
      }
    },
    {
      label: 'Deletar',
      variant: 'danger',
      action: async (selectedItems: TermoContrato[]) => {
        if (selectedItems.length > 0) {
          const confirmMessage = selectedItems.length === 1 
            ? 'Tem certeza que deseja deletar este termo?'
            : `Tem certeza que deseja deletar ${selectedItems.length} termos?`;
            
          if (window.confirm(confirmMessage)) {
            try {
              for (const item of selectedItems) {
                await deleteTermoMutation.mutateAsync(item.id);
              }
              success('Termo(s) deletado(s) com sucesso!');
              queryClient.invalidateQueries({ queryKey: ['termos-contrato', internalContratoId] });
            } catch (err) {
              error('Erro ao deletar termo(s)');
            }
          }
        }
      }
    },
    {
      label: 'Imprimir',
      variant: 'primary',
      disabled: () => selectedTermosItems.length === 0,
      action: async () => {
        if (selectedTermosItems.length > 0 && internalContratoId) {
          const termo = selectedTermosItems[0];
          if (termo.modelo_documento_id && internalContratoId) {
            setIsGeneratingPdf(true);
            try {
              const blob = await ModeloTermoService.generatePdfWithContrato(termo.modelo_documento_id, internalContratoId);
              const url = window.URL.createObjectURL(blob);
              setPdfUrl(url);
              setShowPreview(true);
            } catch (err) {
              error(err instanceof Error ? err.message : 'Erro ao gerar documento para impressão');
            } finally {
              setIsGeneratingPdf(false);
            }
          }
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
                  console.error('Erro ao deletar serviço adicional:', err);
                  const errorMessage = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message || 
                    (err as { message?: string })?.message || 
                    'Erro ao deletar serviço adicional';
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
              const errorMessage = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message || 
                (err as { message?: string })?.message || 
                'Erro ao deletar serviço(s) adicional(is)';
              error(errorMessage);
            }
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
      render: (item: Titulo) => new Date(item.data_vencimento).toLocaleDateString('pt-BR')
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
      render: (item: Titulo) => item.created_at ? formatDateTime(item.created_at) : '-'
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
      render: (item: TermoContrato) => item.data_aceite ? new Date(item.data_aceite).toLocaleDateString('pt-BR') : '-'
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
      render: (item: TermoContrato) => new Date(item.created_at).toLocaleDateString('pt-BR')
    }
  ];

  // Não filtrar cancelados aqui - deixar o FinanceiroTab gerenciar através do showCancelados
  const filteredData = isEditMode && titulosData?.data 
    ? titulosData.data
    : [];
  
  const filteredTermosData = isEditMode && termosArray.length > 0
    ? termosArray.filter((termo: TermoContrato) => termo.ativo)
    : [];

  // Não ordenar aqui - deixar o Table gerenciar a ordenação através das colunas sortable
  // Apenas passar os dados filtrados, o Table fará a ordenação inicial e permitirá mudanças pelo usuário
  const sortedData = filteredData;
  const sortedTermosData = [...filteredTermosData].sort((a: TermoContrato, b: TermoContrato) => (b.id || 0) - (a.id || 0));
  
  // Dados de serviços adicionais
  const servicosAdicionaisArray = servicosAdicionaisData?.data || [];
  const sortedServicosAdicionaisData = [...servicosAdicionaisArray].sort((a: ContratoPlanoAdicional, b: ContratoPlanoAdicional) => (b.id || 0) - (a.id || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      if (isEditMode && internalContratoId) {
        // Modo edição
        await updateContratoMutation.mutateAsync({
          id: internalContratoId,
          ...formData
        });

        success('Contrato atualizado com sucesso!');
        queryClient.invalidateQueries({ queryKey: ['contratos'] });
        queryClient.invalidateQueries({ queryKey: ['cliente', contratoData?.cliente_id] });
      } else if (!isEditMode && clienteId) {
        // Modo criação
        const contratoData: CreateContratoData = {
          cliente_id: clienteId,
          plano_id: formData.plano_id,
          desconto_percentual: formData.desconto_percentual || undefined,
          desconto_valor: formData.desconto_valor || undefined,
          data_inicio: formData.data_inicio || undefined,
          data_fim: formData.data_fim || undefined,
          status: formData.status,
          observacoes: formData.observacoes || undefined,
          isento_mensalidade: formData.isento_mensalidade,
          dia_vencimento_id: formData.dia_vencimento_id,
          conta_boleto: formData.conta_boleto,
          data_validade_desconto: formData.data_validade_desconto || undefined,
          modelo_documento_id: formData.modelo_documento_id
        };

        const novoContrato = await createContratoMutation.mutateAsync(contratoData);
        success('Contrato criado com sucesso!');
        
        // Atualizar para modo edição usando o ID do contrato criado
        setInternalContratoId(novoContrato.id);
        // Não limpar formulário - manter dados para adicionar termos e financeiro
        // Invalidar queries para recarregar dados do contrato criado
        queryClient.invalidateQueries({ queryKey: ['contrato', novoContrato.id] });
        queryClient.invalidateQueries({ queryKey: ['termos-contrato', novoContrato.id] });
        queryClient.invalidateQueries({ queryKey: ['titulos', 'contrato', novoContrato.id] });
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 
        (isEditMode ? 'Erro ao atualizar contrato' : 'Erro ao criar contrato');
      error(errorMessage);
    }
  };

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
          <button 
            type="button" 
            className="btn btn-secondary btn-sm" 
            onClick={onClose}
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            form="contrato-form"
            className="btn btn-primary btn-sm"
            disabled={isEditMode ? updateContratoMutation.isPending : createContratoMutation.isPending}
          >
            {isEditMode ? 'Salvar' : 'Criar Contrato'}
          </button>
        </div>
      }
    >
      <form id="contrato-form" onSubmit={handleSubmit}>
        {/* Sempre mostrar estrutura com abas */}
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Navegação por Abas */}
          <ul className="nav nav-tabs" id="contratoTab" role="tablist" style={{ flexShrink: 0, marginBottom: 0, marginTop: '1rem', marginLeft: '1rem', marginRight: '1rem' }}>
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
              overflow: (activeTab === 'termos' || activeTab === 'financeiro' || activeTab === 'servicos-adicionais') ? 'hidden' : 'auto', 
              padding: (activeTab === 'termos' || activeTab === 'financeiro' || activeTab === 'servicos-adicionais') ? '0' : '16px',
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
                  isGeneratingPdf={isGeneratingPdf}
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
                  isGeneratingPdf={isGeneratingPdf}
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
            onClose={() => setShowTituloCreateModal(false)}
            onSuccess={() => {
              setShowTituloCreateModal(false);
              queryClient.invalidateQueries({ queryKey: ['titulos', 'contrato', internalContratoId] });
              if (contratoData?.cliente_id) {
                queryClient.invalidateQueries({ queryKey: ['titulos', { cliente_id: contratoData.cliente_id }] });
              }
              queryClient.invalidateQueries({ queryKey: ['titulos'] });
              refetchTitulos();
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

          <ImprimirModal
            show={showPreview}
            onClose={() => {
              setShowPreview(false);
              if (pdfUrl) {
                window.URL.revokeObjectURL(pdfUrl);
              }
              setPdfUrl(null);
            }}
            pdfUrl={pdfUrl}
            title="Visualizar Termo"
            modalId="termo-imprimir-modal"
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

