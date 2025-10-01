import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClienteService } from '../../../services/clienteService';
import { PlanoService } from '../../../services/planoService';
import { BancoService } from '../../../services/bancoService';
import { TituloService } from '../../../services/tituloService';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import { Cliente, CarneParcela } from '../../../types';
import DraggableModal from '../../common/DraggableModal';
import DataTable from '../../common/DataTable';
import ModalHeaderActions from '../../common/ModalHeaderActions';
import TituloCreateModal from '../titulos/TituloCreateModal';
import TituloEditModal from '../titulos/TituloEditModal';
import ReceberModal from '../pagamentos/ReceberModal';

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
  dia_vencimento: number;
  conta_boleto: number;
  isento_mensalidade: boolean;
  recebe_email: boolean;
  recebe_sms: boolean;
  recebe_whatsapp: boolean;
  plano_id: number;
  desconto_percentual: number;
  desconto_valor: number;
  data_validade_desconto: string;
  data_inicio_plano: string;
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
    dia_vencimento: 10,
    conta_boleto: 0,
    isento_mensalidade: false,
    recebe_email: true,
    recebe_sms: false,
    recebe_whatsapp: true,
    plano_id: 0,
    desconto_percentual: 0,
    desconto_valor: 0,
    data_validade_desconto: '',
    data_inicio_plano: '',
    observacoes: ''
  });

  const [errors, setErrors] = useState<Partial<ClienteForm>>({});
  const [activeTab, setActiveTab] = useState('dados-basicos');
  const [showCancelados, setShowCancelados] = useState(false);
  const [showTituloCreateModal, setShowTituloCreateModal] = useState(false);
  const [showTituloEditModal, setShowTituloEditModal] = useState(false);
  const [showReceberModal, setShowReceberModal] = useState(false);
  const [selectedTituloId, setSelectedTituloId] = useState<number | null>(null);
  const [selectedParcela, setSelectedParcela] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
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
    let filteredData = allData.filter((titulo: any) => {
      if (titulo.status === 'cancelado' && !showCancelados) {
        return false;
      }
      return true;
    });

    // Aplicar filtro de busca
    if (search.trim()) {
      const searchTerm = search.toLowerCase().trim();
      filteredData = filteredData.filter((titulo: any) => {
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
      let valueA: any;
      let valueB: any;
      
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
          valueA = (a as any)[sortColumn] || '';
          valueB = (b as any)[sortColumn] || '';
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
    const titulosEmAberto = allTitulos.filter((p: any) => 
      p.status === 'pendente' || p.status === 'vencido'
    );
    
    if (titulosEmAberto.length > 0) {
      const ids = titulosEmAberto.map((item: any) => item.id);
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
    action?: (selectedItems: any[]) => void;
    disabled?: (selectedItems: any[]) => boolean;
    dropdown?: {
      label: string;
      action: () => void;
    }[];
  }> = [
    {
      label: 'Novo Título',
      action: () => {
        setShowTituloCreateModal(true);
      }
    },
    {
      label: 'Editar',
      action: (selectedItems: any[]) => {
        if (selectedItems.length > 0) {
          const item = selectedItems[0];
          setSelectedTituloId(item.id);
          setShowTituloEditModal(true);
        }
      }
    },
    {
      label: 'Receber',
      action: (selectedItems: any[]) => {
        if (selectedItems.length > 0) {
          const item = selectedItems[0];
          setSelectedParcela(item);
          setShowReceberModal(true);
        }
      }
    },
    {
      label: 'Cancelar',
      action: async (selectedItems: any[]) => {
        if (selectedItems.length > 0) {
          const item = selectedItems[0];
          if (window.confirm('Tem certeza que deseja cancelar este título?')) {
            try {
              const response = await TituloService.update(item.id, { status: 'cancelado' });
              
              if (response?.message) {
                showNotification(response.message, 'success');
              } else {
                showNotification('Título cancelado com sucesso!', 'success');
              }
              
              // Recarregar dados
              queryClient.invalidateQueries({ queryKey: ['cliente', clienteId] });
            } catch (err: any) {
              showNotification(err.response?.data?.message || 'Erro ao cancelar título', 'error');
            }
          }
        }
      }
    },
    {
      label: 'Estornar',
      action: async (selectedItems: any[]) => {
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
      disabled: (selectedItems: any[]) => {
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


  // Colunas para o DataTable
  const columns = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      render: (item: any) => item.id
    },
    {
      key: 'status',
      label: 'Status',
      render: (item: any) => {
        return (
          <span className={`badge ${
            item.status === 'pago' ? 'bg-success' :
            item.status === 'pago_atraso' ? '' :
            item.status === 'parcial' ? 'bg-info' :
            item.status === 'vencido' ? 'bg-danger' :
            item.status === 'pendente' ? '' :
            'bg-secondary'
          }`} style={
            item.status === 'pago_atraso' ? { backgroundColor: '#ff8c00', color: 'white' } :
            item.status === 'pendente' ? { backgroundColor: '#87ceeb', color: '#333' } :
            {}
          }>
            {item.status === 'pago' ? '✔ Recebimento em dia' :
             item.status === 'pago_atraso' ? '✔ Pago com Atraso' :
             item.status === 'parcial' ? 'Parcial' :
             item.status === 'vencido' ? '✔ Recebimento em atraso' :
             item.status === 'pendente' ? 'Pendente' :
             item.status}
          </span>
        );
      }
    },
    {
      key: 'plano',
      label: 'Plano',
      render: (item: any) => {
        return item.plano?.nome_plano || '-';
      }
    },
    {
      key: 'data_vencimento',
      label: 'Vencimento',
      render: (item: any) => {
        return new Date(item.data_vencimento).toLocaleDateString('pt-BR');
      }
    },
    {
      key: 'valor',
      label: 'Valor',
      render: (item: any) => {
        return `R$ ${Number(item.valor || 0).toFixed(2)}`;
      }
    },
    {
      key: 'valor_pago',
      label: 'Valor baixado',
      render: (item: any) => {
        return item.status === 'pago' ? `R$ ${Number(item.valor_pago || item.valor || 0).toFixed(2)}` : 'R$ 0,00';
      }
    },
    {
      key: 'valor_aberto',
      label: 'Valor aberto',
      render: (item: any) => {
        return (item.status === 'pago' || item.status === 'cancelado') ? 'R$ 0,00' : `R$ ${Number(item.valor || 0).toFixed(2)}`;
      }
    },
    {
      key: 'data_pagamento',
      label: 'Data Pagamento',
      render: (item: any) => {
        return item.data_pagamento ? new Date(item.data_pagamento).toLocaleDateString('pt-BR') : '-';
      }
    },
    {
      key: 'charge_id',
      label: 'Charge ID',
      render: (item: any) => {
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

  // Carregar dados do cliente no formulário
  useEffect(() => {
    if (cliente) {
      setFormData({
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
        dia_vencimento: cliente.dia_vencimento || 10,
        conta_boleto: cliente.conta_boleto || 0,
        isento_mensalidade: cliente.isento_mensalidade ?? false,
        recebe_email: cliente.recebe_email ?? true,
        recebe_sms: cliente.recebe_sms ?? false,
        recebe_whatsapp: cliente.recebe_whatsapp ?? true,
        plano_id: (cliente as any).planos?.[0]?.id || (cliente as any).plano_id || 0,
        desconto_percentual: (cliente as any).desconto_percentual || 0,
        desconto_valor: (cliente as any).desconto_valor || 0,
        data_validade_desconto: (cliente as any).data_validade_desconto || '',
        data_inicio_plano: (cliente as any).data_inicio_plano || '',
        observacoes: cliente.observacoes || ''
      });
    }
  }, [cliente]);

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
      dia_vencimento: Number(formData.dia_vencimento),
      conta_boleto: Number(formData.conta_boleto),
      isento_mensalidade: formData.isento_mensalidade,
      recebe_email: formData.recebe_email,
      recebe_sms: formData.recebe_sms,
      recebe_whatsapp: formData.recebe_whatsapp,
      observacoes: formData.observacoes,
      data_validade_desconto: formData.data_validade_desconto || null
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
      <DraggableModal show={show} onClose={onClose} title="Editar Cliente" size="xl">
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
      <DraggableModal show={show} onClose={onClose} title="Editar Cliente" size="xl">
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
          title="Editar Cliente"
          size="xl"
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
          <form onSubmit={handleSubmit}>
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
                <div className="col-md-6">
                  <h6 className="text-primary mb-3">Plano Atual</h6>
                  
                  <div className="mb-3">
                    <label htmlFor="plano_id" className="form-label">Plano</label>
                    <select
                      className="form-select"
                      id="plano_id"
                      value={formData.plano_id}
                      onChange={(e) => handleInputChange('plano_id', parseInt(e.target.value))}
                    >
                      <option value={0}>Selecione um plano</option>
                      {planosData?.data?.map((plano: any) => (
                        <option key={plano.id} value={plano.id}>
                          {plano.nome} - R$ {Number(plano.valor_mensal || 0).toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="data_inicio_plano" className="form-label">Data de Início do Plano</label>
                    <input
                      type="date"
                      className="form-control"
                      id="data_inicio_plano"
                      value={formData.data_inicio_plano}
                      onChange={(e) => handleInputChange('data_inicio_plano', e.target.value)}
                    />
                  </div>

                  <h6 className="text-primary mb-3">Configurações Gerais</h6>
                  
                  <div className="mb-3">
                    <label htmlFor="valor_primeiro_titulo" className="form-label">Valor do Primeiro Título</label>
                    <select
                      className="form-select"
                      id="valor_primeiro_titulo"
                      value={formData.valor_primeiro_titulo}
                      onChange={(e) => handleInputChange('valor_primeiro_titulo', e.target.value as 'total' | 'proporcional')}
                    >
                      <option value="total">Valor Total</option>
                      <option value="proporcional">Valor Proporcional</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="isento_mensalidade"
                        checked={formData.isento_mensalidade}
                        onChange={(e) => handleInputChange('isento_mensalidade', e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="isento_mensalidade">
                        Isento de Mensalidade
                      </label>
                    </div>
                  </div>

                  <h6 className="text-primary mb-3">Configurações de Cobrança</h6>

                  <div className="mb-3">
                    <label htmlFor="dia_vencimento" className="form-label">Dia de Vencimento</label>
                    <select
                      className="form-select"
                      id="dia_vencimento"
                      value={formData.dia_vencimento}
                      onChange={(e) => handleInputChange('dia_vencimento', parseInt(e.target.value))}
                    >
                      {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                        <option key={day} value={day}>{day}º dia</option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="conta_boleto" className="form-label">Conta para Boleto</label>
                    <select
                      className="form-select"
                      id="conta_boleto"
                      value={formData.conta_boleto}
                      onChange={(e) => handleInputChange('conta_boleto', parseInt(e.target.value))}
                    >
                      <option value={0}>Selecione um banco</option>
                      {bancosData?.data?.map((banco: any) => (
                        <option key={banco.id} value={banco.id}>
                          {banco.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="col-md-6">
                  <h6 className="text-primary mb-3">Informações do Contrato</h6>
                  
                  <div className="mb-3">
                    <label className="form-label">Status do Contrato</label>
                    <div className="form-control-plaintext">
                      <span className={`badge ${formData.ativo ? 'bg-success' : 'bg-secondary'}`}>
                        {formData.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Vencimento</label>
                    <div className="form-control-plaintext">
                      <span className="text-muted">
                        Dia <strong>{formData.dia_vencimento || '-'}</strong> de cada mês
                      </span>
                    </div>
                  </div>

                  <h6 className="text-primary mb-3">Descontos</h6>
                  
                  <div className="mb-3">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="isento_mensalidade"
                        checked={formData.isento_mensalidade}
                        onChange={(e) => handleInputChange('isento_mensalidade', e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="isento_mensalidade">
                        Isento de Mensalidade
                      </label>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="desconto_percentual" className="form-label">Desconto (%)</label>
                        <input
                          type="number"
                          className="form-control"
                          id="desconto_percentual"
                          value={formData.desconto_percentual}
                          onChange={(e) => handleInputChange('desconto_percentual', parseFloat(e.target.value) || 0)}
                          min="0"
                          max="100"
                          step="0.01"
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="desconto_valor" className="form-label">Desconto (R$)</label>
                        <input
                          type="number"
                          className="form-control"
                          id="desconto_valor"
                          value={formData.desconto_valor}
                          onChange={(e) => handleInputChange('desconto_valor', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="data_validade_desconto" className="form-label">Validade do Desconto</label>
                    <input
                      type="date"
                      className="form-control"
                      id="data_validade_desconto"
                      value={formData.data_validade_desconto}
                      onChange={(e) => handleInputChange('data_validade_desconto', e.target.value)}
                    />
                  </div>

                  <h6 className="text-primary mb-3">Preferências de Comunicação</h6>
                  
                  <div className="mb-3">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="recebe_email"
                        checked={formData.recebe_email}
                        onChange={(e) => handleInputChange('recebe_email', e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="recebe_email">
                        Recebe E-mail
                      </label>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="recebe_sms"
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
                          // Botão "Novo Título" sempre habilitado, outros apenas quando há seleção
                          const isNewButton = bulkAction.label === 'Novo Título';
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
                  <div style={{ paddingLeft: '0.5rem', maxHeight: '400px', overflowY: 'auto' }}>
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
                      rows={8}
                      value={formData.observacoes}
                      onChange={(e) => handleInputChange('observacoes', e.target.value)}
                      placeholder="Observações sobre o cliente..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Botões */}
            <div className="d-flex justify-content-end gap-2 mt-4">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={updateClienteMutation.isPending}
              >
                {updateClienteMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal de criação de título */}
      <TituloCreateModal
        show={showTituloCreateModal}
        onClose={() => setShowTituloCreateModal(false)}
        onSuccess={() => {
          setShowTituloCreateModal(false);
          refetchParcelas();
        }}
        clienteId={clienteId || undefined}
      />

      {/* Modal de edição de título */}
      <TituloEditModal
        show={showTituloEditModal}
        onClose={() => {
          setShowTituloEditModal(false);
          setSelectedTituloId(null);
        }}
        onSuccess={() => {
          setShowTituloEditModal(false);
          setSelectedTituloId(null);
          refetchParcelas();
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

    </DraggableModal>
  );
};

export default ClienteEditModal;