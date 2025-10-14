import React, { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClienteService } from '../../../services/clienteService';
import { PlanoService } from '../../../services/planoService';
import { BancoService } from '../../../services/bancoService';
import { TituloService } from '../../../services/tituloService';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import { Cliente, CarneParcela, Contrato, Titulo } from '../../../types';
import DraggableModal from '../../common/DraggableModal';
import DataTable from '../../common/DataTable';
import TituloEditModal from '../titulos/TituloEditModal';
import ReceberModal from '../pagamentos/ReceberModal';
import { useContratos, useDeleteContrato } from '../../../hooks/useContratos';
import ContratoCreateModal from './ContratoCreateModal';
import ContratoEditModal from './ContratoEditModal';
import { useFormReset } from '../../../hooks/useFormReset';

interface ClienteForm {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  email: string;
  telefone: string;
  whatsapp: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  ativo: boolean;
  tipo_cobranca: 'titulo';
  valor_primeiro_titulo: 'total' | 'proporcional';
  recebe_email: boolean;
  recebe_sms: boolean;
  recebe_whatsapp: boolean;
  observacoes: string;
}

interface ClienteEditModalProps {
  show: boolean;
  onClose: () => void;
  clienteId: number | null;
  onSuccess?: () => void;
}

const ClienteEditModal: React.FC<ClienteEditModalProps> = ({ 
  show, 
  onClose, 
  clienteId,
  onSuccess 
}) => {
  const { success, error } = useNotificationContext();
  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    if (type === 'success') success(message);
    else if (type === 'error') error(message);
    else success(message); // Para info, usar success
  };
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<ClienteForm>({
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

  const [errors, setErrors] = useState<Partial<ClienteForm>>({});
  const [activeTab, setActiveTab] = useState('dados-basicos');
  const [showCancelados, setShowCancelados] = useState(false);
  const [showTituloEditModal, setShowTituloEditModal] = useState(false);
  const [showReceberModal, setShowReceberModal] = useState(false);
  const [showContratoCreateModal, setShowContratoCreateModal] = useState(false);
  const [showContratoEditModal, setShowContratoEditModal] = useState(false);
  const [selectedContratoId, setSelectedContratoId] = useState<number | null>(null);
  const [selectedTituloId, setSelectedTituloId] = useState<number | null>(null);
  const [selectedParcela, setSelectedParcela] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [selectedContratosItems, setSelectedContratosItems] = useState<any[]>([]);
  const [showInativosContratos, setShowInativosContratos] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortColumn, setSortColumn] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);

  // Fechar dropdown ao clicar fora
  React.useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    if (openDropdown !== null) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown]);


  // Buscar dados do cliente
  const { data: cliente, isLoading: isLoadingCliente } = useQuery({
    queryKey: ['cliente', clienteId],
    queryFn: () => ClienteService.getById(clienteId!),
    enabled: !!clienteId,
  });

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

  // Buscar contratos do cliente
  const { data: contratosData, isLoading: isLoadingContratos, error: contratosError, refetch: refetchContratos } = useContratos(cliente?.id);
  
  // Hook para deletar contrato
  const deleteContratoMutation = useDeleteContrato();

  // Buscar parcelas do cliente (dados reais do banco)
  const { data: parcelasData, isLoading: isLoadingParcelas, refetch: refetchParcelas } = useQuery({
    queryKey: ['parcelas', 'cliente', clienteId],
    queryFn: () => TituloService.list({ cliente_id: clienteId!, limit: 100 }),
    enabled: !!clienteId,
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

    // Aplicar filtro de busca
    if (search.trim()) {
      const searchTerm = search.toLowerCase().trim();
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
          valueA = a.numero_parcela;
          valueB = b.numero_parcela;
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
  const handleImprimirSelecionados = () => {
    if (selectedItems.length > 0) {
      const ids = selectedItems.map(item => item.id);
      const idsParam = ids.join(',');
      const url = `${process.env.REACT_APP_API_URL?.replace('/api', '')}/boleto/web/multiplos?ids=${idsParam}&print=true`;
      window.open(url, '_blank');
    } else {
      showNotification('Nenhum título selecionado', 'info');
    }
  };

  const handleImprimirTodosEmAberto = () => {
    const allTitulos = parcelasData?.data || [];
    const titulosEmAberto = allTitulos.filter((p: CarneParcela) => 
      p.status === 'pendente' || p.status === 'vencido'
    );
    
    if (titulosEmAberto.length > 0) {
      const ids = titulosEmAberto.map((item: CarneParcela) => item.id);
      const idsParam = ids.join(',');
      const url = `${process.env.REACT_APP_API_URL?.replace('/api', '')}/boleto/web/multiplos?ids=${idsParam}&print=true`;
      window.open(url, '_blank');
    } else {
      showNotification('Não há títulos em aberto para imprimir', 'info');
    }
  };

  // Ações para o header do modal (apenas na aba Financeiro)
  const bulkActions: Array<{
    label: string;
    action?: (selectedItems: CarneParcela[]) => void;
    disabled?: (selectedItems: CarneParcela[]) => boolean;
    dropdown?: {
      label: string;
      action: () => void;
    }[];
  }> = [
    {
      label: 'Editar',
      action: (selectedItems: CarneParcela[]) => {
        if (selectedItems.length > 0) {
          const item = selectedItems[0];
          setSelectedTituloId(item.id);
          setShowTituloEditModal(true);
        }
      }
    },
    {
      label: 'Receber',
      action: (selectedItems: CarneParcela[]) => {
        if (selectedItems.length > 0) {
          const item = selectedItems[0];
          setSelectedParcela(item);
          setShowReceberModal(true);
        }
      }
    },
    {
      label: 'Cancelar',
      action: async (selectedItems: CarneParcela[]) => {
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
      label: 'Estornar',
      action: async (selectedItems: CarneParcela[]) => {
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
      },
      disabled: (selectedItems: CarneParcela[]) => {
        if (selectedItems.length === 0) return true;
        return selectedItems.every(item => item.status !== 'pago');
      }
    },
    {
      label: 'Imprimir',
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
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch = 
          contrato.plano?.nome_plano?.toLowerCase().includes(searchLower) ||
          contrato.status?.toLowerCase().includes(searchLower) ||
          contrato.valor_final?.toString().includes(searchLower) ||
          contrato.id?.toString().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      // Filtro por inativos
      if (!showInativosContratos && contrato.status === 'inativo') {
        return false;
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
  }, [contratosData, search, showInativosContratos, sortColumn, sortDirection]);

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
      render: (contrato: any) => contrato.id
    },
    {
      key: 'nome_plano',
      label: 'Plano',
      sortable: true,
      render: (contrato: any) => contrato.plano?.nome_plano || '-'
    },
    {
      key: 'valor_plano',
      label: 'Valor Plano',
      sortable: true,
      render: (contrato: any) => contrato.plano?.valor_mensal ? `R$ ${contrato.plano.valor_mensal}` : '-'
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (contrato: any) => (
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
      render: (contrato: any) => contrato.desconto_percentual ? `${contrato.desconto_percentual}%` : '-'
    },
    {
      key: 'desconto_valor',
      label: 'Desconto R$',
      sortable: true,
      render: (contrato: any) => contrato.desconto_valor ? `R$ ${contrato.desconto_valor}` : '-'
    },
    {
      key: 'valor_final',
      label: 'Valor Final',
      sortable: true,
      render: (contrato: any) => contrato.valor_final ? `R$ ${contrato.valor_final}` : '-'
    },
    {
      key: 'data_inicio',
      label: 'Data Início',
      sortable: true,
      render: (contrato: any) => contrato.data_inicio ? new Date(contrato.data_inicio).toLocaleDateString('pt-BR') : '-'
    },
    {
      key: 'data_fim',
      label: 'Data Fim',
      sortable: true,
      render: (contrato: any) => contrato.data_fim ? new Date(contrato.data_fim).toLocaleDateString('pt-BR') : '-'
    },
    {
      key: 'isento_mensalidade',
      label: 'Isento',
      sortable: true,
      render: (contrato: any) => (
        <span className={`badge ${contrato.isento_mensalidade ? 'bg-success' : 'bg-secondary'}`}>
          {contrato.isento_mensalidade ? 'Sim' : 'Não'}
        </span>
      )
    },
    {
      key: 'dia_vencimento',
      label: 'Dia Venc.',
      sortable: true,
      render: (contrato: any) => contrato.dia_vencimento ? contrato.dia_vencimento : '-'
    },
    {
      key: 'banco_nome',
      label: 'Banco',
      sortable: true,
      render: (contrato: any) => contrato.bancoBoleto?.nome || '-'
    }
  ];

  // Colunas para o DataTable
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
      render: (item: CarneParcela) => {
        return item.plano?.nome_plano || '-';
      }
    },
    {
      key: 'data_vencimento',
      label: 'Vencimento',
      render: (item: CarneParcela) => {
        return new Date(item.data_vencimento).toLocaleDateString('pt-BR');
      }
    },
    {
      key: 'valor',
      label: 'Valor',
      render: (item: CarneParcela) => {
        return `R$ ${Number(item.valor || 0).toFixed(2)}`;
      }
    },
    {
      key: 'valor_pago',
      label: 'Valor baixado',
      render: (item: CarneParcela) => {
        return item.status === 'pago' ? `R$ ${Number(item.valor_pago || item.valor || 0).toFixed(2)}` : 'R$ 0,00';
      }
    },
    {
      key: 'valor_aberto',
      label: 'Valor aberto',
      render: (item: CarneParcela) => {
        return (item.status === 'pago' || item.status === 'cancelado') ? 'R$ 0,00' : `R$ ${Number(item.valor || 0).toFixed(2)}`;
      }
    },
    {
      key: 'data_pagamento',
      label: 'Data Pagamento',
      render: (item: CarneParcela) => {
        return item.data_pagamento ? new Date(item.data_pagamento).toLocaleDateString('pt-BR') : '-';
      }
    },
    {
      key: 'charge_id',
      label: 'Charge ID',
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

  // Dados iniciais do formulário
  const initialFormData: ClienteForm = {
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

  // Debug: Log para identificar campos sem id/name
  useEffect(() => {
    if (show) {
      console.log('🔍 DEBUG ACESSIBILIDADE: Verificando campos no ClienteEditModal');
      // Aguardar um pouco para o DOM estar pronto
      setTimeout(() => {
        const inputs = document.querySelectorAll('input:not([id]):not([name])');
        console.log('❌ INPUTS SEM ID/NAME encontrados:', inputs.length);
        inputs.forEach((input, index) => {
          console.log(`❌ Campo ${index + 1}:`, input.outerHTML);
        });
      }, 1000);
    }
  }, [show]);

  const handleInputChange = (field: keyof ClienteForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[field]) {
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

    // Remover apenas campos undefined (permitir null, string vazia e 0)
    Object.keys(dataToSend).forEach(key => {
      const value = dataToSend[key];
      if (value === undefined) {
        delete dataToSend[key];
      }
    });

    updateClienteMutation.mutate(dataToSend);
  };

  if (isLoadingCliente) {
    return (
      <DraggableModal show={show} onClose={onClose} title="Cliente" size="xl">
        <div className="text-center p-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
          <p className="mt-2">Carregando dados do cliente...</p>
        </div>
      </DraggableModal>
    );
  }

  if (!cliente) {
    return (
      <DraggableModal show={show} onClose={onClose} title="Cliente" size="xl">
        <div className="text-center p-4">
          <p>Cliente não encontrado.</p>
        </div>
      </DraggableModal>
    );
  }

  return (
        <DraggableModal
          show={show}
          onClose={onClose}
          title="Cliente"
          size="xl"
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
                type="button"
                onClick={handleSubmit}
                className="btn btn-primary btn-sm"
                disabled={updateClienteMutation.isPending}
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
        <ul className="nav nav-tabs" id="clienteTabs" role="tablist" style={{ flexShrink: 0, marginBottom: 0 }}>
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
            >
              Contratos
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link ${activeTab === 'financeiro' ? 'active' : ''}`}
              onClick={() => setActiveTab('financeiro')}
              type="button"
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
        <div className="tab-content" id="clienteTabContent" style={{ flex: 1, overflow: 'auto', padding: '16px', minHeight: 0 }}>
          <form id="cliente-form" onSubmit={handleSubmit}>
            {/* Aba Dados Básicos */}
            {activeTab === 'dados-basicos' && (
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label htmlFor="cnpj" className="form-label">
                      CNPJ <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${errors.cnpj ? 'is-invalid' : ''}`}
                      id="cnpj"
                      name="cnpj"
                      autoComplete="off"
                      value={formData.cnpj}
                      onChange={(e) => handleInputChange('cnpj', e.target.value)}
                      placeholder="00.000.000/0000-00"
                    />
                    {errors.cnpj && <div className="invalid-feedback">{errors.cnpj}</div>}
                  </div>

                  <div className="mb-3">
                    <label htmlFor="razao_social" className="form-label">
                      Razão Social <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${errors.razao_social ? 'is-invalid' : ''}`}
                      id="razao_social"
                      name="razao_social"
                      autoComplete="organization"
                      value={formData.razao_social}
                      onChange={(e) => handleInputChange('razao_social', e.target.value)}
                      placeholder="Razão social da empresa"
                    />
                    {errors.razao_social && <div className="invalid-feedback">{errors.razao_social}</div>}
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="mb-3">
                    <label htmlFor="nome_fantasia" className="form-label">Nome Fantasia</label>
                    <input
                      type="text"
                      className="form-control"
                      id="nome_fantasia"
                      name="nome_fantasia"
                      autoComplete="organization-title"
                      value={formData.nome_fantasia}
                      onChange={(e) => handleInputChange('nome_fantasia', e.target.value)}
                      placeholder="Nome fantasia da empresa"
                    />
                  </div>

                  <div className="mb-3">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="ativo"
                        name="ativo"
                        checked={formData.ativo}
                        onChange={(e) => handleInputChange('ativo', e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="ativo">
                        Cliente Ativo
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Aba Contato */}
            {activeTab === 'contato' && (
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label htmlFor="email" className="form-label">
                      Email <span className="text-danger">*</span>
                    </label>
                    <input
                      type="email"
                      className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                      id="email"
                      name="email"
                      autoComplete="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="email@exemplo.com"
                    />
                    {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                  </div>

                  <div className="mb-3">
                    <label htmlFor="telefone" className="form-label">Telefone</label>
                    <input
                      type="text"
                      className="form-control"
                      id="telefone"
                      name="telefone"
                      autoComplete="tel"
                      value={formData.telefone}
                      onChange={(e) => handleInputChange('telefone', e.target.value)}
                      placeholder="(00) 0000-0000"
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="whatsapp" className="form-label">WhatsApp</label>
                    <input
                      type="text"
                      className="form-control"
                      id="whatsapp"
                      name="whatsapp"
                      autoComplete="tel"
                      value={formData.whatsapp}
                      onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>

                <div className="col-md-6">
                  <h6 className="text-primary mb-3">Preferências de Comunicação</h6>
                  
                  <div className="mb-3">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="recebe_email"
                        name="recebe_email"
                        checked={formData.recebe_email}
                        onChange={(e) => handleInputChange('recebe_email', e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="recebe_email">
                        Recebe Email
                      </label>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="recebe_sms"
                        name="recebe_sms"
                        checked={formData.recebe_sms}
                        onChange={(e) => handleInputChange('recebe_sms', e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="recebe_sms">
                        Recebe SMS
                      </label>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="recebe_whatsapp"
                        name="recebe_whatsapp"
                        checked={formData.recebe_whatsapp}
                        onChange={(e) => handleInputChange('recebe_whatsapp', e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="recebe_whatsapp">
                        Recebe WhatsApp
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Aba Endereço */}
            {activeTab === 'endereco' && (
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label htmlFor="cep" className="form-label">CEP</label>
                    <input
                      type="text"
                      className="form-control"
                      id="cep"
                      name="cep"
                      autoComplete="postal-code"
                      value={formData.cep}
                      onChange={(e) => handleInputChange('cep', e.target.value)}
                      placeholder="00000-000"
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="endereco" className="form-label">Endereço</label>
                    <input
                      type="text"
                      className="form-control"
                      id="endereco"
                      name="endereco"
                      autoComplete="street-address"
                      value={formData.endereco}
                      onChange={(e) => handleInputChange('endereco', e.target.value)}
                      placeholder="Rua, Avenida..."
                    />
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="numero" className="form-label">Número</label>
                        <input
                          type="text"
                          className="form-control"
                          id="numero"
                          name="numero"
                          value={formData.numero}
                          onChange={(e) => handleInputChange('numero', e.target.value)}
                          placeholder="123"
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="complemento" className="form-label">Complemento</label>
                        <input
                          type="text"
                          className="form-control"
                          id="complemento"
                          name="complemento"
                          value={formData.complemento}
                          onChange={(e) => handleInputChange('complemento', e.target.value)}
                          placeholder="Apto, Sala..."
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="mb-3">
                    <label htmlFor="bairro" className="form-label">Bairro</label>
                    <input
                      type="text"
                      className="form-control"
                      id="bairro"
                      name="bairro"
                      value={formData.bairro}
                      onChange={(e) => handleInputChange('bairro', e.target.value)}
                      placeholder="Nome do bairro"
                    />
                  </div>

                  <div className="row">
                    <div className="col-md-8">
                      <div className="mb-3">
                        <label htmlFor="cidade" className="form-label">Cidade</label>
                        <input
                          type="text"
                          className="form-control"
                          id="cidade"
                          name="cidade"
                          autoComplete="address-level2"
                          value={formData.cidade}
                          onChange={(e) => handleInputChange('cidade', e.target.value)}
                          placeholder="Nome da cidade"
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label htmlFor="estado" className="form-label">Estado</label>
                        <input
                          type="text"
                          className="form-control"
                          id="estado"
                          name="estado"
                          autoComplete="address-level1"
                          value={formData.estado}
                          onChange={(e) => handleInputChange('estado', e.target.value)}
                          placeholder="UF"
                          maxLength={2}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}


            {/* Aba Contratos */}
            {activeTab === 'contratos' && (
              <div className="row">
                <div className="col-12">
                  {/* Cabeçalho fixo - não rola */}
                  <div style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-primary)', zIndex: 10, paddingBottom: '1rem' }}>
                    {/* Botões de Ação - Linha 1 */}
                    <div className="d-flex justify-content-start mb-3">
                      <div className="d-flex" style={{ gap: '8px', paddingLeft: '1rem' }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowContratoCreateModal(true);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          Novo
                        </button>
                        
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (selectedContratosItems.length === 1) {
                              setSelectedContratoId(selectedContratosItems[0].id);
                            setShowContratoEditModal(true);
                          }
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          disabled={selectedContratosItems.length !== 1}
                        >
                          Editar
                        </button>
                        
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (selectedContratosItems.length > 0) {
                              if (window.confirm(`Tem certeza que deseja deletar ${selectedContratosItems.length} contrato(s)?`)) {
                                for (const item of selectedContratosItems) {
                                try {
                                  await deleteContratoMutation.mutateAsync(item.id);
                                } catch (error: any) {
                                  console.error(`Erro ao deletar contrato ${item.id}:`, error);
                                  const errorMessage = error?.response?.data?.message || 
                                                     error?.response?.data?.error || 
                                                     `Erro ao deletar contrato ${item.id}`;
                                  showNotification(errorMessage, 'error');
                                }
                              }
                              // Refetch contratos após deletar
                              refetchContratos();
                                setSelectedContratosItems([]);
                              }
                            }
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          disabled={selectedContratosItems.length === 0}
                        >
                          Deletar
                        </button>
                      </div>
                    </div>

                    {/* Busca, Filtros e Paginação - Linha 2 */}
                    <div className="d-flex mb-3">
                      {/* Busca à esquerda */}
                      <div className="d-flex gap-2" style={{ paddingLeft: '1rem' }}>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          id="contratos-search"
                          name="contratosSearch"
                          placeholder="Buscar por plano, status, valor..."
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
                            id="showInativosContratos"
                            checked={showInativosContratos}
                            onChange={(e) => {
                              e.stopPropagation();
                              setShowInativosContratos(e.target.checked);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <label className="form-check-label small" htmlFor="showInativosContratos">
                            Mostrar inativos
                          </label>
                        </div>
                      </div>

                      {/* Paginação à direita */}
                      <div className="d-flex gap-2" style={{ marginLeft: 'auto' }}>
                        {/* Seletor de linhas por página */}
                        <select 
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
                            {sortedContratosData.length > 0 ? (page - 1) * limit + 1 : 0} - {Math.min(page * limit, sortedContratosData.length)} / {sortedContratosData.length}
                          </span>
                          <button 
                            className="btn btn-outline-secondary btn-sm" 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setPage(page + 1);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            disabled={page >= Math.ceil(sortedContratosData.length / limit)}
                          >
                            <i className="bi bi-chevron-right"></i>
                          </button>
                          <button 
                            className="btn btn-outline-secondary btn-sm" 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setPage(Math.ceil(sortedContratosData.length / limit));
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            disabled={page >= Math.ceil(sortedContratosData.length / limit)}
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
                            refetchContratos();
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
                      data={paginatedContratosData}
                      columns={contratosColumns}
                      isLoading={isLoadingContratos}
                      showHeader={false}
                      onSelectionChange={setSelectedContratosItems}
                      onSort={(column: string, direction: 'asc' | 'desc') => {
                        setSortColumn(column);
                        setSortDirection(direction);
                      }}
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      limit={limit}
                      setLimit={setLimit}
                      setPage={setPage}
                      emptyMessage="Este cliente ainda não possui contratos cadastrados."
                    />
                  </div>

                  {/* Resumo de Contratos */}
                  {sortedContratosData.length > 0 && (
                    <div className="d-flex justify-content-between align-items-center mt-3 p-3 bg-light rounded">
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
                  {/* Cabeçalho fixo - não rola */}
                  <div style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-primary)', zIndex: 10, paddingBottom: '1rem' }}>
                    {/* Botões de Ação - Linha 1 */}
                    <div className="d-flex justify-content-start mb-3">
                      <div className="d-flex" style={{ gap: '8px', paddingLeft: '1rem' }}>
                        {bulkActions.map((bulkAction, index) => {
                          const hasSelection = selectedItems.length > 0;
                          const selectedItem = hasSelection ? selectedItems[0] : null;
                          
                          // Lógica de desabilitação baseada no status
                          let isDisabled = !hasSelection;
                          
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
                                  className="btn btn-sm btn-primary dropdown-toggle"
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setOpenDropdown(openDropdown === index ? null : index);
                                  }}
                                  onMouseDown={(e) => e.stopPropagation()}
                                >
                                  {bulkAction.label}
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
                          className="form-control form-control-sm"
                          id="parcelas-search"
                          name="parcelasSearch"
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
                            refetchParcelas();
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
                      isLoading={isLoadingParcelas}
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
                      emptyMessage="Este cliente ainda não possui títulos cadastrados."
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

            {/* Aba Observações */}
            {activeTab === 'observacoes' && (
              <div className="row">
                <div className="col-12">
                  <div className="mb-3">
                    <label htmlFor="observacoes" className="form-label">Observações</label>
                    <textarea
                      className="form-control"
                      id="observacoes"
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

          </form>
        </div>
      </div>

      {/* Modal de edição de título */}
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
          numero_titulo: selectedParcela.numero_titulo || `Parcela ${selectedParcela.numero_parcela}`,
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
        clienteId={cliente?.id}
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

    </DraggableModal>
  );
};

export default ClienteEditModal;