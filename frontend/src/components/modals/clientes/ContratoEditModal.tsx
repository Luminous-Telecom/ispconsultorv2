import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import { usePlanos } from '../../../hooks/usePlanos';
import { useBancos } from '../../../hooks/useBancos';
import { useCreateContrato, useUpdateContrato } from '../../../hooks/useContratos';
import { useTermosContrato, useCreateTermoContrato, useUpdateTermoContrato, useDeactivateTermoContrato, useDeleteTermoContrato } from '../../../hooks/useTermosContrato';
import { TermoContrato } from '../../../services/TermoContratoService';
import { useModelosTermo } from '../../../hooks/useModelosTermo';
import { TituloService } from '../../../services/tituloService';
import { Titulo, Plano } from '../../../types';
import DraggableModal from '../../common/DraggableModal';
import DataTable from '../../common/DataTable';
import ModalHeaderActions from '../../common/ModalHeaderActions';
import ImprimirModal from '../../common/ImprimirModal';
import ModeloTermoService from '../../../services/modeloTermoService';
import { useFormReset } from '../../../hooks/useFormReset';
import TituloCreateModal from '../titulos/TituloCreateModal';
import TituloEditModal from '../titulos/TituloEditModal';
import ReceberModal from '../pagamentos/ReceberModal';
import DocumentoSistemaService from '../../../services/documentoSistemaService';

interface ContratoForm {
  plano_id: number;
  desconto_percentual: number;
  desconto_valor: number;
  data_inicio: string;
  data_fim: string;
  status: 'ativo' | 'inativo' | 'suspenso';
  observacoes: string;
  isento_mensalidade: boolean;
  dia_vencimento: number;
  conta_boleto: number;
  data_validade_desconto: string;
  modelo_contrato_id: number;
}

interface ContratoEditModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  contratoId: number | null;
}

const ContratoEditModal: React.FC<ContratoEditModalProps> = ({ 
  show, 
  onClose, 
  onSuccess,
  contratoId 
}) => {
  const [formData, setFormData] = useState<ContratoForm>({
    plano_id: 0,
    desconto_percentual: 0,
    desconto_valor: 0,
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: '',
    status: 'ativo',
    observacoes: '',
    isento_mensalidade: false,
    dia_vencimento: 10,
    conta_boleto: 0,
    data_validade_desconto: '',
    modelo_contrato_id: 0
  });

  const [errors, setErrors] = useState<Partial<ContratoForm>>({});
  const [activeTab, setActiveTab] = useState('contrato');
  const [showCancelados, setShowCancelados] = useState(false);
  const [showInativos, setShowInativos] = useState(false);
  const [showTermoModal, setShowTermoModal] = useState(false);
  const [showSelecionarTermoModal, setShowSelecionarTermoModal] = useState(false);
  const [termoSelecionado, setTermoSelecionado] = useState<any>(null);
  const [editingTermo, setEditingTermo] = useState<TermoContrato | null>(null);
  const [searchTermosModal, setSearchTermosModal] = useState('');
  const [pageTermosModal, setPageTermosModal] = useState(1);
  const [limitTermosModal, setLimitTermosModal] = useState(10);
  const [sortColumnTermosModal, setSortColumnTermosModal] = useState<string>('id');
  const [sortDirectionTermosModal, setSortDirectionTermosModal] = useState<'asc' | 'desc'>('desc');
  const [lastClickTime, setLastClickTime] = useState<number>(0);
  const [lastClickedItem, setLastClickedItem] = useState<any>(null);
  const [termoFormData, setTermoFormData] = useState({
    assinado: 'NAO' as 'SIM' | 'NAO',
    termoCadastradoId: 0
  });
  const [showTituloCreateModal, setShowTituloCreateModal] = useState(false);
  const [showTituloEditModal, setShowTituloEditModal] = useState(false);
  const [showReceberModal, setShowReceberModal] = useState(false);
  const [selectedTituloId, setSelectedTituloId] = useState<number | null>(null);
  const [selectedParcela, setSelectedParcela] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [selectedTermosItems, setSelectedTermosItems] = useState<any[]>([]);
  
  // Estados para modal de impressão
  const [showPreview, setShowPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  const [search, setSearch] = useState('');
  const [searchTermos, setSearchTermos] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortColumn, setSortColumn] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const { success, error } = useNotificationContext();
  const queryClient = useQueryClient();
  
  // Buscar termos cadastrados no sistema
  const { data: termosSistema, isLoading: isLoadingTermos } = useModelosTermo();

  // Filtrar e ordenar termos
  const filteredTermos = React.useMemo(() => {
    if (!termosSistema) return [];
    
    let filtered = [...termosSistema];
    
    // Aplicar busca
    if (searchTermosModal) {
      const searchLower = searchTermosModal.toLowerCase();
      filtered = filtered.filter(t => 
        t.nome?.toLowerCase().includes(searchLower) ||
        t.id?.toString().includes(searchLower)
      );
    }
    
    // Aplicar ordenação
    filtered.sort((a, b) => {
      let aVal: any = a[sortColumnTermosModal as keyof typeof a];
      let bVal: any = b[sortColumnTermosModal as keyof typeof b];
      
      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      
      const comparison = aVal < bVal ? -1 : 1;
      return sortDirectionTermosModal === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  }, [termosSistema, searchTermosModal, sortColumnTermosModal, sortDirectionTermosModal]);

  // Paginar termos
  const paginatedTermos = React.useMemo(() => {
    const startIndex = (pageTermosModal - 1) * limitTermosModal;
    return filteredTermos.slice(startIndex, startIndex + limitTermosModal);
  }, [filteredTermos, pageTermosModal, limitTermosModal]);

  // Criar paginação manual para client-side
  const paginationTermos = {
    from: (pageTermosModal - 1) * limitTermosModal + 1,
    to: Math.min(pageTermosModal * limitTermosModal, filteredTermos.length),
    total: filteredTermos.length,
    current_page: pageTermosModal,
    last_page: Math.ceil(filteredTermos.length / limitTermosModal)
  };

  // Definir colunas da tabela de termos
  const columnsTermos = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      render: (termo: any) => termo.id
    },
    {
      key: 'nome',
      label: 'Nome',
      sortable: true,
      render: (termo: any) => termo.nome
    },
    {
      key: 'ativo',
      label: 'Status',
      sortable: true,
      render: (termo: any) => (
        <span className={`badge ${termo.ativo ? 'bg-success' : 'bg-secondary'}`}>
          {termo.ativo ? 'Ativo' : 'Inativo'}
        </span>
      )
    }
  ];
  const { data: planosData } = usePlanos();
  const { data: bancosData } = useBancos();
  const { data: modelosContratoData } = useQuery({
    queryKey: ['modelos-contrato'],
    queryFn: () => DocumentoSistemaService.getByType('contrato'),
    enabled: show,
  });
  
  const planos = Array.isArray(planosData) ? planosData : (planosData?.data || []);
  const bancos = Array.isArray(bancosData) ? bancosData : (bancosData?.data || []);
  const modelosContrato = modelosContratoData?.data || [];
  
  // Hooks para termos
  const { data: termosData, isLoading: isLoadingTermosContrato, refetch: refetchTermos } = useTermosContrato(contratoId || 0);
  const createTermoMutation = useCreateTermoContrato();
  const updateTermoMutation = useUpdateTermoContrato();
  const deactivateTermoMutation = useDeactivateTermoContrato();
  const deleteTermoMutation = useDeleteTermoContrato();

  // Garantir que termosData seja sempre um array
  const termosArray = Array.isArray(termosData) ? termosData : [];
  
  // Buscar dados do contrato
  const { data: contratoData, isLoading } = useQuery({
    queryKey: ['contrato', contratoId],
    queryFn: async () => {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/contratos/${contratoId}`);
      if (!response.ok) throw new Error('Erro ao buscar contrato');
      return response.json();
    },
    enabled: !!contratoId,
    staleTime: 60 * 1000,
    refetchOnMount: false,
  });

  // Buscar títulos/financeiros do contrato
  const { data: titulosData, isLoading: isLoadingTitulos, refetch: refetchTitulos } = useQuery({
    queryKey: ['titulos', 'contrato', contratoId],
    queryFn: async () => {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/titulos/contrato/${contratoId}`);
      if (!response.ok) throw new Error('Erro ao buscar títulos');
      return response.json();
    },
    enabled: !!contratoId,
    staleTime: 30 * 1000,
    refetchOnMount: false,
  });

  // Mutation para atualizar contrato
  const updateContratoMutation = useUpdateContrato();

  // Dados iniciais do formulário
  const initialFormData: ContratoForm = {
    plano_id: 0,
    desconto_percentual: 0,
    desconto_valor: 0,
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: '',
    status: 'ativo',
    observacoes: '',
    isento_mensalidade: false,
    dia_vencimento: 10,
    conta_boleto: 0,
    data_validade_desconto: '',
    modelo_contrato_id: 0
  };

  // Dados customizados do contrato (quando editando)
  const customFormData = contratoData && typeof contratoData === 'object' && contratoData.id ? {
    plano_id: contratoData.plano_id || 0,
    desconto_percentual: parseFloat(contratoData.desconto_percentual) || 0,
    desconto_valor: parseFloat(contratoData.desconto_valor) || 0,
    data_inicio: contratoData.data_inicio ? contratoData.data_inicio.split('T')[0] : '',
    data_fim: contratoData.data_fim ? contratoData.data_fim.split('T')[0] : '',
    status: contratoData.status || 'ativo',
    observacoes: contratoData.observacoes || '',
    isento_mensalidade: contratoData.isento_mensalidade || false,
    dia_vencimento: contratoData.dia_vencimento || 10,
    conta_boleto: contratoData.conta_boleto || 0,
    data_validade_desconto: contratoData.data_validade_desconto ? contratoData.data_validade_desconto.split('T')[0] : '',
    modelo_contrato_id: contratoData.modelo_contrato_id || 0
  } : undefined;

  // Usar hook personalizado para reset do formulário
  useFormReset({
    show,
    initialData: initialFormData,
    setFormData,
    setErrors,
    customData: customFormData
  });

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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.plano_id) {
      newErrors.plano_id = 'Plano é obrigatório';
    }

    if (!formData.modelo_contrato_id || formData.modelo_contrato_id === 0) {
      newErrors.modelo_contrato_id = 'Modelo de contrato é obrigatório';
    }

    if (!formData.dia_vencimento || formData.dia_vencimento === 0) {
      newErrors.dia_vencimento = 'Dia de vencimento é obrigatório';
    } else if (formData.dia_vencimento < 1 || formData.dia_vencimento > 31) {
      newErrors.dia_vencimento = 'Dia de vencimento deve estar entre 1 e 31';
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


  // Funções para impressão
  const handleImprimirSelecionados = () => {
    if (selectedItems.length === 0) return;
    const ids = selectedItems.map(item => item.id);
    const url = `${process.env.REACT_APP_API_URL?.replace('/api', '')}/boleto/web/multiplos?ids=${JSON.stringify(ids)}&print=true`;
    window.open(url, '_blank');
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
    const ids = titulosEmAberto.map((titulo: Titulo) => titulo.id);
    const url = `${process.env.REACT_APP_API_URL?.replace('/api', '')}/boleto/web/multiplos?ids=${JSON.stringify(ids)}&print=true`;
    window.open(url, '_blank');
  };

  // Bulk actions para títulos
  const bulkActions: Array<{
    label: string;
    action?: (selectedItems: Titulo[]) => void;
    variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info';
    disabled?: (selectedItems: Titulo[]) => boolean;
    dropdown?: {
      label: string;
      action: () => void;
    }[];
  }> = [
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
      }
    },
    {
      label: 'Receber',
      action: (selectedItems: Titulo[]) => {
        if (selectedItems.length > 0) {
          const item = selectedItems[0];
          setSelectedParcela(item);
          setShowReceberModal(true);
        }
      }
    },
    {
      label: 'Cancelar',
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
                } catch (err: any) {
                  console.error(`Erro ao cancelar título ${item.id}:`, err);
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
              
              // Recarregar dados
              queryClient.invalidateQueries({ queryKey: ['titulos', 'contrato', contratoId] });
            } catch (err: any) {
              error('Erro ao cancelar títulos');
            }
          }
        }
      }
    },
    {
      label: 'Estornar',
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
                queryClient.invalidateQueries({ queryKey: ['titulos', 'contrato', contratoId] });
              } catch (err: any) {
                error(err.message || 'Erro ao estornar título.');
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
      label: 'Imprimir',
      variant: 'primary',
      dropdown: [
        {
          label: `Imprimir Selecionados (${selectedItems.length})`,
          action: handleImprimirSelecionados
        },
        {
          label: 'Imprimir Todos em Aberto',
          action: handleImprimirTodosEmAberto
        }
      ]
    }
  ];

  // Bulk actions para termos
  const termosBulkActions: Array<{
    label: string;
    action?: (selectedItems: any[]) => void;
    variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info';
    disabled?: (selectedItems: any[]) => boolean;
    dropdown?: {
      label: string;
      action: () => void;
    }[];
  }> = [
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
      action: (selectedItems: any[]) => {
        if (selectedItems.length > 0) {
          const termo = selectedItems[0];
          setEditingTermo(termo);
          setTermoFormData({
            assinado: termo.assinado,
            termoCadastradoId: termo.modelo_termo_id || 0
          });
          setShowTermoModal(true);
        }
      }
    },
    {
      label: 'Deletar',
      variant: 'danger',
      action: async (selectedItems: any[]) => {
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
              queryClient.invalidateQueries({ queryKey: ['termos-contrato', contratoId] });
            } catch (err: any) {
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
        if (selectedTermosItems.length > 0) {
          const termo = selectedTermosItems[0];
          if (termo.modelo_termo_id && contratoId) {
            setIsGeneratingPdf(true);
            try {
              const blob = await ModeloTermoService.generatePdfWithContrato(termo.modelo_termo_id, contratoId);
              const url = window.URL.createObjectURL(blob);
              setPdfUrl(url);
              setShowPreview(true);
            } catch (error: any) {
              console.error('Erro ao gerar PDF:', error);
              error('Erro ao gerar documento para impressão');
            } finally {
              setIsGeneratingPdf(false);
            }
          }
        }
      }
    }
  ];

  // Colunas para o DataTable
  const columns = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      render: (item: Titulo) => item.id
    },
    {
      key: 'status',
      label: 'Status',
      render: (item: Titulo) => {
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
      render: (item: Titulo) => {
        return item.plano?.nome_plano || '-';
      }
    },
    {
      key: 'numero_titulo',
      label: 'Nº Título',
      render: (item: Titulo) => {
        return item.numero_titulo || '-';
      }
    },
    {
      key: 'data_vencimento',
      label: 'Vencimento',
      render: (item: Titulo) => {
        return new Date(item.data_vencimento).toLocaleDateString('pt-BR');
      }
    },
    {
      key: 'valor',
      label: 'Valor',
      render: (item: Titulo) => {
        return `R$ ${Number(item.valor || 0).toFixed(2)}`;
      }
    },
    {
      key: 'valor_pago',
      label: 'Valor baixado',
      render: (item: Titulo) => {
        return item.status === 'pago' ? `R$ ${Number(item.valor_pago || item.valor || 0).toFixed(2)}` : 'R$ 0,00';
      }
    },
    {
      key: 'valor_aberto',
      label: 'Valor aberto',
      render: (item: Titulo) => {
        return (item.status === 'pago' || item.status === 'cancelado') ? 'R$ 0,00' : `R$ ${Number(item.valor || 0).toFixed(2)}`;
      }
    },
    {
      key: 'data_pagamento',
      label: 'Data Pagamento',
      render: (item: Titulo) => {
        return item.data_pagamento ? new Date(item.data_pagamento).toLocaleDateString('pt-BR') : '-';
      }
    },
    {
      key: 'charge_id',
      label: 'Charge ID',
      render: (item: Titulo) => {
        return item.charge_id || '-';
      }
    }
  ];

  // Colunas para o DataTable de termos
  const termosColumns = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
    },
    {
      key: 'assinado',
      label: 'Assinado',
      sortable: true,
      render: (item: any) => {
        return (
          <span className={`badge ${item.assinado === 'SIM' ? 'bg-success' : 'bg-secondary'}`}>
            {item.assinado}
          </span>
        );
      }
    },
    {
      key: 'data_aceite',
      label: 'Data Aceite',
      sortable: true,
      render: (item: any) => {
        return item.data_aceite ? new Date(item.data_aceite).toLocaleDateString('pt-BR') : '-';
      }
    },
    {
      key: 'aceito_por',
      label: 'Aceito Por',
      sortable: true,
      render: (item: any) => {
        return item.aceito_por || '-';
      }
    },
    {
      key: 'ativo',
      label: 'Status',
      sortable: true,
      render: (item: any) => {
        return (
          <span className={`badge ${item.ativo ? 'bg-success' : 'bg-secondary'}`}>
            {item.ativo ? 'Ativo' : 'Inativo'}
          </span>
        );
      }
    },
    {
      key: 'created_at',
      label: 'Criado em',
      sortable: true,
      render: (item: any) => {
        return new Date(item.created_at).toLocaleDateString('pt-BR');
      }
    }
  ];

  // Funções para filtrar e paginar dados dos títulos
  const getFilteredData = () => {
    if (!titulosData?.data) return [];
    
    let allData = titulosData.data;

    // Filtro para mostrar/ocultar cancelados
    if (!showCancelados) {
      allData = allData.filter((titulo: Titulo) => titulo.status !== 'cancelado');
    }

    // Aplicar filtro de busca
    if (search.trim()) {
      const searchTerm = search.toLowerCase().trim();
      return allData.filter((titulo: Titulo) => {
        const id = titulo.id?.toString() || '';
        const numeroTitulo = titulo.numero_titulo || '';
        const valor = titulo.valor?.toString() || '';
        const status = titulo.status || '';
        const plano = titulo.plano?.nome_plano?.toLowerCase() || '';
        
        return (
          id.includes(searchTerm) ||
          numeroTitulo.toLowerCase().includes(searchTerm) ||
          valor.includes(searchTerm) ||
          status.toLowerCase().includes(searchTerm) ||
          plano.includes(searchTerm)
        );
      });
    }

    return allData;
  };

  // Funções para filtrar e paginar dados dos termos
  const getFilteredTermosData = () => {
    if (!termosArray) return [];
    
    let allData = [...termosArray];

    // Filtro para mostrar/ocultar inativos
    if (!showInativos) {
      allData = allData.filter((termo: any) => termo.ativo);
    }

    // Aplicar filtro de busca
    if (searchTermos.trim()) {
      const searchTerm = searchTermos.toLowerCase().trim();
      return allData.filter((termo: any) => {
        const id = termo.id?.toString() || '';
        const tipoTermo = termo.tipo_termo || '';
        const aceitoPor = termo.aceito_por || '';
        
        return (
          id.includes(searchTerm) ||
          tipoTermo.toLowerCase().includes(searchTerm) ||
          aceitoPor.toLowerCase().includes(searchTerm)
        );
      });
    }

    return allData;
  };

  const filteredData = getFilteredData();
  const filteredTermosData = getFilteredTermosData();

  const sortedData = [...filteredData].sort((a: Titulo, b: Titulo) => {
    if (!sortColumn) return 0;
    const aVal = a[sortColumn as keyof Titulo] ?? '';
    const bVal = b[sortColumn as keyof Titulo] ?? '';
    
    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const sortedTermosData = [...filteredTermosData].sort((a: any, b: any) => {
    if (!sortColumn) return 0;
    const aVal = a[sortColumn] ?? '';
    const bVal = b[sortColumn] ?? '';
    
    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const paginatedData = sortedData.slice((page - 1) * limit, page * limit);
  const paginatedTermosData = sortedTermosData.slice((page - 1) * limit, page * limit);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await updateContratoMutation.mutateAsync({
        id: contratoId!,
        ...formData
      });

      // Notificação removida - não mostrar ao salvar automaticamente
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      queryClient.invalidateQueries({ queryKey: ['cliente', contratoData?.data?.cliente_id] });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      error(err.response?.data?.message || 'Erro ao atualizar contrato');
    }
  };

  if (isLoading) {
    return (
      <DraggableModal
        show={show}
        onClose={onClose}
        title="Carregando..."
        size="lg"
        modalId="contrato-edit-modal-loading"
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
      title={`Contrato - ${contratoData?.plano?.nome_plano || 'Carregando...'}`}
      size="xl"
      modalId="contrato-edit-modal"
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
            form="contrato-edit-form"
            className="btn btn-primary btn-sm"
            disabled={updateContratoMutation.isPending}
          >
            Salvar
          </button>
        </div>
      }
    >
      <form id="contrato-edit-form" onSubmit={handleSubmit}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Navegação por Abas */}
          <ul className="nav nav-tabs" id="contratoTab" role="tablist">
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
                onClick={() => setActiveTab('termos')}
              >
                Termos
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'financeiro' ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveTab('financeiro')}
              >
                Financeiro
              </button>
            </li>
          </ul>

          {/* Conteúdo das Abas */}
          <div className="tab-content" style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
            {/* Aba Contrato */}
            {activeTab === 'contrato' && (
              <div className="row">
          {/* Plano */}
          <div className="col-md-6 mb-3">
            <label htmlFor="plano_id" className="form-label">Plano *</label>
            <select
              id="plano_id"
              name="plano_id"
              className={`form-select ${errors.plano_id ? 'is-invalid' : ''}`}
              value={formData.plano_id}
              onChange={(e) => handleInputChange('plano_id', parseInt(e.target.value))}
            >
              <option value={0}>Selecione um plano</option>
              {planos.map((plano: Plano) => (
                <option key={plano.id} value={plano.id}>
                  {plano.nome_plano}
                </option>
              ))}
            </select>
            {errors.plano_id && <div className="invalid-feedback">{errors.plano_id}</div>}
          </div>

          {/* Status */}
          <div className="col-md-6 mb-3">
            <label htmlFor="status" className="form-label">Status *</label>
            <select
              id="status"
              name="status"
              className={`form-select ${errors.status ? 'is-invalid' : ''}`}
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value as 'ativo' | 'inativo' | 'suspenso')}
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
              <option value="suspenso">Suspenso</option>
            </select>
            {errors.status && <div className="invalid-feedback">{errors.status}</div>}
          </div>

          {/* Data de Início */}
          <div className="col-md-6 mb-3">
            <label htmlFor="data_inicio" className="form-label">Data de Início *</label>
            <input
              type="date"
              id="data_inicio"
              name="data_inicio"
              className={`form-control ${errors.data_inicio ? 'is-invalid' : ''}`}
              value={formData.data_inicio}
              onChange={(e) => handleInputChange('data_inicio', e.target.value)}
            />
            {errors.data_inicio && <div className="invalid-feedback">{errors.data_inicio}</div>}
          </div>

          {/* Data de Fim */}
          <div className="col-md-6 mb-3">
            <label htmlFor="data_fim" className="form-label">Data de Fim</label>
            <input
              type="date"
              id="data_fim"
              name="data_fim"
              className="form-control"
              value={formData.data_fim}
              onChange={(e) => handleInputChange('data_fim', e.target.value)}
            />
          </div>

          {/* Dia de Vencimento */}
          <div className="col-md-6 mb-3">
            <label htmlFor="dia_vencimento" className="form-label">Dia de Vencimento *</label>
            <input
              type="number"
              id="dia_vencimento"
              name="dia_vencimento"
              className={`form-control ${errors.dia_vencimento ? 'is-invalid' : ''}`}
              value={formData.dia_vencimento}
              onChange={(e) => handleInputChange('dia_vencimento', parseInt(e.target.value))}
              min="1"
              max="31"
            />
            {errors.dia_vencimento && <div className="invalid-feedback">{errors.dia_vencimento}</div>}
          </div>

          {/* Banco para Boleto */}
          <div className="col-md-6 mb-3">
            <label htmlFor="conta_boleto" className="form-label">Banco para Boleto *</label>
            <select
              id="conta_boleto"
              name="conta_boleto"
              className={`form-select ${errors.conta_boleto ? 'is-invalid' : ''}`}
              value={formData.conta_boleto}
              onChange={(e) => handleInputChange('conta_boleto', parseInt(e.target.value))}
            >
              <option value={0}>Selecione um banco</option>
              {bancos.map((banco: any) => (
                <option key={banco.id} value={banco.id}>
                  {banco.nome}
                </option>
              ))}
            </select>
            {errors.conta_boleto && <div className="invalid-feedback">{errors.conta_boleto}</div>}
          </div>

          {/* Desconto Percentual */}
          <div className="col-md-6 mb-3">
            <label htmlFor="desconto_percentual" className="form-label">Desconto Percentual (%)</label>
            <input
              type="number"
              id="desconto_percentual"
              name="desconto_percentual"
              className={`form-control ${errors.desconto_percentual ? 'is-invalid' : ''}`}
              value={formData.desconto_percentual}
              onChange={(e) => handleInputChange('desconto_percentual', parseFloat(e.target.value) || 0)}
              min="0"
              max="100"
              step="0.01"
            />
            {errors.desconto_percentual && <div className="invalid-feedback">{errors.desconto_percentual}</div>}
          </div>

          {/* Desconto Valor */}
          <div className="col-md-6 mb-3">
            <label htmlFor="desconto_valor" className="form-label">Desconto Valor (R$)</label>
            <input
              type="number"
              id="desconto_valor"
              name="desconto_valor"
              className={`form-control ${errors.desconto_valor ? 'is-invalid' : ''}`}
              value={formData.desconto_valor}
              onChange={(e) => handleInputChange('desconto_valor', parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
            />
            {errors.desconto_valor && <div className="invalid-feedback">{errors.desconto_valor}</div>}
          </div>

          {/* Data Validade Desconto */}
          <div className="col-md-6 mb-3">
            <label htmlFor="data_validade_desconto" className="form-label">Data Validade Desconto</label>
            <input
              type="date"
              id="data_validade_desconto"
              name="data_validade_desconto"
              className="form-control"
              value={formData.data_validade_desconto}
              onChange={(e) => handleInputChange('data_validade_desconto', e.target.value)}
            />
          </div>

          {/* Isento Mensalidade */}
          <div className="col-md-6 mb-3">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="isento_mensalidade"
                name="isento_mensalidade"
                checked={formData.isento_mensalidade}
                onChange={(e) => handleInputChange('isento_mensalidade', e.target.checked)}
              />
              <label className="form-check-label" htmlFor="isento_mensalidade">
                Isento de Mensalidade
              </label>
            </div>
          </div>

          {/* Modelo de Contrato */}
          <div className="col-md-12 mb-3">
            <label htmlFor="modelo_contrato_id" className="form-label small">Modelo de Contrato *</label>
            <select
              className={`form-select ${errors.modelo_contrato_id ? 'is-invalid' : ''}`}
              id="modelo_contrato_id"
              name="modelo_contrato_id"
              value={formData.modelo_contrato_id || 0}
              onChange={(e) => handleInputChange('modelo_contrato_id', parseInt(e.target.value))}
              disabled={updateContratoMutation.isPending}
            >
              <option value={0}>Selecione um modelo</option>
              {modelosContrato.map((modelo: any) => (
                <option key={modelo.id} value={modelo.id}>
                  {modelo.id} - {modelo.nome}
                </option>
              ))}
            </select>
            {errors.modelo_contrato_id && <div className="invalid-feedback">{errors.modelo_contrato_id}</div>}
            <small className="form-text text-muted">
              Selecione um modelo de contrato cadastrado no sistema
            </small>
          </div>

          {/* Observações */}
          <div className="col-12 mb-3">
            <label htmlFor="observacoes" className="form-label">Observações</label>
            <textarea
              id="observacoes"
              name="observacoes"
              className="form-control"
              rows={3}
              value={formData.observacoes}
              onChange={(e) => handleInputChange('observacoes', e.target.value)}
            />
          </div>
        </div>

            )}

        {/* Aba Termos */}
        {activeTab === 'termos' && (
          <div className="row">
            <div className="col-12">
              {/* Cabeçalho fixo - não rola */}
              <div style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-primary)', zIndex: 10, paddingBottom: '1rem' }}>
                {/* Botões de Ação - Linha 1 */}
                <div className="d-flex justify-content-start mb-3">
                  <div className="d-flex" style={{ gap: '8px', paddingLeft: '1rem' }}>
                    {termosBulkActions.map((bulkAction, index) => {
                      // Botão "Novo" sempre habilitado, outros apenas quando há seleção
                      const isNewButton = bulkAction.label === 'Novo';
                      const isImprimirButton = bulkAction.label === 'Imprimir';
                      const hasSelection = selectedTermosItems.length > 0;
                      const selectedItem = hasSelection ? selectedTermosItems[0] : null;
                      
                      // Lógica de desabilitação baseada no status
                      let isDisabled = !isNewButton && !isImprimirButton && !hasSelection;
                      
                      if (hasSelection && selectedItem) {
                        if (bulkAction.label === 'Editar' && !selectedItem.ativo) {
                          isDisabled = true; // Não pode editar termo inativo
                        }
                        if (bulkAction.label === 'Deletar' && !selectedItem.ativo) {
                          isDisabled = true; // Não pode deletar termo já inativo
                        }
                      }

                      // Usar a função disabled do bulkAction se existir
                      if (bulkAction.disabled) {
                        isDisabled = isDisabled || bulkAction.disabled(selectedTermosItems);
                      }

                      // Se tem dropdown, renderizar dropdown
                      if (bulkAction.dropdown) {
                        return (
                          <div key={index} className="dropdown" style={{ flexShrink: 0, position: 'relative' }}>
                            <button
                              className={`btn btn-sm btn-${bulkAction.variant || 'primary'} dropdown-toggle`}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setOpenDropdown(openDropdown === index ? null : index);
                              }}
                            >
                              {bulkAction.label}
                              <i className="bi bi-chevron-down ms-1"></i>
                            </button>
                            {openDropdown === index && (
                              <div 
                                className="dropdown-menu show" 
                                style={{ 
                                  position: 'absolute', 
                                  top: '100%', 
                                  left: 0, 
                                  zIndex: 1050,
                                  display: 'block',
                                  minWidth: '200px'
                                }}
                              >
                                {bulkAction.dropdown.map((item: { label: string; action: () => void }, itemIndex: number) => (
                                  <button
                                    key={itemIndex}
                                    className="dropdown-item"
                                    onClick={() => {
                                      item.action();
                                      setOpenDropdown(null);
                                    }}
                                    style={{ display: 'block', width: '100%', textAlign: 'left' }}
                                  >
                                    {item.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }

                      // Botão normal
                      return (
                        <button
                          key={index}
                          className="btn btn-sm btn-primary"
                          onClick={(event) => {
                            if (!isDisabled && bulkAction.action) {
                              bulkAction.action(selectedTermosItems);
                            }
                          }}
                          disabled={isDisabled}
                          style={{ flexShrink: 0 }}
                        >
                          {isImprimirButton && isGeneratingPdf ? 'Gerando...' : bulkAction.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Busca, Filtros e Paginação - Linha 2 */}
                <div className="d-flex mb-3">
                  {/* Busca à esquerda */}
                  <div className="d-flex gap-2" style={{ paddingLeft: '1rem' }}>
                    <input
                      type="text"
                      id="termos-search"
                      name="termosSearch"
                      className="form-control form-control-sm"
                      placeholder="Buscar por tipo, conteúdo..."
                      value={searchTermos}
                      onChange={(e) => {
                        e.stopPropagation();
                        setSearchTermos(e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{ width: '300px', height: '32px' }}
                    />
                  </div>

                  {/* Filtros após a busca */}
                  <div className="d-flex gap-3 align-items-center" style={{ paddingLeft: '1rem' }}>
                    <div className="form-check">
                      <input 
                        className="form-check-input" 
                        type="checkbox" 
                        id="showInactive"
                        name="showInactive"
                        checked={showInativos}
                        onChange={(e) => {
                          e.stopPropagation();
                          setShowInativos(e.target.checked);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <label className="form-check-label small" htmlFor="showInactive">
                        Mostrar inativos
                      </label>
                    </div>
                  </div>

                  {/* Paginação à direita */}
                  <div className="d-flex gap-2" style={{ marginLeft: 'auto' }}>
                    {/* Seletor de linhas por página */}
                    <select 
                      id="termos-limit"
                      name="termosLimit"
                      className="form-select form-select-sm" 
                      value={limit}
                      onChange={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setLimit(parseInt(e.target.value));
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{ width: '80px', height: '32px', cursor: 'pointer' }}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>

                    {/* Paginação compacta */}
                    <div className="d-flex gap-1">
                      <button 
                        className="btn btn-outline-secondary btn-sm" 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setPage(1);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        disabled={page <= 1}
                        style={{ height: '32px', width: '32px', padding: '0' }}
                      >
                        <i className="bi bi-chevron-double-left"></i>
                      </button>
                      <button 
                        className="btn btn-outline-secondary btn-sm" 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setPage(Math.max(1, page - 1));
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        disabled={page <= 1}
                        style={{ height: '32px', width: '32px', padding: '0' }}
                      >
                        <i className="bi bi-chevron-left"></i>
                      </button>
                      
                      <span className="d-flex align-items-center px-2 small text-muted" style={{ height: '32px' }}>
                        {sortedTermosData.length > 0 ? (page - 1) * limit + 1 : 0} - {Math.min(page * limit, sortedTermosData.length)} / {sortedTermosData.length}
                      </span>
                      
                      <button 
                        className="btn btn-outline-secondary btn-sm" 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setPage(Math.min(Math.ceil(sortedTermosData.length / limit), page + 1));
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        disabled={page >= Math.ceil(sortedTermosData.length / limit)}
                        style={{ height: '32px', width: '32px', padding: '0' }}
                      >
                        <i className="bi bi-chevron-right"></i>
                      </button>
                      <button 
                        className="btn btn-outline-secondary btn-sm" 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setPage(Math.ceil(sortedTermosData.length / limit));
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        disabled={page >= Math.ceil(sortedTermosData.length / limit)}
                        style={{ height: '32px', width: '32px', padding: '0' }}
                      >
                        <i className="bi bi-chevron-double-right"></i>
                      </button>
                    </div>

                    {/* Botão de refresh */}
                    <button 
                      className="btn btn-outline-secondary btn-sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        refetchTermos();
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      title="Recarregar dados"
                    >
                      <i className="bi bi-arrow-clockwise"></i>
                    </button>
                  </div>
                </div>
              </div>

              {/* Conteúdo rolável - apenas a tabela */}
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <DataTable
                  data={paginatedTermosData}
                  columns={termosColumns}
                  isLoading={isLoadingTermosContrato}
                  showHeader={false}
                  onSelectionChange={setSelectedTermosItems}
                  onSort={(column: string, direction: 'asc' | 'desc') => {
                    setSortColumn(column);
                    setSortDirection(direction);
                  }}
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  limit={limit}
                  setLimit={setLimit}
                  setPage={setPage}
                  emptyMessage="Este contrato ainda não possui termos cadastrados."
                />
              </div>
            </div>
          </div>
        )}

            {/* Aba Financeiro */}
          {activeTab === 'financeiro' && (
            <div className="row">
              <div className="col-12">
                {/* Cabeçalho fixo - não rola */}
                <div style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-primary)', zIndex: 10, paddingBottom: '1rem' }}>
                  {/* Botões de Ação - Linha 1 */}
                  <div className="d-flex justify-content-start mb-3">
                    <div className="d-flex" style={{ gap: '8px', paddingLeft: '1rem' }}>
                      {bulkActions.map((bulkAction, index) => {
                        // Botão "Novo" sempre habilitado, outros apenas quando há seleção
                        const isNewButton = bulkAction.label === 'Novo';
                        const hasSelection = selectedItems.length > 0;
                        const selectedItem = hasSelection ? selectedItems[0] : null;
                        
                        // Lógica de desabilitação baseada no status
                        let isDisabled = !isNewButton && !hasSelection;
                        
                        if (hasSelection && selectedItem) {
                          if (bulkAction.label === 'Receber' && selectedItem.status === 'pago') {
                            isDisabled = true; // Não pode receber título já pago
                          }
                          if (bulkAction.label === 'Cancelar' && selectedItem.status === 'pago') {
                            isDisabled = true; // Não pode cancelar título pago
                          }
                          if (bulkAction.label === 'Cancelar' && selectedItem.status === 'cancelado') {
                            isDisabled = true; // Não pode cancelar título já cancelado
                          }
                          if (bulkAction.label === 'Receber' && selectedItem.status === 'cancelado') {
                            isDisabled = true; // Não pode receber título cancelado
                          }
                        }
                        
                        // Usar a função disabled do bulkAction se existir
                        if (bulkAction.disabled) {
                          isDisabled = isDisabled || bulkAction.disabled(selectedItems);
                        }
                        
                        // Se tem dropdown, renderizar dropdown
                        if (bulkAction.dropdown) {
                          return (
                            <div key={index} className="dropdown" style={{ flexShrink: 0, position: 'relative' }}>
                              <button
                                className={`btn btn-sm btn-${bulkAction.variant || 'primary'} dropdown-toggle`}
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setOpenDropdown(openDropdown === index ? null : index);
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                              >
                                {bulkAction.label}
                                <i className="bi bi-chevron-down ms-1"></i>
                              </button>
                              {openDropdown === index && (
                                <ul 
                                  className="dropdown-menu show" 
                                  style={{ position: 'absolute', top: '100%', left: 0, zIndex: 1050 }}
                                >
                                  {bulkAction.dropdown.map((item, itemIndex) => (
                                    <li key={itemIndex}>
                                      <button
                                        className="dropdown-item"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          item.action();
                                          setOpenDropdown(null);
                                        }}
                                      >
                                        {item.label}
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          );
                        }
                        
                        // Botão normal
                        return (
                          <button
                            key={index}
                            className="btn btn-sm btn-primary"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (!isDisabled && bulkAction.action) {
                                bulkAction.action(selectedItems);
                              }
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            disabled={isDisabled}
                            style={{ flexShrink: 0 }}
                          >
                            {bulkAction.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Busca, Filtros e Paginação - Linha 2 */}
                  <div className="d-flex mb-3">
                    {/* Busca à esquerda */}
                    <div className="d-flex gap-2" style={{ paddingLeft: '1rem' }}>
                      <input
                        type="text"
                        id="contrato-search"
                        name="contratoSearch"
                        className="form-control form-control-sm"
                        placeholder="Buscar por ID, carnê, valor..."
                        value={search}
                        onChange={(e) => {
                          e.stopPropagation();
                          setSearch(e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: '300px', height: '32px' }}
                      />
                    </div>

                    {/* Filtros após a busca */}
                    <div className="d-flex gap-3 align-items-center" style={{ paddingLeft: '1rem' }}>
                      <div className="form-check">
                        <input 
                          className="form-check-input" 
                          type="checkbox" 
                          id="showCanceled"
                          name="showCanceled"
                          checked={showCancelados}
                          onChange={(e) => {
                            e.stopPropagation();
                            setShowCancelados(e.target.checked);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <label className="form-check-label small" htmlFor="showCanceled">
                          Mostrar cancelados
                        </label>
                      </div>
                    </div>

                    {/* Paginação à direita */}
                    <div className="d-flex gap-2" style={{ marginLeft: 'auto' }}>
                      {/* Seletor de linhas por página */}
                      <select 
                        id="titulos-limit"
                        name="titulosLimit"
                        className="form-select form-select-sm" 
                        value={limit}
                        onChange={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setLimit(parseInt(e.target.value));
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        style={{ width: '80px', height: '32px', cursor: 'pointer' }}
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>

                      {/* Paginação compacta */}
                      <div className="d-flex gap-1">
                        <button 
                          className="btn btn-outline-secondary btn-sm" 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setPage(1);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          disabled={page <= 1}
                        >
                          <i className="bi bi-chevron-double-left"></i>
                        </button>
                        <button 
                          className="btn btn-outline-secondary btn-sm" 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setPage(page - 1);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          disabled={page <= 1}
                        >
                          <i className="bi bi-chevron-left"></i>
                        </button>
                        <span className="small text-muted mx-2">
                          {sortedData.length > 0 ? (page - 1) * limit + 1 : 0} - {Math.min(page * limit, sortedData.length)} / {sortedData.length}
                        </span>
                        <button 
                          className="btn btn-outline-secondary btn-sm" 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setPage(page + 1);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          disabled={page >= Math.ceil(sortedData.length / limit)}
                        >
                          <i className="bi bi-chevron-right"></i>
                        </button>
                        <button 
                          className="btn btn-outline-secondary btn-sm" 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setPage(Math.ceil(sortedData.length / limit));
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          disabled={page >= Math.ceil(sortedData.length / limit)}
                        >
                          <i className="bi bi-chevron-double-right"></i>
                        </button>
                      </div>

                      {/* Botão de refresh */}
                      <button 
                        className="btn btn-outline-secondary btn-sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          refetchTitulos();
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        title="Recarregar dados"
                      >
                        <i className="bi bi-arrow-clockwise"></i>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Conteúdo rolável - apenas a tabela */}
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <DataTable
                    data={paginatedData}
                    columns={columns}
                    isLoading={isLoadingTitulos}
                    showHeader={false}
                    onSelectionChange={setSelectedItems}
                    onSort={(column: string, direction: 'asc' | 'desc') => {
                      setSortColumn(column);
                      setSortDirection(direction);
                    }}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    limit={limit}
                    setLimit={setLimit}
                    setPage={setPage}
                    emptyMessage="Este contrato ainda não possui títulos cadastrados."
                  />
                </div>

                {/* Resumo Financeiro */}
                {sortedData.length > 0 && (
                  <div className="d-flex justify-content-between align-items-center mt-3 p-3 bg-light rounded">
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
        </div>
      </div>

      {/* Modais */}
      <TituloCreateModal
        show={showTituloCreateModal}
        clienteId={contratoData?.cliente_id}
        contratoId={contratoId ?? undefined}
        onClose={() => setShowTituloCreateModal(false)}
        onSuccess={() => {
          setShowTituloCreateModal(false);
          
          // Invalidar query específica do contrato
          queryClient.invalidateQueries({ queryKey: ['titulos', 'contrato', contratoId] });
          
          // Invalidar query de títulos do cliente
          if (contratoData?.cliente_id) {
            queryClient.invalidateQueries({ queryKey: ['titulos', { cliente_id: contratoData.cliente_id }] });
          }
          
          // Invalidar todas as queries de títulos para garantir
          queryClient.invalidateQueries({ queryKey: ['titulos'] });
          
          // Refetch imediatamente
          refetchTitulos();
        }}
      />

      <TituloEditModal
        show={showTituloEditModal}
        parcelaId={selectedTituloId || 0}
        onClose={() => {
          setShowTituloEditModal(false);
          setSelectedTituloId(null);
        }}
        onSuccess={() => {
          setShowTituloEditModal(false);
          setSelectedTituloId(null);
          queryClient.invalidateQueries({ queryKey: ['titulos', 'contrato', contratoId] });
        }}
      />
      </form>

      <TituloCreateModal
        show={showTituloCreateModal}
        onClose={() => setShowTituloCreateModal(false)}
        contratoId={contratoId!}
        onSuccess={() => {
          setShowTituloCreateModal(false);
          refetchTitulos();
        }}
      />

      <TituloEditModal
        show={showTituloEditModal}
        onClose={() => {
          setShowTituloEditModal(false);
          setSelectedTituloId(null);
        }}
        parcelaId={selectedTituloId!}
        onSuccess={() => {
          setShowTituloEditModal(false);
          setSelectedTituloId(null);
          refetchTitulos();
        }}
      />

      <ReceberModal
        isOpen={showReceberModal}
        parcela={selectedParcela}
        onClose={() => {
          setShowReceberModal(false);
          setSelectedParcela(null);
        }}
      />

      {/* Modal para criar/editar termo */}
      <DraggableModal
        show={showTermoModal}
        onClose={() => {
          setShowTermoModal(false);
          setEditingTermo(null);
        }}
        title={editingTermo ? "Editar Termo" : "Novo Termo"}
        size="lg"
      >
        <form onSubmit={async (e) => {
          e.preventDefault();
          try {
            // Validação no frontend
            if (!termoFormData.termoCadastradoId || termoFormData.termoCadastradoId <= 0) {
              error('É obrigatório selecionar um modelo de termo cadastrado no sistema.');
              return;
            }
            
            if (editingTermo) {
              // Atualizar termo existente
              await updateTermoMutation.mutateAsync({
                id: editingTermo.id,
                data: {
                  modelo_termo_id: termoFormData.termoCadastradoId,
                  assinado: termoFormData.assinado
                }
              });
            } else {
              // Criar novo termo
              await createTermoMutation.mutateAsync({
                contratoId: contratoId!,
                data: {
                  modelo_termo_id: termoFormData.termoCadastradoId,
                  assinado: termoFormData.assinado
                }
              });
            }
            
            setShowTermoModal(false);
            setEditingTermo(null);
            setTermoFormData({
              assinado: 'NAO',
              termoCadastradoId: 0
            });
          } catch (error) {
            console.error('Erro ao criar termo:', error);
          }
        }}>
          <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label">Assinado</label>
                <div className="d-flex gap-3 mt-2">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="assinado"
                      id="assinadoSim"
                      value="SIM"
                      checked={termoFormData.assinado === 'SIM'}
                      onChange={() => setTermoFormData({ ...termoFormData, assinado: 'SIM' })}
                    />
                    <label className="form-check-label" htmlFor="assinadoSim">
                      Sim
                    </label>
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="assinado"
                      id="assinadoNao"
                      value="NAO"
                      checked={termoFormData.assinado === 'NAO'}
                      onChange={() => setTermoFormData({ ...termoFormData, assinado: 'NAO' })}
                    />
                    <label className="form-check-label" htmlFor="assinadoNao">
                      Não
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-3">
            {/* Campo de seleção de termo cadastrado */}
            <div className="mb-3">
              <label htmlFor="id_termo" className="form-label">
                Selecionar Termo Cadastrado
              </label>
                <div className="d-flex align-items-center gap-2">
                  {/* Input do ID */}
                  <input
                    type="text"
                    id="id_termo"
                    className="form-control"
                    style={{ width: '66px' }}
                    value={termoFormData.termoCadastradoId || ''}
                    onChange={(e) => {
                      const id = parseInt(e.target.value) || 0;
                      const termoSelecionado = termosSistema?.find((t: any) => t.id === id);
                      setTermoFormData({
                        ...termoFormData, 
                        termoCadastradoId: id
                      });
                    }}
                    placeholder="ID"
                    title="Digite o ID do termo"
                    autoComplete="off"
                  />
                  
                  {/* Input do Label */}
                  <input
                    type="text"
                    id="id_termo_label"
                    className="form-control"
                    value={termoFormData.termoCadastradoId > 0 ? 
                      termosSistema?.find((t: any) => t.id === termoFormData.termoCadastradoId)?.nome || '' : 
                      ''
                    }
                    placeholder="Nome do termo"
                    disabled
                    autoComplete="off"
                    style={{ cursor: 'auto' }}
                  />
                  
                  {/* Botão de busca */}
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    title="Abrir listagem de registros"
                    onClick={() => {
                      setShowSelecionarTermoModal(true);
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                    </svg>
                  </button>
                </div>
                
              </div>

            {/* Campo de conteúdo personalizado */}
          </div>
          

          <div className="d-flex justify-content-end gap-2 mt-4">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => {
                setShowTermoModal(false);
                setEditingTermo(null);
              }}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={createTermoMutation.isPending || updateTermoMutation.isPending}
            >
              {(createTermoMutation.isPending || updateTermoMutation.isPending) 
                ? 'Salvando...' 
                : (editingTermo ? 'Atualizar' : 'Salvar')
              }
            </button>
          </div>
        </form>
      </DraggableModal>

      {/* Modal para selecionar termo cadastrado */}
      <DraggableModal
        show={showSelecionarTermoModal}
        onClose={() => {
          setShowSelecionarTermoModal(false);
          setTermoSelecionado(null);
        }}
        title="Selecionar Termo Cadastrado"
        size="lg"
        modalId="selecionar-termo-modal"
        headerActions={
          <ModalHeaderActions
            bulkActions={[
              {
                label: 'Cancelar',
                variant: 'secondary',
                action: () => {
                  setShowSelecionarTermoModal(false);
                  setTermoSelecionado(null);
                }
              },
              {
                label: 'Inserir',
                variant: 'primary',
                disabled: () => !termoSelecionado,
                action: () => {
                  if (termoSelecionado) {
                    setTermoFormData({
                      ...termoFormData, 
                      termoCadastradoId: termoSelecionado.id
                    });
                    setShowSelecionarTermoModal(false);
                    setTermoSelecionado(null);
                  }
                }
              }
            ]}
            selectedItems={termoSelecionado ? [termoSelecionado] : []}
            search={searchTermosModal}
            onSearchChange={setSearchTermosModal}
            searchPlaceholder="Buscar termos..."
            limit={limitTermosModal}
            onLimitChange={setLimitTermosModal}
            pagination={paginationTermos}
            onPageChange={setPageTermosModal}
            onRefresh={() => {
              // Refetch dos termos do sistema
              queryClient.invalidateQueries({ queryKey: ['modelos-termo'] });
            }}
            idPrefix="selecionar-termo"
          />
        }
      >
        <div>
          <DataTable
            data={paginatedTermos}
            columns={columnsTermos}
            isLoading={isLoadingTermos}
            pagination={paginationTermos}
            limit={limitTermosModal}
            setLimit={setLimitTermosModal}
            setPage={setPageTermosModal}
            onSort={(column: string, direction: 'asc' | 'desc') => {
              setSortColumnTermosModal(column);
              setSortDirectionTermosModal(direction);
            }}
            sortColumn={sortColumnTermosModal}
            sortDirection={sortDirectionTermosModal}
            onSelectionChange={(selectedItems: any[]) => {
              // Permitir apenas uma seleção (como radio buttons)
              if (selectedItems.length > 1) {
                setTermoSelecionado(selectedItems[selectedItems.length - 1]);
              } else if (selectedItems.length === 1) {
                const currentItem = selectedItems[0];
                const currentTime = Date.now();
                
                // Verificar se é duplo clique (mesmo item clicado em menos de 300ms)
                if (lastClickedItem?.id === currentItem.id && (currentTime - lastClickTime) < 300) {
                  // Inserir termo ao clicar duas vezes
                  setTermoFormData({
                    ...termoFormData, 
                    termoCadastradoId: currentItem.id
                  });
                  setShowSelecionarTermoModal(false);
                  setTermoSelecionado(null);
                  setLastClickTime(0);
                  setLastClickedItem(null);
                } else {
                  setTermoSelecionado(currentItem);
                  setLastClickTime(currentTime);
                  setLastClickedItem(currentItem);
                }
              } else {
                setTermoSelecionado(null);
              }
            }}
            searchPlaceholder="Buscar termos..."
            emptyMessage="Nenhum termo encontrado"
            showHeader={false}
          />
        </div>
      </DraggableModal>

    </DraggableModal>

    {/* Modal de impressão */}
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
  );
};

export default ContratoEditModal;
