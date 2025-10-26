import React, { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClienteService } from '../../../services/clienteService';
import { PlanoService } from '../../../services/planoService';
import { BancoService } from '../../../services/bancoService';
import { TituloService } from '../../../services/tituloService';
import DocumentoSistemaService from '../../../services/documentoSistemaService';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import { Cliente, CarneParcela, Contrato, Titulo } from '../../../types';
import DraggableModal from '../../common/DraggableModal';
import FormField from '../../ui/FormField';
import { useFormPrefix } from '../../../hooks/useFormId';
import Table from '../../tables/Table';
import { TableConfig } from '../../tables/types';
import ImprimirModal from '../../common/ImprimirModal';
import TituloEditModal from '../titulos/TituloEditModal';
import ReceberModal from '../pagamentos/ReceberModal';
import { useContratos, useDeleteContrato } from '../../../hooks/useContratos';
import ContratoCreateModal from './ContratoCreateModal';
import ContratoEditModal from './ContratoEditModal';
import { useFormReset } from '../../../hooks/useFormReset';
import { Form, FormConfig, AddressFields, ContactFields } from '../../forms';
import Button from '../../ui/Button';
import Dropdown from '../../ui/Dropdown';
import ConfirmModal from '../../ui/ConfirmModal';
// Utilitários centralizados
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { validateClienteForm } from '../../../utils/validators';
import { ContratoItem, TituloItem, ClienteFormData, ClienteFormErrors, BulkActionItem } from '../../../types/cliente';

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
  const { success, error } = useNotificationContext();
  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    if (type === 'success') success(message);
    else if (type === 'error') error(message);
    else success(message); // Para info, usar success
  };
  const queryClient = useQueryClient();

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
  const [showCancelados, setShowCancelados] = useState(false);
  const [showTituloEditModal, setShowTituloEditModal] = useState(false);
  const [showReceberModal, setShowReceberModal] = useState(false);
  const [showContratoCreateModal, setShowContratoCreateModal] = useState(false);
  const [showContratoEditModal, setShowContratoEditModal] = useState(false);
  const [showImprimirModal, setShowImprimirModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showImprimirDropdown, setShowImprimirDropdown] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [selectedContratoId, setSelectedContratoId] = useState<number | null>(null);
  const [selectedTituloId, setSelectedTituloId] = useState<number | null>(null);
  const [selectedParcela, setSelectedParcela] = useState<TituloItem | null>(null);
  const [selectedItems, setSelectedItems] = useState<TituloItem[]>([]);
  const [selectedContratosItems, setSelectedContratosItems] = useState<ContratoItem[]>([]);
  const [showInativosContratos, setShowInativosContratos] = useState(false);
  const [searchContratos, setSearchContratos] = useState('');
  const [searchFinanceiro, setSearchFinanceiro] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortColumn, setSortColumn] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [createdClienteId, setCreatedClienteId] = useState<number | null>(null);

  // Determinar se as abas Contratos e Financeiro devem ser habilitadas
  const canEditContratosFinanceiro = useMemo(() => {
    return isEditing || !!createdClienteId;
  }, [isEditing, createdClienteId]);

  // Função helper para mostrar confirmação
  const showConfirmation = (message: string, action: () => void) => {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setShowConfirmModal(true);
  };

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

  // Fechar dropdown ao clicar fora
  React.useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    if (openDropdown !== null) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown]);

  // Fechar dropdown ao clicar fora
  React.useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    if (openDropdown !== null) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown]);


  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown')) {
        setShowImprimirDropdown(false);
      }
    };

    if (showImprimirDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showImprimirDropdown]);


  // Buscar dados do cliente (apenas se estiver editando)
  const { data: cliente, isLoading: isLoadingCliente } = useQuery({
    queryKey: ['cliente', clienteId],
    queryFn: () => ClienteService.getById(clienteId!),
    enabled: isEditing && !!clienteId,
  });

  // Carregar dados do cliente quando disponíveis
  useEffect(() => {
    if (cliente) {
      // Função helper para garantir que valores sejam strings e não objetos
      const ensureString = (value: any): string => {
        if (!value) return '';
        if (typeof value === 'string') return value;
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      };

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

  // Buscar planos
  const { data: planosData } = useQuery({
    queryKey: ['planos'],
    queryFn: () => PlanoService.list({ page: 1, limit: 100 }),
  });

  // Buscar bancos
  const { data: bancosData } = useQuery({
    queryKey: ['bancos'],
    queryFn: () => BancoService.list({ page: 1, limit: 100 }),
  });

  // Buscar contratos do cliente (usar clienteId quando editando, ou createdClienteId quando criou)
  const effectiveClienteIdForContratos = clienteId || createdClienteId || undefined;
  const { data: contratosData, isLoading: isLoadingContratos, error: contratosError, refetch: refetchContratos } = useContratos(effectiveClienteIdForContratos);
  
  // Hook para deletar contrato
  const deleteContratoMutation = useDeleteContrato();

  // Buscar parcelas do cliente (dados reais do banco)
  const { data: parcelasData, isLoading: isLoadingParcelas, refetch: refetchParcelas } = useQuery({
    queryKey: ['parcelas', 'cliente', effectiveClienteIdForContratos],
    queryFn: () => TituloService.list({ cliente_id: effectiveClienteIdForContratos!, limit: 100 }),
    enabled: !!effectiveClienteIdForContratos,
  });

  // Configuração do formulário unificado para dados básicos
  const dadosBasicosFormConfig: FormConfig = {
    fields: [
      {
        name: 'cnpj',
        type: 'text',
        label: 'CNPJ',
        placeholder: '00.000.000/0000-00',
        required: true,
        size: 'md',
        validation: [
          { type: 'required', message: 'CNPJ é obrigatório' },
          { type: 'pattern', value: /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, message: 'CNPJ inválido' }
        ]
      },
      {
        name: 'razao_social',
        type: 'text',
        label: 'Razão Social',
        placeholder: 'Razão social da empresa',
        required: true,
        size: 'md',
        validation: [
          { type: 'required', message: 'Razão Social é obrigatória' }
        ]
      },
      {
        name: 'nome_fantasia',
        type: 'text',
        label: 'Nome Fantasia',
        placeholder: 'Nome fantasia da empresa',
        size: 'md'
      },
      {
        name: 'ativo',
        type: 'checkbox',
        label: 'Cliente Ativo',
        description: 'Cliente está ativo no sistema',
        switch: false
      }
    ],
    layout: 'vertical',
    columns: 2,
    spacing: 'md'
  };

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

    // Aplicar filtro de busca
    if (searchFinanceiro.trim()) {
      const searchTerm = searchFinanceiro.toLowerCase().trim();
      filteredData = filteredData.filter((titulo: CarneParcela) => {
        const id = titulo.id?.toString() || '';
        const numeroTitulo = titulo.numero_titulo || '';
        const valor = titulo.valor?.toString() || '';
        const status = titulo.status || '';
        
        return (
          id.includes(searchTerm) ||
          numeroTitulo.toLowerCase().includes(searchTerm) ||
          valor.includes(searchTerm) ||
          status.toLowerCase().includes(searchTerm)
        );
      });
    }

    return filteredData;
  };

  const filteredData = getFilteredData();

  // Função para ordenar os dados
  const getSortedData = () => {
    if (!sortColumn) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      let valueA: string | number | Date;
      let valueB: string | number | Date;
      
      switch (sortColumn) {
        case 'id':
          valueA = a.id;
          valueB = b.id;
          break;
        case 'status':
          valueA = a.status === 'pago' ? 0 : a.status === 'vencido' ? 1 : a.status === 'pendente' ? 2 : 3;
          valueB = b.status === 'pago' ? 0 : b.status === 'vencido' ? 1 : b.status === 'pendente' ? 2 : 3;
          break;
        case 'numero_carne':
          valueA = a.carne?.numero_carne || '';
          valueB = b.carne?.numero_carne || '';
          break;
        case 'quantidade_parcelas':
          valueA = (a.numero_parcela || a.numero_titulo || a.id).toString();
          valueB = (b.numero_parcela || b.numero_titulo || b.id).toString();
          break;
        case 'data_vencimento':
          valueA = new Date(a.data_vencimento);
          valueB = new Date(b.data_vencimento);
          break;
        case 'valor':
          valueA = Number(a.valor_parcela || 0);
          valueB = Number(b.valor_parcela || 0);
          break;
        case 'valor_pago':
          valueA = a.pago ? Number(a.valor_pago || a.valor_parcela || 0) : 0;
          valueB = b.pago ? Number(b.valor_pago || b.valor_parcela || 0) : 0;
          break;
        case 'valor_aberto':
          valueA = (a.pago || a.status === 'cancelado') ? 0 : Number(a.valor_parcela || 0);
          valueB = (b.pago || b.status === 'cancelado') ? 0 : Number(b.valor_parcela || 0);
          break;
        default:
          valueA = a[sortColumn as keyof CarneParcela] as string | number || '';
          valueB = b[sortColumn as keyof CarneParcela] as string | number || '';
      }
      
      // Comparação
      if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const sortedData = getSortedData();

  // Aplicar paginação aos dados ordenados
  const getPaginatedData = () => {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    return sortedData.slice(startIndex, endIndex);
  };

  const paginatedData = getPaginatedData();

  // Funções de impressão
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
      } catch (error: any) {
        console.error('Erro ao gerar PDF dos boletos:', error);
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
      } catch (error: any) {
        console.error('Erro ao gerar PDF dos boletos:', error);
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
    disabled?: boolean | ((selectedItems: any[]) => boolean);
    onClick?: (selectedItems: any[]) => void;
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
      disabled: (selectedItems) => selectedItems.length !== 1,
      onClick: (selectedItems) => {
        if (selectedItems.length === 1) {
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
          } catch (error: any) {
            console.error(`Erro ao deletar contrato ${item.id}:`, error);
            const errorMessage = error?.response?.data?.message || 
                               error?.response?.data?.error || 
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
              } catch (error: any) {
                console.error('Erro ao gerar PDF:', error);
                if (error.response?.status === 404) {
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
              } catch (error: any) {
                console.error('Erro ao gerar PDF:', error);
                if (error.response?.status === 404) {
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
              } catch (error: any) {
                console.error('Erro ao gerar PDF:', error);
                if (error.response?.status === 404) {
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
                  const response = await TituloService.update(item.id, { status: 'cancelado' });
                  successCount++;
                } catch (err: any) {
                  console.error(`Erro ao cancelar título ${item.id}:`, err);
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
            } catch (err: any) {
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
              } catch (err: any) {
                showNotification(err.message || 'Erro ao estornar título.', 'error');
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
      disabled: (selectedItems) => isGeneratingPdf,
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

  // Processamento dos dados de contratos
  const sortedContratosData = React.useMemo(() => {
    if (!contratosData) return [];
    
    let filtered = contratosData.filter((contrato: any) => {
      // Filtro por busca
      if (searchContratos) {
        const searchLower = searchContratos.toLowerCase();
        const matchesSearch = 
          contrato.plano?.nome_plano?.toLowerCase().includes(searchLower) ||
          contrato.status?.toLowerCase().includes(searchLower) ||
          contrato.valor_final?.toString().includes(searchLower) ||
          contrato.id?.toString().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      return true;
    });

    // Ordenação
    if (sortColumn) {
      filtered = [...filtered].sort((a: any, b: any) => {
        let aValue: any = a[sortColumn];
        let bValue: any = b[sortColumn];
        
        // Tratar campos especiais
        if (sortColumn === 'plano') {
          aValue = a.plano?.nome_plano || '';
          bValue = b.plano?.nome_plano || '';
        } else if (sortColumn === 'valor_plano') {
          aValue = parseFloat(a.plano?.valor_mensal) || 0;
          bValue = parseFloat(b.plano?.valor_mensal) || 0;
        } else if (sortColumn === 'valor_final') {
          aValue = parseFloat(aValue) || 0;
          bValue = parseFloat(bValue) || 0;
        }
        
        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();
        
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return filtered;
  }, [contratosData, searchContratos, showInativosContratos, sortColumn, sortDirection]);

  const paginatedContratosData = React.useMemo(() => {
    const startIndex = (page - 1) * limit;
    return sortedContratosData.slice(startIndex, startIndex + limit);
  }, [sortedContratosData, page, limit]);

  // Colunas para contratos
  const contratosColumns = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      render: (contrato: ContratoItem) => contrato.id
    },
    {
      key: 'nome_plano',
      label: 'Plano',
      sortable: true,
      render: (contrato: ContratoItem) => contrato.plano?.nome_plano || '-'
    },
    {
      key: 'valor_plano',
      label: 'Valor Plano',
      sortable: true,
      render: (contrato: ContratoItem) => contrato.plano?.valor_mensal ? formatCurrency(contrato.plano.valor_mensal) : '-'
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (contrato: ContratoItem) => (
        <span className={`badge ${
          contrato.status === 'ativo' ? 'bg-success' :
          contrato.status === 'inativo' ? 'bg-danger' :
          'bg-warning'
        }`}>
          {contrato.status}
        </span>
      )
    },
    {
      key: 'desconto_percentual',
      label: 'Desconto %',
      sortable: true,
      render: (contrato: ContratoItem) => contrato.desconto_percentual ? `${contrato.desconto_percentual}%` : '-'
    },
    {
      key: 'desconto_valor',
      label: 'Desconto R$',
      sortable: true,
      render: (contrato: ContratoItem) => contrato.desconto_valor ? formatCurrency(contrato.desconto_valor) : '-'
    },
    {
      key: 'valor_final',
      label: 'Valor Final',
      sortable: true,
      render: (contrato: ContratoItem) => contrato.valor_final ? formatCurrency(contrato.valor_final) : '-'
    },
    {
      key: 'data_inicio',
      label: 'Data Início',
      sortable: true,
      render: (contrato: ContratoItem) => formatDate(contrato.data_inicio)
    },
    {
      key: 'data_fim',
      label: 'Data Fim',
      sortable: true,
      render: (contrato: ContratoItem) => contrato.data_fim ? formatDate(contrato.data_fim) : '-'
    },
    {
      key: 'isento_mensalidade',
      label: 'Isento',
      sortable: true,
      render: (contrato: ContratoItem) => (
        <span className={`badge ${contrato.isento_mensalidade ? 'bg-success' : 'bg-secondary'}`}>
          {contrato.isento_mensalidade ? 'Sim' : 'Não'}
        </span>
      )
    },
    {
      key: 'dia_vencimento',
      label: 'Dia Venc.',
      sortable: true,
      render: (contrato: ContratoItem) => contrato.dia_vencimento ? contrato.dia_vencimento : '-'
    },
    {
      key: 'banco_nome',
      label: 'Banco',
      sortable: true,
      render: (contrato: ContratoItem) => contrato.bancoBoleto?.nome || '-'
    }
  ];

  // Colunas para a tabela de títulos
  const columns = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      render: (item: CarneParcela) => item.id
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (item: CarneParcela) => {
        return (
          <span className={`badge bg-${getStatusColor(item.status)}`}>
            {item.status}
          </span>
        );
      }
    },
    {
      key: 'plano',
      label: 'Plano',
      sortable: true,
      render: (item: CarneParcela) => {
        return item.plano?.nome_plano || '-';
      }
    },
    {
      key: 'data_vencimento',
      label: 'Vencimento',
      sortable: true,
      render: (item: CarneParcela) => {
        return formatDate(item.data_vencimento);
      }
    },
    {
      key: 'valor',
      label: 'Valor',
      sortable: true,
      render: (item: CarneParcela) => {
        return formatCurrency(item.valor || 0);
      }
    },
    {
      key: 'valor_pago',
      label: 'Valor baixado',
      sortable: true,
      render: (item: CarneParcela) => {
        return item.status === 'pago' ? formatCurrency(item.valor_pago || item.valor || 0) : formatCurrency(0);
      }
    },
    {
      key: 'valor_aberto',
      label: 'Valor aberto',
      sortable: true,
      render: (item: CarneParcela) => {
        return (item.status === 'pago' || item.status === 'cancelado') ? formatCurrency(0) : formatCurrency(item.valor || 0);
      }
    },
    {
      key: 'data_pagamento',
      label: 'Data Pagamento',
      sortable: true,
      render: (item: CarneParcela) => {
        return item.data_pagamento ? formatDate(item.data_pagamento) : '-';
      }
    },
    {
      key: 'charge_id',
      label: 'Charge ID',
      sortable: true,
      render: (item: CarneParcela) => {
        return item.charge_id || '-';
      }
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
    onError: (err: any) => {
      error(err.response?.data?.message || 'Erro ao atualizar cliente');
    },
  });

  // Mutation para criar cliente
  const createClienteMutation = useMutation({
    mutationFn: (data: Partial<Cliente>) => ClienteService.create(data as any),
    onSuccess: (createdCliente: Cliente) => {
      success('Cliente criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      // Armazenar o ID do cliente criado para usar nas abas
      setCreatedClienteId(createdCliente.id);
      onSuccess?.();
      // Não fechar o modal automaticamente
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Erro ao criar cliente');
    },
  });

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

  // Função para aplicar máscara CNPJ
  const formatCNPJ = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
    if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
    if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
  };

  // Função para aplicar máscara de telefone
  const formatPhone = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  // Função para aplicar máscara CEP
  const formatCEP = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  const handleInputChange = (field: keyof ClienteFormData, value: any) => {
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
  };

  const validateForm = (): boolean => {
    const newErrors: any = {};

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
    const dataToSend: any = {
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
      const value = dataToSend[key];
      if (value === undefined) {
        delete dataToSend[key];
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
            overflow: 'hidden', 
            padding: (activeTab === 'contratos' || activeTab === 'financeiro') ? '0' : '16px', 
            minHeight: 0 
          }}
        >
          {/* Aba Dados Básicos */}
          {activeTab === 'dados-basicos' && (
            <Form
              key={`dados-basicos-${clienteId}`}
              config={dadosBasicosFormConfig}
              formPrefix={formPrefix}
              initialValues={{
                cnpj: formData.cnpj || '',
                razao_social: formData.razao_social || '',
                nome_fantasia: formData.nome_fantasia || '',
                ativo: formData.ativo
              }}
              onFieldChange={(name, value) => {
                handleInputChange(name as keyof ClienteFormData, value);
              }}
              onSubmit={(data) => {
                // Manter apenas os campos da aba dados básicos
                handleInputChange('cnpj', data.cnpj);
                handleInputChange('razao_social', data.razao_social);
                handleInputChange('nome_fantasia', data.nome_fantasia);
                handleInputChange('ativo', data.ativo);
              }}
              showSubmitButton={false}
              showResetButton={false}
              className="dados-basicos-form"
            />
          )}

            {/* Aba Contato */}
            {activeTab === 'contato' && (
              <div className="row">
                <div className="col-md-8">
                  <ContactFields 
                    required={true}
                    size="md"
                    includeEmail={true}
                    includeWhatsApp={true}
                    formData={formData}
                    onChange={(name: string, value: any) => handleInputChange(name as keyof ClienteFormData, value)}
                    errors={errors}
                  />
                </div>
                
                <div className="col-md-4">
                  <h6 className="text-primary mb-3">Preferências de Comunicação</h6>
                  
                  <div className="mb-3">
                    <FormField
                      name="recebe_email"
                      type="checkbox"
                      label="Recebe Email"
                      value={formData.recebe_email}
                      onChange={(value: any) => handleInputChange('recebe_email', value)}
                      formPrefix={formPrefix}
                    />
                  </div>

                  <div className="mb-3">
                    <FormField
                      name="recebe_sms"
                      type="checkbox"
                      label="Recebe SMS"
                      value={formData.recebe_sms}
                      onChange={(value: any) => handleInputChange('recebe_sms', value)}
                      formPrefix={formPrefix}
                    />
                  </div>

                  <div className="mb-3">
                    <FormField
                      name="recebe_whatsapp"
                      type="checkbox"
                      label="Recebe WhatsApp"
                      value={formData.recebe_whatsapp}
                      onChange={(value: any) => handleInputChange('recebe_whatsapp', value)}
                      formPrefix={formPrefix}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Aba Endereço */}
            {activeTab === 'endereco' && (
              <AddressFields 
                required={false}
                size="md"
                formData={formData}
                onChange={(name: string, value: any) => handleInputChange(name as keyof ClienteFormData, value)}
                errors={errors}
              />
            )}


            {/* Aba Contratos */}
            {activeTab === 'contratos' && (
              <div className="row">
                <div className="col-12">
                  <Table
                    config={{
                      columns: contratosColumns,
                      data: contratosData as ContratoItem[] || [],
                      loading: isLoadingContratos,
                      selectable: true,
                      multiSelect: true,
                      searchable: true,
                      searchPlaceholder: 'Buscar por plano, status, valor...',
                      sortable: true,
                      striped: true,
                      hover: true,
                      responsive: true,
                      bulkActions: contratosBulkActions,
                      emptyMessage: 'Este cliente ainda não possui contratos cadastrados.',
                      className: 'no-padding',
                      customFilters: (data: any[]) => {
                        return data.filter((contrato: any) => {
                          if (contrato.status === 'inativo' && !showInativosContratos) {
                            return false;
                          }
                          return true;
                        });
                      },
                      customControls: (
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="showInativosContratos"
                            checked={showInativosContratos}
                            onChange={(e) => setShowInativosContratos(e.target.checked)}
                          />
                          <label className="form-check-label" htmlFor="showInativosContratos">
                            Mostrar inativos
                          </label>
                        </div>
                      )
                    }}
                    onSelectionChange={setSelectedContratosItems}
                    onRefresh={() => refetchContratos()}
                  />

                  {/* Resumo de Contratos */}
                  {sortedContratosData.length > 0 && (
                    <div className="d-flex justify-content-between align-items-center mt-3 p-3 bg-light rounded" style={{ margin: '1rem' }}>
                      <div className="d-flex align-items-center">
                        <i className="bi bi-info-circle text-muted me-2"></i>
                        <span className="small text-muted">Resumo de contratos</span>
                      </div>
                      <div className="d-flex gap-4">
                        <div className="text-end">
                          <div className="small text-muted">Total de contratos:</div>
                          <strong>{sortedContratosData.length}</strong>
                        </div>
                        <div className="text-end">
                          <div className="small text-muted">Contratos ativos:</div>
                          <strong>{sortedContratosData.filter((c: any) => c.status === 'ativo').length}</strong>
                        </div>
                        <div className="text-end">
                          <div className="small text-muted">Valor total mensal:</div>
                          <strong>R$ {sortedContratosData.reduce((sum: number, contrato: any) => {
                            return sum + Number(contrato.valor_final || 0);
                          }, 0).toFixed(2)}</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Aba Financeiro */}
            {activeTab === 'financeiro' && (
              <div className="row">
                <div className="col-12">
                  <Table
                    config={{
                      columns: columns,
                      data: sortedData,
                      loading: isLoadingParcelas,
                      selectable: true,
                      multiSelect: true,
                      searchable: true,
                      searchPlaceholder: 'Buscar por ID, carnê, valor...',
                      sortable: true,
                      striped: true,
                      hover: true,
                      responsive: true,
                      bulkActions: bulkActions,
                      emptyMessage: 'Este cliente ainda não possui títulos cadastrados.',
                      className: 'no-padding',
                      customControls: (
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="showCancelados"
                            checked={showCancelados}
                            onChange={(e) => setShowCancelados(e.target.checked)}
                          />
                          <label className="form-check-label" htmlFor="showCancelados">
                            Mostrar cancelados
                          </label>
                        </div>
                      )
                    }}
                      onSelectionChange={(items: any[]) => setSelectedItems(items as TituloItem[])}
                    onRefresh={() => refetchParcelas()}
                  />

                  {/* Resumo Financeiro */}
                  {sortedData.length > 0 && (
                    <div className="d-flex justify-content-between align-items-center mt-3 p-3 bg-light rounded" style={{ margin: '1rem' }}>
                      <div className="d-flex align-items-center">
                        <i className="bi bi-info-circle text-muted me-2"></i>
                        <span className="small text-muted">Legenda de cores</span>
                      </div>
                      <div className="d-flex gap-4">
                        <div className="text-end">
                          <div className="small text-muted">Valor:</div>
                          <strong>R$ {sortedData.reduce((sum: number, item: any) => {
                            return sum + Number(item.valor || item.valor_parcela || 0);
                          }, 0).toFixed(2)}</strong>
                        </div>
                        <div className="text-end">
                          <div className="small text-muted">Valor baixado:</div>
                          <strong>R$ {sortedData.reduce((sum: number, item: any) => {
                            // Só considerar como baixado se estiver pago E não cancelado
                            if (item.pago && item.status === 'pago') {
                              return sum + Number(item.valor_pago || 0);
                            }
                            return sum;
                          }, 0).toFixed(2)}</strong>
                        </div>
                        <div className="text-end">
                          <div className="small text-muted">Valor aberto:</div>
                          <strong>R$ {sortedData.reduce((sum: number, item: any) => {
                            return sum + ((item.pago || item.status === 'cancelado') ? 0 : Number(item.valor || item.valor_parcela || 0));
                          }, 0).toFixed(2)}</strong>
                        </div>
                        <div className="text-end">
                          <div className="small text-muted">Valor cancelado:</div>
                          <strong>R$ {sortedData.reduce((sum: number, item: any) => {
                            return sum + (item.status === 'cancelado' ? Number(item.valor || item.valor_parcela || 0) : 0);
                          }, 0).toFixed(2)}</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Aba Observações */}
            {activeTab === "observacoes" && (
              <div className="row">
                <div className="col-12">
                  <div className="mb-3">
                    <label htmlFor={`${formPrefix}-observacoes`} className="form-label">Observações</label>
                    <textarea
                      className="form-control"
                      id={`${formPrefix}-observacoes`}
                      name="observacoes"
                      rows={8}
                      value={formData.observacoes}
                      onChange={(e) => handleInputChange('observacoes', e.target.value)}
                      placeholder="Observações sobre o cliente..."
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal de edição de título */}
        <>
          <TituloEditModal
          show={showTituloEditModal}
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
          parcelaId={selectedTituloId || 0}
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
            cliente: selectedParcela.cliente || selectedParcela.carne?.cliente
          } : null}
          onSuccess={() => {
            setShowReceberModal(false);
            setSelectedParcela(null);
            refetchParcelas();
          }}
        />

        {/* Modal de criação de contrato */}
        <ContratoCreateModal
          show={showContratoCreateModal}
          clienteId={cliente?.id || createdClienteId || undefined}
          onClose={() => setShowContratoCreateModal(false)}
          onSuccess={() => {
            setShowContratoCreateModal(false);
            // Refetch contratos
          }}
        />

        {/* Modal de edição de contrato */}
        <ContratoEditModal
          show={showContratoEditModal}
          contratoId={selectedContratoId}
          onClose={() => {
            setShowContratoEditModal(false);
            setSelectedContratoId(null);
          }}
          onSuccess={() => {
            // Refetch contratos
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
          show={showConfirmModal}
          message={confirmMessage}
          onConfirm={handleConfirm}
          onCancel={handleCancelConfirm}
          confirmVariant="danger"
          confirmText="Confirmar"
          cancelText="Cancelar"
        />
          </>

    </DraggableModal>
  );
};

export default ClienteModal;