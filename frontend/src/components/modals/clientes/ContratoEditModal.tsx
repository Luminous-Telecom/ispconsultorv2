import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import { usePlanos } from '../../../hooks/usePlanos';
import { useBancos } from '../../../hooks/useBancos';
import { useUpdateContrato } from '../../../hooks/useContratos';
import { useTermosContrato, useDeleteTermoContrato } from '../../../hooks/useTermosContrato';
import { TermoContrato } from '../../../services/TermoContratoService';
import { TituloService } from '../../../services/tituloService';
import { Titulo, Plano } from '../../../types';
import DraggableModal from '../../common/DraggableModal';
import ImprimirModal from '../../common/ImprimirModal';
import ModeloTermoService from '../../../services/modeloTermoService';
import { useFormReset } from '../../../hooks/useFormReset';
import TituloCreateModal from '../titulos/TituloCreateModal';
import TituloEditModal from '../titulos/TituloEditModal';
import ReceberModal from '../pagamentos/ReceberModal';
import DocumentoSistemaService from '../../../services/documentoSistemaService';
import { DiasVencimentoService } from '../../../services/diasVencimentoService';
import PlanoListModal from '../planos/PlanoListModal';
import BancoListModal from '../bancos/BancoListModal';
import ModeloContratoSelectModal from '../parametros/ModeloContratoSelectModal';
import '../contratos/ContratoModals.css';
import { Banco } from '../../../types';
import { DocumentoSistema } from '../../../services/documentoSistemaService';
import { ContratoTab, TermosTab, FinanceiroTab, ContratoForm } from './contrato';
import { TermoEditModal, SelecionarTermoModal } from './contrato/modals';
import { ensureString } from '../../../utils/stringUtils';
import { BulkAction } from './contrato/types';

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
    dia_vencimento_id: 0,
    conta_boleto: 0,
    data_validade_desconto: '',
    modelo_contrato_id: 0
  });

  const [errors, setErrors] = useState<Partial<ContratoForm>>({});
  const [activeTab, setActiveTab] = useState('contrato');
  const [showCancelados] = useState(false);
  const [showInativos] = useState(false);
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
  
  // Estados para modal de impressão
  const [showPreview, setShowPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // Estados dos modais de seleção
  const [showPlanoModal, setShowPlanoModal] = useState(false);
  const [showBancoModal, setShowBancoModal] = useState(false);
  const [showModeloContratoModal, setShowModeloContratoModal] = useState(false);
  
  // Objetos selecionados
  const [planoSelecionado, setPlanoSelecionado] = useState<Plano | null>(null);
  const [bancoSelecionado, setBancoSelecionado] = useState<Banco | null>(null);
  const [modeloContratoSelecionado, setModeloContratoSelecionado] = useState<DocumentoSistema | null>(null);
  
  const [search] = useState('');
  const [searchTermos] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortColumn] = useState<string>('id');
  const [sortDirection] = useState<'asc' | 'desc'>('desc');
  const { success, error } = useNotificationContext();
  const queryClient = useQueryClient();

  const { data: planosData } = usePlanos();
  const { data: bancosData } = useBancos();
  const { data: modelosContratoData } = useQuery({
    queryKey: ['modelos-contrato'],
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
  
  // Hooks para termos
  const { data: termosData, isLoading: isLoadingTermosContrato, refetch: refetchTermos } = useTermosContrato(contratoId || 0);
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
    dia_vencimento_id: 0,
    conta_boleto: 0,
    data_validade_desconto: '',
    modelo_contrato_id: 0
  };

  // Dados customizados do contrato (quando editando)
  const customFormData = contratoData && typeof contratoData === 'object' && contratoData.id ? {
    plano_id: contratoData.plano_id || 0,
    desconto_percentual: parseFloat(String(contratoData.desconto_percentual || 0)) || 0,
    desconto_valor: parseFloat(String(contratoData.desconto_valor || 0)) || 0,
    data_inicio: contratoData.data_inicio ? contratoData.data_inicio.split('T')[0] : '',
    data_fim: contratoData.data_fim ? contratoData.data_fim.split('T')[0] : '',
    status: contratoData.status || 'ativo',
    observacoes: ensureString(contratoData.observacoes),
    isento_mensalidade: contratoData.isento_mensalidade || false,
    dia_vencimento_id: contratoData.dia_vencimento_id || 0,
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

  // Carregar objetos selecionados quando os dados do contrato forem carregados
  useEffect(() => {
    if (contratoData && planos.length > 0 && bancos.length > 0 && modelosContrato.length > 0) {
      // Encontrar plano selecionado
      const plano = planos.find((p: Plano) => p.id === contratoData.plano_id);
      if (plano) setPlanoSelecionado(plano);

      // Encontrar banco selecionado
      const banco = bancos.find((b: Banco) => b.id === contratoData.conta_boleto);
      if (banco) setBancoSelecionado(banco);

      // Encontrar modelo de contrato selecionado
      const modelo = modelosContrato.find((m: DocumentoSistema) => m.id === contratoData.modelo_contrato_id);
      if (modelo) setModeloContratoSelecionado(modelo);
    }
  }, [contratoData, planos, bancos, modelosContrato]);

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
    setFormData(prev => ({ ...prev, modelo_contrato_id: modelo.id }));
    setShowModeloContratoModal(false);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.plano_id) {
      newErrors.plano_id = 'Plano é obrigatório';
    }

    if (!formData.modelo_contrato_id || formData.modelo_contrato_id === 0) {
      newErrors.modelo_contrato_id = 'Modelo de contrato é obrigatório';
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


  // Funções para impressão
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
      console.error('Erro ao gerar PDF dos boletos:', err);
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
      console.error('Erro ao gerar PDF dos boletos:', err);
      error('Erro ao gerar boletos em aberto');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Bulk actions para títulos
  const bulkActions: BulkAction<Titulo>[] = [
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
              
              queryClient.invalidateQueries({ queryKey: ['titulos', 'contrato', contratoId] });
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
                queryClient.invalidateQueries({ queryKey: ['titulos', 'contrato', contratoId] });
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
    }
  ];

  // Bulk actions para termos
  const termosBulkActions: BulkAction<TermoContrato>[] = [
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
            termoCadastradoId: termo.modelo_termo_id || 0
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
              queryClient.invalidateQueries({ queryKey: ['termos-contrato', contratoId] });
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
        if (selectedTermosItems.length > 0) {
          const termo = selectedTermosItems[0];
          if (termo.modelo_termo_id && contratoId) {
            setIsGeneratingPdf(true);
            try {
              const blob = await ModeloTermoService.generatePdfWithContrato(termo.modelo_termo_id, contratoId);
              const url = window.URL.createObjectURL(blob);
              setPdfUrl(url);
              setShowPreview(true);
            } catch (err) {
              console.error('Erro ao gerar PDF:', err);
              error('Erro ao gerar documento para impressão');
            } finally {
              setIsGeneratingPdf(false);
            }
          }
        }
      }
    }
  ];

  // Colunas para a tabela de títulos
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

  // Colunas para a tabela de títulos de termos
  const termosColumns = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
    },
    {
      key: 'nome_termo',
      label: 'Nome do Termo',
      sortable: true,
      render: (item: TermoContrato) => {
        return item.modeloTermo?.nome || '-';
      }
    },
    {
      key: 'assinado',
      label: 'Assinado',
      sortable: true,
      render: (item: TermoContrato) => {
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
      render: (item: TermoContrato) => {
        return item.data_aceite ? new Date(item.data_aceite).toLocaleDateString('pt-BR') : '-';
      }
    },
    {
      key: 'aceito_por',
      label: 'Aceito Por',
      sortable: true,
      render: (item: TermoContrato) => {
        return item.aceito_por || '-';
      }
    },
    {
      key: 'ativo',
      label: 'Status',
      sortable: true,
      render: (item: TermoContrato) => {
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
      render: (item: TermoContrato) => {
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
      allData = allData.filter((termo: TermoContrato) => termo.ativo);
    }

    // Aplicar filtro de busca
    if (searchTermos.trim()) {
      const searchTerm = searchTermos.toLowerCase().trim();
      return allData.filter((termo: TermoContrato) => {
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

  const sortedTermosData = [...filteredTermosData].sort((a: TermoContrato, b: TermoContrato) => {
    if (!sortColumn) return 0;
    const aVal = a[sortColumn as keyof TermoContrato] ?? '';
    const bVal = b[sortColumn as keyof TermoContrato] ?? '';
    
    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });


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

      success('Contrato atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      queryClient.invalidateQueries({ queryKey: ['cliente', contratoData?.data?.cliente_id] });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao atualizar contrato';
      error(errorMessage);
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
          <div 
            className="tab-content" 
            style={{ 
              flex: 1, 
              overflow: 'hidden', 
              padding: (activeTab === 'termos' || activeTab === 'financeiro') ? '0' : '16px',
              minHeight: 0
            }}
          >
            <>
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
        )}

        {/* Aba Financeiro */}
        {activeTab === 'financeiro' && (
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
          />
        )}
            </>
          </div>
        </div>
      </form>
      </DraggableModal>

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

      {/* Modal para criar/editar termo */}
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
        contratoId={contratoId!}
        termoFormData={termoFormData}
        setTermoFormData={setTermoFormData}
        onShowSelecionarTermo={() => setShowSelecionarTermoModal(true)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['termos-contrato', contratoId] });
        }}
      />

      {/* Modal para selecionar termo cadastrado */}
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

export default ContratoEditModal;
