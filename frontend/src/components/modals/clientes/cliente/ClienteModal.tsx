import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { ClienteService } from '../../../../services/clienteService';
import { TituloService } from '../../../../services/tituloService';
import DocumentoSistemaService from '../../../../services/documentoSistemaService';
import { ParametrosService } from '../../../../services/parametrosService';
import { useNotificationContext } from '../../../../components/notifications/NotificationProvider';
import { Cliente, CarneParcela, CreateCliente } from '../../../../types';
import DraggableModal from '../../../common/DraggableModal';
import { useFormPrefix } from '../../../../hooks/useFormId';
import ImprimirModal from '../../../common/ImprimirModal';
import { TituloModal } from '../../titulos/titulo';
import ReceberModal from '../../pagamentos/ReceberModal';
import { useContratos, useDeleteContrato, Contrato } from '../../../../hooks/useContratos';
import ContratoModal from '../contrato/ContratoModal';
import { useFormReset } from '../../../../hooks/useFormReset';
import ConfirmModal from '../../../common/ConfirmModal';
// Utilitários centralizados
import { formatCurrency, formatDate, formatCNPJ, formatPhone, formatCEP } from '../../../../utils/formatters';
import { ensureString } from '../../../../utils/stringUtils';
import { TituloItem } from '../../../../types/cliente';
import { ClienteFormData, ClienteFormErrors } from '../../../../types';
import { isValidCNPJ } from '../../../../utils/validators';
import DadosBasicosTab from './abas/DadosBasicosTab';
import ContatoTab from './abas/ContatoTab';
import EnderecoTab from './abas/EnderecoTab';
import ContratosTab from './abas/ContratosTab';
import FinanceiroTab from './abas/FinanceiroTab';
import ObservacoesTab from './abas/ObservacoesTab';
import { FormValue } from '../../../../types/common';

interface ClienteModalProps {
  show: boolean;
  onClose: () => void;
  clienteId?: number | null; // Se passar clienteId, é edição; se não, é criação
  onSuccess?: () => void;
}

const ClienteModal: React.FC<ClienteModalProps> = ({ 
  show, 
  onClose, 
  clienteId = null,
  onSuccess 
}) => {
  const isEditing = !!clienteId;
  
  const formPrefix = useFormPrefix('ClienteEditModal');
  const { success, error, info } = useNotificationContext();
  const queryClient = useQueryClient();
  
  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    if (type === 'success') success(message);
    else if (type === 'error') error(message);
    else success(message);
  };

  const [formData, setFormData] = useState<ClienteFormData>({
    cnpj: '',
    razao_social: '',
    nome_fantasia: '',
    email: '',
    telefone: '',
    whatsapp: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    ativo: true,
    tipo_cobranca: 'titulo',
    valor_primeiro_titulo: 'total',
    recebe_email: true,
    recebe_sms: false,
    recebe_whatsapp: true,
    observacoes: ''
  });

  const [errors, setErrors] = useState<ClienteFormErrors>({});
  const [activeTab, setActiveTab] = useState('dados-basicos');
  const [isConsultingCnpj, setIsConsultingCnpj] = useState(false);
  const [isConsultingCep, setIsConsultingCep] = useState(false);
  const lastCnpjConsulted = useRef<string>('');
  const lastCepConsulted = useRef<string>('');
  
  // Buscar parâmetros para verificar se deve consultar CNPJ/CEP
  const { data: parametros } = useQuery({
    queryKey: ['parametros'],
    queryFn: () => ParametrosService.get(),
    staleTime: 60 * 1000,
    enabled: show // Buscar sempre que o modal abrir
  });

  // Resetar aba ativa quando modal abrir
  useEffect(() => {
    if (show) {
      setActiveTab('dados-basicos');
      lastCnpjConsulted.current = '';
      lastCepConsulted.current = '';
    }
  }, [show]);
  
  const [showCancelados, setShowCancelados] = useState(false);
  const [showTituloEditModal, setShowTituloEditModal] = useState(false);
  const [showReceberModal, setShowReceberModal] = useState(false);
  const [showContratoCreateModal, setShowContratoCreateModal] = useState(false);
  const [showContratoEditModal, setShowContratoEditModal] = useState(false);
  const [showImprimirModal, setShowImprimirModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [selectedContratoId, setSelectedContratoId] = useState<number | null>(null);
  const [selectedTituloId, setSelectedTituloId] = useState<number | null>(null);
  const [selectedParcela, setSelectedParcela] = useState<TituloItem | null>(null);
  const [selectedItems, setSelectedItems] = useState<TituloItem[]>([]);
  const [selectedContratosItems, setSelectedContratosItems] = useState<Contrato[]>([]);
  const [showInativosContratos, setShowInativosContratos] = useState(false);
  const [_showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [createdClienteId, setCreatedClienteId] = useState<number | null>(null);

  // Determinar se as abas Contratos e Financeiro devem ser habilitadas
  const canEditContratosFinanceiro = useMemo(() => {
    return isEditing || !!createdClienteId;
  }, [isEditing, createdClienteId]);

  const handleConfirm = () => {
    if (confirmAction) {
      confirmAction();
    }
    setShowConfirmModal(false);
    setConfirmAction(null);
    setConfirmMessage('');
  };

  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
    setConfirmAction(null);
    setConfirmMessage('');
  };


  // Buscar dados do cliente (apenas se estiver editando)
  const { data: cliente, isLoading: isLoadingCliente } = useQuery({
    queryKey: ['cliente', clienteId],
    queryFn: () => ClienteService.getById(clienteId!),
    enabled: isEditing && !!clienteId,
  });

  // Carregar dados do cliente quando disponíveis
  useEffect(() => {
    if (cliente) {
      setFormData({
        cnpj: ensureString(cliente.cnpj),
        razao_social: ensureString(cliente.razao_social),
        nome_fantasia: ensureString(cliente.nome_fantasia),
        email: ensureString(cliente.email),
        telefone: ensureString(cliente.telefone),
        whatsapp: ensureString(cliente.whatsapp),
        cep: ensureString(cliente.cep),
        endereco: ensureString(cliente.endereco),
        numero: ensureString(cliente.numero),
        complemento: ensureString(cliente.complemento),
        bairro: ensureString(cliente.bairro),
        cidade: ensureString(cliente.cidade),
        estado: ensureString(cliente.estado),
        ativo: cliente.ativo ?? true,
        tipo_cobranca: cliente.tipo_cobranca || 'titulo',
        valor_primeiro_titulo: cliente.valor_primeiro_titulo || 'total',
        recebe_email: cliente.recebe_email ?? true,
        recebe_sms: cliente.recebe_sms ?? false,
        recebe_whatsapp: cliente.recebe_whatsapp ?? true,
        observacoes: ensureString(cliente.observacoes)
      });
    }
  }, [cliente]);

  // Buscar contratos do cliente (usar clienteId quando editando, ou createdClienteId quando criou)
  const effectiveClienteIdForContratos = clienteId || createdClienteId || undefined;
  const { data: contratosData, isLoading: isLoadingContratos, refetch: refetchContratos } = useContratos(effectiveClienteIdForContratos);
  
  // Hook para deletar contrato
  const deleteContratoMutation = useDeleteContrato();

  // Buscar parcelas do cliente (dados reais do banco)
  const { data: parcelasData, isLoading: isLoadingParcelas, refetch: refetchParcelas } = useQuery({
    queryKey: ['parcelas', 'cliente', effectiveClienteIdForContratos],
    queryFn: () => TituloService.list({ cliente_id: effectiveClienteIdForContratos!, limit: 100 }),
    enabled: !!effectiveClienteIdForContratos,
  });

  // Filtrar e agrupar dados baseado nos checkboxes
  const getFilteredData = () => {
    if (!parcelasData?.data) return [];
    
    // Agora os dados são títulos diretos, não parcelas de carnê
    const allData = parcelasData.data;

    // Filtrar cancelados se não estiver marcado para mostrar
    let filteredData = allData.filter((titulo: CarneParcela) => {
      if (titulo.status === 'cancelado' && !showCancelados) {
        return false;
      }
      return true;
    });

    // A busca será feita pelo componente Table
    return filteredData;
  };

  const filteredData = getFilteredData();

  // Adicionar campos virtuais aos dados para busca funcionar
  const sortedData = filteredData.map((titulo: CarneParcela) => ({
    ...titulo,
    // Adicionar campos virtuais para busca funcionar com campos aninhados
    plano_nome: titulo.plano?.nome_plano || '',
    numero_titulo_str: (titulo.numero_titulo || titulo.numero_parcela || titulo.id).toString(),
    valor_str: (titulo.valor || titulo.valor_parcela || 0).toString(),
    valor_pago_str: (titulo.valor_pago || 0).toString()
  }));

  // Funções de impressão para aba Financeiro
  const handleImprimirSelecionados = async () => {
    if (selectedItems.length > 0) {
      setIsGeneratingPdf(true);
      try {
        const ids = selectedItems.map(item => item.id);
        const pdfBlob = await TituloService.gerarPdfBoletosMultiplos(ids);
        
        const url = window.URL.createObjectURL(pdfBlob);
        setPdfUrl(url);
        setShowImprimirModal(true);
        
        showNotification('Boletos selecionados gerados com sucesso!', 'success');
      } catch (error) {
        showNotification('Erro ao gerar boletos selecionados', 'error');
      } finally {
        setIsGeneratingPdf(false);
      }
    } else {
      showNotification('Nenhum título selecionado', 'info');
    }
  };

  const handleImprimirTodosEmAberto = async () => {
    const allTitulos = parcelasData?.data || [];
    const titulosEmAberto = allTitulos.filter((p: CarneParcela) => 
      p.status === 'pendente' || p.status === 'vencido'
    );
    
    if (titulosEmAberto.length > 0) {
      setIsGeneratingPdf(true);
      try {
        const ids = titulosEmAberto.map((item: CarneParcela) => item.id);
        const pdfBlob = await TituloService.gerarPdfBoletosMultiplos(ids);
        
        const url = window.URL.createObjectURL(pdfBlob);
        setPdfUrl(url);
        setShowImprimirModal(true);
        
        showNotification('Boletos em aberto gerados com sucesso!', 'success');
      } catch (error) {
        showNotification('Erro ao gerar boletos em aberto', 'error');
      } finally {
        setIsGeneratingPdf(false);
      }
    } else {
      showNotification('Não há títulos em aberto para imprimir', 'info');
    }
  };

  // Ações para contratos
  const contratosBulkActions: Array<{
    key: string;
    label: string;
    variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info';
    disabled?: boolean | ((selectedItems: Contrato[]) => boolean);
    onClick?: (selectedItems: Contrato[]) => void;
    confirm?: {
      title: string;
      message: string;
      confirmText?: string;
      cancelText?: string;
    };
    dropdown?: {
      label: string;
      action: () => void;
    }[];
  }> = [
    {
      key: 'novo',
      label: 'Novo',
      variant: 'primary',
      onClick: () => setShowContratoCreateModal(true)
    },
    {
      key: 'editar',
      label: 'Editar',
      variant: 'primary',
      disabled: (selectedItems) => selectedItems.length === 0,
      onClick: (selectedItems) => {
        if (selectedItems.length > 0) {
          setSelectedContratoId(selectedItems[0].id);
          setShowContratoEditModal(true);
        }
      }
    },
    {
      key: 'excluir',
      label: 'Excluir',
      variant: 'primary',
      disabled: (selectedItems) => selectedItems.length === 0,
      onClick: (selectedItems) => {
        for (const item of selectedItems) {
          try {
            deleteContratoMutation.mutateAsync(item.id);
          } catch (error) {
            const axiosError = error as AxiosError<{ message: string; error?: string }>;
            const errorMessage = axiosError?.response?.data?.message || 
                               axiosError?.response?.data?.error || 
                               `Erro ao deletar contrato ${item.id}`;
            showNotification(errorMessage, 'error');
          }
        }
        refetchContratos();
        setSelectedContratosItems([]);
      },
      confirm: {
        title: 'Confirmar Exclusão',
        message: 'Tem certeza que deseja deletar os contratos selecionados?',
        confirmText: 'Confirmar',
        cancelText: 'Cancelar'
      }
    },
    {
      key: 'imprimir',
      label: isGeneratingPdf ? 'Gerando...' : 'Imprimir',
      variant: 'primary',
      disabled: (selectedItems) => selectedItems.length === 0 || isGeneratingPdf,
      dropdown: [
        {
          label: 'Contrato',
          action: async () => {
            if (selectedContratosItems.length > 0) {
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
                  const pdfBlob = await DocumentoSistemaService.generateTestPdf(
                    modeloContrato.data.id, 
                    clienteId || 0
                  );
                  
                  const url = window.URL.createObjectURL(pdfBlob);
                  setPdfUrl(url);
                  setShowImprimirModal(true);
                  
                  showNotification('Contrato gerado com sucesso!', 'success');
                } else {
                  showNotification('Nenhum modelo de contrato encontrado. Cadastre um modelo primeiro.', 'error');
                }
              } catch (error) {
                const axiosError = error as AxiosError<{ message: string }>;
                if (axiosError.response?.status === 404) {
                  showNotification('Modelo de contrato não encontrado. Verifique se existe um modelo padrão cadastrado.', 'error');
                } else {
                  showNotification('Erro ao gerar contrato', 'error');
                }
              } finally {
                setIsGeneratingPdf(false);
              }
            }
          }
        },
        {
          label: 'Termo de Adesão',
          action: async () => {
            if (selectedContratosItems.length > 0) {
              setIsGeneratingPdf(true);
              try {
                await new Promise(resolve => {
                  if (window.requestIdleCallback) {
                    window.requestIdleCallback(resolve);
                  } else {
                    setTimeout(resolve, 0);
                  }
                });
                
                // Usar o tipo 'contrato' disponível para termo de adesão
                const modeloTermo = await DocumentoSistemaService.getDefaultByType('contrato');
                
                if (modeloTermo.success && modeloTermo.data) {
                  // Buscar conteúdos específicos do modelo
                  const modelosData = await DocumentoSistemaService.getModelosByModeloContrato(modeloTermo.data.id);
                  const conteudoAdesao = modelosData.data?.modelo_termo_adesao || modeloTermo.data.conteudo;
                  const pdfBlob = await DocumentoSistemaService.generateTestPdfWithContent(
                    modeloTermo.data.id, 
                    clienteId || 0,
                    conteudoAdesao
                  );
                  
                  const url = window.URL.createObjectURL(pdfBlob);
                  setPdfUrl(url);
                  setShowImprimirModal(true);
                  
                  showNotification('Termo de Adesão gerado com sucesso!', 'success');
                } else {
                  showNotification('Nenhum modelo de contrato encontrado. Cadastre um modelo primeiro.', 'error');
                }
              } catch (error) {
                const axiosError = error as AxiosError<{ message: string }>;
                if (axiosError.response?.status === 404) {
                  showNotification('Modelo de contrato não encontrado. Verifique se existe um modelo padrão cadastrado.', 'error');
                } else {
                  showNotification('Erro ao gerar termo de adesão', 'error');
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
            if (selectedContratosItems.length > 0) {
              setIsGeneratingPdf(true);
              try {
                await new Promise(resolve => {
                  if (window.requestIdleCallback) {
                    window.requestIdleCallback(resolve);
                  } else {
                    setTimeout(resolve, 0);
                  }
                });
                
                // Usar o tipo 'contrato' disponível para contrato de permanência
                const modeloPermanencia = await DocumentoSistemaService.getDefaultByType('contrato');
                
                if (modeloPermanencia.success && modeloPermanencia.data) {
                  // Buscar conteúdos específicos do modelo
                  const modelosData = await DocumentoSistemaService.getModelosByModeloContrato(modeloPermanencia.data.id);
                  const conteudoPermanencia = modelosData.data?.modelo_contrato_permanencia || modeloPermanencia.data.conteudo;
                  const pdfBlob = await DocumentoSistemaService.generateTestPdfWithContent(
                    modeloPermanencia.data.id, 
                    clienteId || 0,
                    conteudoPermanencia
                  );
                  
                  const url = window.URL.createObjectURL(pdfBlob);
                  setPdfUrl(url);
                  setShowImprimirModal(true);
                  
                  showNotification('Contrato de Permanência gerado com sucesso!', 'success');
                } else {
                  showNotification('Nenhum modelo de contrato encontrado. Cadastre um modelo primeiro.', 'error');
                }
              } catch (error) {
                const axiosError = error as AxiosError<{ message: string }>;
                if (axiosError.response?.status === 404) {
                  showNotification('Modelo de contrato não encontrado. Verifique se existe um modelo padrão cadastrado.', 'error');
                } else {
                  showNotification('Erro ao gerar contrato de permanência', 'error');
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

  // Ações para o header do modal (apenas na aba Financeiro)
  const bulkActions: Array<{
    key: string;
    label: string;
    variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info';
    disabled?: boolean | ((selectedItems: CarneParcela[]) => boolean);
    onClick?: (selectedItems: CarneParcela[]) => void;
    confirm?: {
      title: string;
      message: string;
      confirmText?: string;
      cancelText?: string;
    };
    dropdown?: {
      label: string;
      action: () => void;
    }[];
  }> = [
    {
      key: 'editar',
      label: 'Editar',
      variant: 'primary',
      disabled: (selectedItems) => selectedItems.length !== 1,
      onClick: (selectedItems: CarneParcela[]) => {
        if (selectedItems.length > 0) {
          const item = selectedItems[0];
          setSelectedTituloId(item.id);
          setShowTituloEditModal(true);
        }
      }
    },
    {
      key: 'receber',
      label: 'Receber',
      variant: 'success',
      disabled: (selectedItems) => {
        if (selectedItems.length === 0) return true;
        return selectedItems.every(item => item.status === 'pago' || item.status === 'cancelado');
      },
      onClick: (selectedItems: CarneParcela[]) => {
        if (selectedItems.length > 0) {
          const item = selectedItems[0];
          setSelectedParcela({
            ...item,
            valor_pago: item.valor_pago ?? null
          } as TituloItem);
          setShowReceberModal(true);
        }
      }
    },
    {
      key: 'cancelar',
      label: 'Cancelar',
      variant: 'danger',
      disabled: (selectedItems) => {
        if (selectedItems.length === 0) return true;
        return selectedItems.every(item => item.status === 'pago' || item.status === 'cancelado');
      },
      onClick: async (selectedItems: CarneParcela[]) => {
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
                  const _response = await TituloService.update(item.id, { status: 'cancelado' });
                  successCount++;
                } catch (err) {
                  errorCount++;
                }
              }
              
              if (successCount > 0) {
                const message = successCount === 1 
                  ? 'Título cancelado com sucesso!'
                  : `${successCount} títulos cancelados com sucesso!`;
                showNotification(message, 'success');
              }
              
              if (errorCount > 0) {
                const message = errorCount === 1 
                  ? '1 título não pôde ser cancelado'
                  : `${errorCount} títulos não puderam ser cancelados`;
                showNotification(message, 'error');
              }
              
              // Recarregar dados
              queryClient.invalidateQueries({ queryKey: ['cliente', clienteId] });
              queryClient.invalidateQueries({ queryKey: ['parcelas', 'cliente', clienteId] });
              refetchParcelas();
            } catch (err) {
              showNotification('Erro ao cancelar títulos', 'error');
            }
          }
        }
      }
    },
    {
      key: 'estornar',
      label: 'Estornar',
      variant: 'warning',
      disabled: (selectedItems: CarneParcela[]) => {
        if (selectedItems.length === 0) return true;
        return selectedItems.every(item => item.status !== 'pago');
      },
      onClick: async (selectedItems: CarneParcela[]) => {
        if (selectedItems.length > 0) {
          const item = selectedItems[0];
          if (item.status === 'pago') {
            const confirmar = window.confirm(
              `Tem certeza que deseja estornar o título ${item.numero_titulo || item.id}?\n\n` +
              `Valor: ${formatCurrency(item.valor_pago || item.valor || 0)}\n` +
              `O título voltará para status PENDENTE.`
            );
            
            if (confirmar) {
              try {
                await TituloService.estornar(item.id);
                showNotification('Título estornado com sucesso!', 'success');
                queryClient.invalidateQueries({ queryKey: ['parcelas', 'cliente', clienteId] });
                refetchParcelas();
              } catch (err) {
                const error = err as Error;
                showNotification(error.message || 'Erro ao estornar título.', 'error');
              }
            }
          } else {
            showNotification('Só é possível estornar títulos que estão pagos', 'info');
          }
        }
      }
    },
    {
      key: 'imprimir',
      label: isGeneratingPdf ? 'Gerando...' : 'Imprimir',
      variant: 'primary',
      disabled: (_selectedItems) => isGeneratingPdf,
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
    }
  ];

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

  // Processamento dos dados de contratos - apenas retornar os dados, a busca e ordenação serão feitas pelo Table
  const sortedContratosData = contratosData || [];


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
        // Verificar se tem contrato_id diretamente (pode vir do backend mesmo não estando na interface)
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
      key: 'data_pagamento',
      label: 'Data Pagamento',
      sortable: true,
      searchable: false,
      render: (item: CarneParcela) => {
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
    }
  ];

  // Mutation para atualizar cliente
  const updateClienteMutation = useMutation({
    mutationFn: (data: Partial<Cliente>) => ClienteService.update(clienteId!, data),
    onSuccess: () => {
      success('Cliente atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['cliente', clienteId] });
      onSuccess?.();
      // Não fechar o modal automaticamente
    },
    onError: (err) => {
      const axiosError = err as AxiosError<{ message: string }>;
      error(axiosError.response?.data?.message || 'Erro ao atualizar cliente');
    },
  });

  // Mutation para criar cliente
  const createClienteMutation = useMutation({
    mutationFn: (data: Partial<Cliente>) => ClienteService.create(data as CreateCliente),
    onSuccess: (createdCliente: Cliente) => {
      success('Cliente criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      // Armazenar o ID do cliente criado para usar nas abas
      setCreatedClienteId(createdCliente.id);
      onSuccess?.();
      // Não fechar o modal automaticamente
    },
    onError: (err) => {
      const axiosError = err as AxiosError<{ message: string }>;
      error(axiosError.response?.data?.message || 'Erro ao criar cliente');
    },
  });

  // Estado de submissão
  const isSubmitting = updateClienteMutation.isPending || createClienteMutation.isPending;

  // Dados iniciais do formulário
  const initialFormData: ClienteFormData = {
    cnpj: '',
    razao_social: '',
    nome_fantasia: '',
    email: '',
    telefone: '',
    whatsapp: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    ativo: true,
    tipo_cobranca: 'titulo',
    valor_primeiro_titulo: 'total',
    recebe_email: true,
    recebe_sms: false,
    recebe_whatsapp: true,
    observacoes: ''
  };

  // Dados customizados do cliente (quando editando)
  const customFormData = useMemo(() => {
    if (!cliente || typeof cliente !== 'object') return undefined;
    
    return {
      cnpj: cliente.cnpj || '',
      razao_social: cliente.razao_social || '',
      nome_fantasia: cliente.nome_fantasia || '',
      email: cliente.email || '',
      telefone: cliente.telefone || '',
      whatsapp: cliente.whatsapp || '',
      cep: cliente.cep || '',
      endereco: cliente.endereco || '',
      numero: cliente.numero || '',
      complemento: cliente.complemento || '',
      bairro: cliente.bairro || '',
      cidade: cliente.cidade || '',
      estado: cliente.estado || '',
      ativo: cliente.ativo ?? true,
      tipo_cobranca: (cliente.tipo_cobranca === 'carne' ? 'titulo' : cliente.tipo_cobranca) || 'titulo',
      valor_primeiro_titulo: cliente.valor_primeiro_titulo || 'total',
      recebe_email: cliente.recebe_email ?? true,
      recebe_sms: cliente.recebe_sms ?? false,
      recebe_whatsapp: cliente.recebe_whatsapp ?? true,
      observacoes: cliente.observacoes || ''
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    cliente?.id,
    cliente?.cnpj,
    cliente?.razao_social,
    cliente?.nome_fantasia,
    cliente?.email,
    cliente?.telefone,
    cliente?.whatsapp,
    cliente?.cep,
    cliente?.endereco,
    cliente?.numero,
    cliente?.complemento,
    cliente?.bairro,
    cliente?.cidade,
    cliente?.estado,
    cliente?.ativo,
    cliente?.tipo_cobranca,
    cliente?.valor_primeiro_titulo,
    cliente?.recebe_email,
    cliente?.recebe_sms,
    cliente?.recebe_whatsapp,
    cliente?.observacoes
  ]);

  // Usar hook personalizado para reset do formulário
  useFormReset({
    show,
    initialData: initialFormData,
    setFormData,
    setErrors,
    customData: customFormData
  });

  const handleInputChange = async (field: keyof ClienteFormData, value: FormValue) => {
    // Aplicar formatação baseada no campo
    let formattedValue = value;
    if (field === 'cnpj' && typeof value === 'string') {
      formattedValue = formatCNPJ(value);
    } else if ((field === 'telefone' || field === 'whatsapp') && typeof value === 'string') {
      formattedValue = formatPhone(value);
    } else if (field === 'cep' && typeof value === 'string') {
      formattedValue = formatCEP(value);
    }

    setFormData(prev => ({ ...prev, [field]: formattedValue }));
    
    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[field as keyof ClienteFormErrors]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }

    // Se o campo for CNPJ e estiver completo e válido, consultar dados
    if (field === 'cnpj' && typeof formattedValue === 'string' && !isEditing) {
      const cnpjLimpo = formattedValue.replace(/\D/g, '');
      
      // Verificar se CNPJ está completo (14 dígitos) e válido
      if (cnpjLimpo.length === 14 && isValidCNPJ(formattedValue)) {
        // Verificar se já consultou este CNPJ para evitar consultas duplicadas
        if (lastCnpjConsulted.current === cnpjLimpo) {
          return;
        }

        // Verificar se a opção de validar CPF/CNPJ está marcada
        if (parametros?.data?.validar_cpf_cnpj) {
          // Verificar se os campos já estão preenchidos (não sobrescrever se usuário já preencheu)
          const camposVazios = !formData.razao_social && !formData.nome_fantasia && !formData.endereco;
          
          if (camposVazios && !isConsultingCnpj) {
            setIsConsultingCnpj(true);
            lastCnpjConsulted.current = cnpjLimpo;

            try {
              const response = await ClienteService.consultarCnpj(cnpjLimpo);
              
              if (response.success && response.data) {
                const dados = response.data;
                
                // Preencher campos automaticamente
                setFormData(prev => ({
                  ...prev,
                  razao_social: dados.razao_social || prev.razao_social,
                  nome_fantasia: dados.nome_fantasia || prev.nome_fantasia,
                  cep: dados.cep || prev.cep,
                  endereco: dados.endereco || prev.endereco,
                  numero: dados.numero || prev.numero,
                  complemento: dados.complemento || prev.complemento,
                  bairro: dados.bairro || prev.bairro,
                  cidade: dados.cidade || prev.cidade,
                  estado: dados.estado || prev.estado,
                  telefone: dados.telefone || prev.telefone,
                  email: dados.email || prev.email
                }));

                success('Dados do CNPJ preenchidos automaticamente!');
              }
            } catch (err) {
              const axiosError = err as AxiosError<{ message?: string; error?: string }>;
              const status = axiosError?.response?.status;
              
              if (status === 404) {
                // CNPJ não encontrado na base da Receita Federal - não é erro crítico
                info('CNPJ não encontrado na base da Receita Federal. Você pode preencher os dados manualmente.');
              } else {
                // Outros erros (timeout, servidor, etc.)
                const errorMessage = axiosError?.response?.data?.message || 
                                   axiosError?.response?.data?.error || 
                                   'Erro ao consultar CNPJ. Tente novamente ou preencha os dados manualmente.';
                error(errorMessage);
              }
            } finally {
              setIsConsultingCnpj(false);
            }
          }
        }
      }
    }

    // Se o campo for CEP e estiver completo, consultar dados
    if (field === 'cep' && typeof formattedValue === 'string') {
      const cepLimpo = formattedValue.replace(/\D/g, '');
      
      // Verificar se CEP está completo (8 dígitos)
      if (cepLimpo.length === 8) {
        // Verificar se já consultou este CEP para evitar consultas duplicadas
        if (lastCepConsulted.current === cepLimpo) {
          return;
        }

        // Verificar se a opção de validar CEP está marcada
        if (parametros?.data?.validar_cep) {
          // Verificar se os campos de endereço já estão preenchidos (não sobrescrever se usuário já preencheu)
          const camposEnderecoVazios = !formData.endereco && !formData.bairro && !formData.cidade && !formData.estado;
          
          if (camposEnderecoVazios && !isConsultingCep) {
            setIsConsultingCep(true);
            lastCepConsulted.current = cepLimpo;

            try {
              const dados = await ClienteService.buscarCep(cepLimpo);
              
              if (dados) {
                // Preencher campos automaticamente
                setFormData(prev => ({
                  ...prev,
                  endereco: dados.logradouro || prev.endereco,
                  bairro: dados.bairro || prev.bairro,
                  cidade: dados.localidade || prev.cidade,
                  estado: dados.uf || prev.estado,
                  complemento: dados.complemento || prev.complemento
                }));

                success('Dados do CEP preenchidos automaticamente!');
              }
            } catch (err) {
              const axiosError = err as AxiosError<{ message?: string }>;
              const errorMessage = axiosError?.response?.data?.message || 'Erro ao consultar CEP';
              
              // Só mostrar erro se não for "não encontrado" (pode ser CEP válido mas não na base)
              if (axiosError?.response?.status !== 404) {
                error(errorMessage);
              }
            } finally {
              setIsConsultingCep(false);
            }
          }
        }
      } else if (cepLimpo.length < 8) {
        // Resetar quando o CEP não tem 8 dígitos
        lastCepConsulted.current = '';
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ClienteFormErrors, string>> = {};

    if (!formData.cnpj.trim()) newErrors.cnpj = 'CNPJ é obrigatório';
    if (!formData.razao_social.trim()) newErrors.razao_social = 'Razão social é obrigatória';
    if (!formData.email.trim()) newErrors.email = 'Email é obrigatório';

    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    // Preparar dados para envio com conversão de tipos correta
    const dataToSend: Partial<CreateCliente> = {
      cnpj: formData.cnpj,
      razao_social: formData.razao_social,
      nome_fantasia: formData.nome_fantasia,
      email: formData.email,
      telefone: formData.telefone,
      whatsapp: formData.whatsapp,
      cep: formData.cep,
      endereco: formData.endereco,
      numero: formData.numero,
      complemento: formData.complemento,
      bairro: formData.bairro,
      cidade: formData.cidade,
      estado: formData.estado,
      ativo: formData.ativo,
      tipo_cobranca: formData.tipo_cobranca,
      valor_primeiro_titulo: formData.valor_primeiro_titulo,
      recebe_email: formData.recebe_email,
      recebe_sms: formData.recebe_sms,
      recebe_whatsapp: formData.recebe_whatsapp,
      observacoes: formData.observacoes
    };

    // Remover apenas campos undefined
    Object.keys(dataToSend).forEach(key => {
      const value = (dataToSend as Record<string, unknown>)[key];
      if (value === undefined) {
        delete (dataToSend as Record<string, unknown>)[key];
      }
    });

    if (isEditing) {
      updateClienteMutation.mutate(dataToSend);
    } else {
      createClienteMutation.mutate(dataToSend);
    }
  };

  if (isLoadingCliente && isEditing) {
    return (
      <DraggableModal show={show} onClose={onClose} title="Cliente" size="xl" modalId="cliente-modal-loading">
        <div className="text-center p-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
          <p className="mt-2">Carregando dados do cliente...</p>
        </div>
      </DraggableModal>
    );
  }

  if (!cliente && isEditing) {
    return (
      <DraggableModal show={show} onClose={onClose} title="Cliente" size="xl" modalId="cliente-modal-error">
        <div className="text-center p-4">
          <p>Cliente não encontrado.</p>
        </div>
      </DraggableModal>
    );
  }

  // Handler para limpar estado ao fechar
  const handleClose = () => {
    setCreatedClienteId(null);
    onClose();
  };

  return (
    <DraggableModal
      show={show}
      onClose={handleClose}
      title={isEditing ? 'Editar Cliente' : 'Novo Cliente'}
      size="xl"
      modalId={isEditing ? "cliente-edit-modal" : "cliente-create-modal"}
      headerActions={
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="btn btn-primary btn-sm"
            disabled={isEditing ? updateClienteMutation.isPending : createClienteMutation.isPending}
          >
            Salvar
          </button>
        </div>
      }
    >
      <div style={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Navegação por Abas - Fixa */}
        <ul className="nav nav-tabs" id="clienteTabs" role="tablist" style={{ flexShrink: 0, marginBottom: 0, marginTop: '1rem', marginLeft: '1rem', marginRight: '1rem' }}>
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link ${activeTab === 'dados-basicos' ? 'active' : ''}`}
              onClick={() => setActiveTab('dados-basicos')}
              type="button"
            >
              Dados Básicos
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
        </ul>

        {/* Conteúdo das Abas - Com Scroll */}
        <div 
          className="tab-content" 
          id="clienteTabContent" 
          style={{ 
            flex: 1, 
            overflow: (activeTab === 'contratos' || activeTab === 'financeiro') ? 'hidden' : 'auto', 
            padding: (activeTab === 'contratos' || activeTab === 'financeiro') ? '0' : '16px', 
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Aba Dados Básicos */}
          {activeTab === 'dados-basicos' && (
            <DadosBasicosTab
              formData={formData}
              errors={errors}
              handleInputChange={handleInputChange}
              isSubmitting={isSubmitting}
              formPrefix={formPrefix}
            />
          )}

          {/* Aba Contato */}
          {activeTab === 'contato' && (
            <ContatoTab
              formData={formData}
              errors={errors}
              handleInputChange={handleInputChange}
              isSubmitting={isSubmitting}
              formPrefix={formPrefix}
            />
          )}

          {/* Aba Endereço */}
          {activeTab === 'endereco' && (
            <EnderecoTab
              formData={formData}
              errors={errors}
              handleInputChange={handleInputChange}
              isSubmitting={isSubmitting}
              formPrefix={formPrefix}
            />
          )}

          {/* Aba Contratos */}
          {activeTab === 'contratos' && (
            <ContratosTab
              isLoadingContratos={isLoadingContratos}
              sortedContratosData={sortedContratosData}
              selectedContratosItems={selectedContratosItems}
              setSelectedContratosItems={setSelectedContratosItems}
              contratosBulkActions={contratosBulkActions}
              showInativosContratos={showInativosContratos}
              setShowInativosContratos={setShowInativosContratos}
              onRefresh={() => refetchContratos()}
              onShowCreateModal={() => setShowContratoCreateModal(true)}
              onShowEditModal={(contratoId) => {
                setSelectedContratoId(contratoId);
                setShowContratoEditModal(true);
              }}
              isGeneratingPdf={isGeneratingPdf}
            />
          )}

          {/* Aba Financeiro */}
          {activeTab === 'financeiro' && (
            <FinanceiroTab
              sortedData={sortedData}
              isLoadingParcelas={isLoadingParcelas}
              selectedItems={selectedItems}
              setSelectedItems={setSelectedItems}
              bulkActions={bulkActions}
              showCancelados={showCancelados}
              setShowCancelados={setShowCancelados}
              onRefresh={() => refetchParcelas()}
              isGeneratingPdf={isGeneratingPdf}
              columns={columns}
            />
          )}

          {/* Aba Observações */}
          {activeTab === "observacoes" && (
            <ObservacoesTab
              formData={formData}
              errors={errors}
              handleInputChange={handleInputChange}
              isSubmitting={isSubmitting}
              formPrefix={formPrefix}
            />
          )}
          </div>
        </div>

        {/* Modal de edição de título */}
        <>
          <TituloModal
          show={showTituloEditModal}
          tituloId={selectedTituloId || null}
          onClose={() => {
            setShowTituloEditModal(false);
            setSelectedTituloId(null);
            // Sempre refetch quando modal fechar (cancelar ou sucesso)
            refetchParcelas();
            queryClient.invalidateQueries({ queryKey: ['parcelas', 'cliente', clienteId] });
          }}
          onSuccess={() => {
            setShowTituloEditModal(false);
            setSelectedTituloId(null);
            // Forçar refetch imediatamente
            refetchParcelas();
            // Também invalidar queries para garantir atualização
            queryClient.invalidateQueries({ queryKey: ['parcelas', 'cliente', clienteId] });
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
          clienteId={cliente?.id || createdClienteId || undefined}
          contratoId={showContratoEditModal ? selectedContratoId : null}
          onClose={() => {
            setShowContratoCreateModal(false);
            setShowContratoEditModal(false);
            setSelectedContratoId(null);
          }}
          onSuccess={() => {
            // Não fechar o modal automaticamente - permitir criar múltiplos contratos
            // Refetch contratos será feito automaticamente pela query invalidation
          }}
        />

        {/* Modal de impressão - renderizado fora do modal principal */}
        <ImprimirModal
          show={showImprimirModal}
          onClose={() => {
            setShowImprimirModal(false);
            if (pdfUrl) {
              window.URL.revokeObjectURL(pdfUrl);
              setPdfUrl(null);
            }
          }}
          pdfUrl={pdfUrl}
          title="Visualizar Contrato"
          modalId="cliente-imprimir-modal"
        />

        {/* Modal de Confirmação */}
        <ConfirmModal
          show={_showConfirmModal}
          title="Confirmar Ação"
          message={confirmMessage}
          onConfirm={handleConfirm}
          onCancel={handleCancelConfirm}
          type="danger"
          confirmText="Confirmar"
          cancelText="Cancelar"
        />
          </>

    </DraggableModal>
  );
};

export default ClienteModal;