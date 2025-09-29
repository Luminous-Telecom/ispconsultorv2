import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClienteService } from '../../../services/clienteService';
import { PlanoService } from '../../../services/planoService';
import { BancoService } from '../../../services/bancoService';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import { Cliente } from '../../../types';
import DraggableModal from '../../common/DraggableModal';

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
  tipo_cobranca: 'titulo' | 'carne';
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
    tipo_cobranca: 'carne',
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

  // Mutation para atualizar cliente
  const updateClienteMutation = useMutation({
    mutationFn: (data: Partial<Cliente>) => ClienteService.update(clienteId!, data),
    onSuccess: () => {
      success('Cliente atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['cliente', clienteId] });
      onSuccess?.();
      onClose();
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
        tipo_cobranca: cliente.tipo_cobranca || 'carne',
        valor_primeiro_titulo: cliente.valor_primeiro_titulo || 'total',
        dia_vencimento: cliente.dia_vencimento || 10,
        conta_boleto: cliente.conta_boleto || 0,
        isento_mensalidade: cliente.isento_mensalidade ?? false,
        recebe_email: cliente.recebe_email ?? true,
        recebe_sms: cliente.recebe_sms ?? false,
        recebe_whatsapp: cliente.recebe_whatsapp ?? true,
        plano_id: (cliente as any).plano_id || 0,
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
      observacoes: formData.observacoes
    };

    // Remover apenas campos realmente vazios (não remover 0 ou false)
    Object.keys(dataToSend).forEach(key => {
      const value = dataToSend[key];
      if (value === '' || value === null || value === undefined) {
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
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        {/* Navegação por Abas */}
        <ul className="nav nav-tabs" id="clienteTabs" role="tablist">
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

        {/* Conteúdo das Abas */}
        <div className="tab-content p-3" id="clienteTabContent">
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

                  <h6 className="text-primary mb-3">Configurações de Carnê</h6>
                  
                  <div className="mb-3">
                    <label htmlFor="tipo_cobranca" className="form-label">Tipo de Cobrança</label>
                    <select
                      className="form-select"
                      id="tipo_cobranca"
                      value={formData.tipo_cobranca}
                      onChange={(e) => handleInputChange('tipo_cobranca', e.target.value as 'titulo' | 'carne')}
                    >
                      <option value="titulo">Título</option>
                      <option value="carne">Carnê</option>
                    </select>
                  </div>

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
                    <label className="form-label">Tipo de Cobrança Atual</label>
                    <div className="form-control-plaintext">
                      <span className="badge bg-info">
                        {formData.tipo_cobranca === 'titulo' ? 'Título' : 'Carnê'}
                      </span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Vencimento</label>
                    <div className="form-control-plaintext">
                      Dia {formData.dia_vencimento} de cada mês
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
                  <h6 className="text-primary mb-3">Títulos e Carnês</h6>
                  
                  <div className="alert alert-info">
                    <strong>Em Desenvolvimento:</strong> Esta aba mostrará a listagem de títulos e carnês do cliente.
                    <br />
                    <small>Funcionalidade será implementada em breve.</small>
                  </div>

                  {/* Placeholder para futura implementação */}
                  <div className="card">
                    <div className="card-header">
                      <h6 className="mb-0">Histórico Financeiro</h6>
                    </div>
                    <div className="card-body">
                      <p className="text-muted mb-0">
                        Aqui será exibida a lista de títulos e carnês do cliente, 
                        incluindo status de pagamento, valores e datas de vencimento.
                      </p>
                    </div>
                  </div>
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
    </DraggableModal>
  );
};

export default ClienteEditModal;