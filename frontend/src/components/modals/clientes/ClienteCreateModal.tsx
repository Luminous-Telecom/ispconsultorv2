import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClienteService } from '../../../services/clienteService';
import { PlanoService } from '../../../services/planoService';
import { BancoService } from '../../../services/bancoService';
import { useNotificationContext } from '../../../contexts/NotificationContext';
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

interface ClienteCreateModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ClienteCreateModal: React.FC<ClienteCreateModalProps> = ({ 
  show, 
  onClose, 
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
    recebe_whatsapp: false,
    plano_id: 0,
    desconto_percentual: 0,
    desconto_valor: 0,
    data_validade_desconto: '',
    data_inicio_plano: '',
    observacoes: '',
  });

  const [errors, setErrors] = useState<Partial<ClienteForm>>({});

  // Queries para buscar dados
  const { data: planos } = useQuery({
    queryKey: ['planos-ativos'],
    queryFn: () => PlanoService.list({ status: 'ativo', limit: 100 }),
    staleTime: 60 * 1000,
    refetchOnMount: false,
  });

  const { data: bancos } = useQuery({
    queryKey: ['bancos-ativos'],
    queryFn: () => BancoService.findAtivos(),
    staleTime: 60 * 1000,
    refetchOnMount: false,
  });

  // Mutation para criar cliente
  const createClienteMutation = useMutation({
    mutationFn: (data: ClienteForm) => ClienteService.create(data),
    onSuccess: () => {
      success('Cliente criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Erro ao criar cliente');
    },
  });

  const handleInputChange = (field: keyof ClienteForm, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpar erro do campo quando usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Partial<ClienteForm> = {};

    if (!formData.cnpj.trim()) newErrors.cnpj = 'CNPJ é obrigatório';
    if (!formData.razao_social.trim()) newErrors.razao_social = 'Razão Social é obrigatória';
    if (!formData.email.trim()) newErrors.email = 'Email é obrigatório';
    if (!formData.telefone.trim()) newErrors.telefone = 'Telefone é obrigatório';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    createClienteMutation.mutate(formData);
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <DraggableModal
      show={show}
      onClose={handleCancel}
      title="Cliente"
      modalId="cliente-create-modal"
      headerActions={
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleCancel}
            disabled={createClienteMutation.isPending}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="cliente-create-form"
            className="btn btn-primary btn-sm"
            disabled={createClienteMutation.isPending}
          >
            Criar Cliente
          </button>
        </div>
      }
    >
      <form id="cliente-create-form" onSubmit={handleSubmit}>
        {/* Dados Básicos */}
        <div className="mb-3">
          <h6 className="border-bottom pb-2 mb-3">Dados Básicos</h6>
          <div className="row g-2">
            <div className="col-md-6">
              <div className="mb-2">
                <label htmlFor="cliente-create-cnpj" className="form-label small">CNPJ *</label>
                <input
                  type="text"
                  id="cliente-create-cnpj"
                  name="cnpj"
                  autoComplete="off"
                  className={`form-control form-control-sm ${errors.cnpj ? 'is-invalid' : ''}`}
                  value={formData.cnpj}
                  onChange={(e) => handleInputChange('cnpj', e.target.value)}
                  placeholder="00.000.000/0000-00"
                />
                {errors.cnpj && <div className="invalid-feedback">{errors.cnpj}</div>}
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-2">
                <label htmlFor="cliente-create-razao-social" className="form-label small">Razão Social *</label>
                <input
                  type="text"
                  id="cliente-create-razao-social"
                  name="razao_social"
                  autoComplete="organization"
                  className={`form-control form-control-sm ${errors.razao_social ? 'is-invalid' : ''}`}
                  value={formData.razao_social}
                  onChange={(e) => handleInputChange('razao_social', e.target.value)}
                  placeholder="Nome da empresa"
                />
                {errors.razao_social && <div className="invalid-feedback">{errors.razao_social}</div>}
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-2">
                <label htmlFor="cliente-create-nome-fantasia" className="form-label small">Nome Fantasia</label>
                <input
                  type="text"
                  id="cliente-create-nome-fantasia"
                  name="nome_fantasia"
                  autoComplete="organization-title"
                  className="form-control form-control-sm"
                  value={formData.nome_fantasia}
                  onChange={(e) => handleInputChange('nome_fantasia', e.target.value)}
                  placeholder="Nome fantasia (opcional)"
                />
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-2">
                <label htmlFor="cliente-create-email" className="form-label small">Email *</label>
                <input
                  type="email"
                  id="cliente-create-email"
                  name="email"
                  autoComplete="email"
                  className={`form-control form-control-sm ${errors.email ? 'is-invalid' : ''}`}
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="email@exemplo.com"
                />
                {errors.email && <div className="invalid-feedback">{errors.email}</div>}
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-2">
                <label htmlFor="cliente-create-telefone" className="form-label small">Telefone *</label>
                <input
                  type="text"
                  id="cliente-create-telefone"
                  name="telefone"
                  autoComplete="tel"
                  className={`form-control form-control-sm ${errors.telefone ? 'is-invalid' : ''}`}
                  value={formData.telefone}
                  onChange={(e) => handleInputChange('telefone', e.target.value)}
                  placeholder="(00) 0000-0000"
                />
                {errors.telefone && <div className="invalid-feedback">{errors.telefone}</div>}
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-2">
                <label htmlFor="cliente-create-whatsapp" className="form-label small">WhatsApp</label>
                <input
                  type="text"
                  id="cliente-create-whatsapp"
                  name="whatsapp"
                  autoComplete="tel"
                  className="form-control form-control-sm"
                  value={formData.whatsapp}
                  onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div className="mb-3">
          <h6 className="border-bottom pb-2 mb-3">Endereço</h6>
          <div className="row g-2">
            <div className="col-md-3">
              <div className="mb-2">
                <label htmlFor="cliente-create-cep" className="form-label small">CEP</label>
                <input
                  type="text"
                  id="cliente-create-cep"
                  name="cep"
                  autoComplete="postal-code"
                  className="form-control form-control-sm"
                  value={formData.cep}
                  onChange={(e) => handleInputChange('cep', e.target.value)}
                  placeholder="00000-000"
                />
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-2">
                <label htmlFor="cliente-create-endereco" className="form-label small">Endereço</label>
                <input
                  type="text"
                  id="cliente-create-endereco"
                  name="endereco"
                  autoComplete="street-address"
                  className="form-control form-control-sm"
                  value={formData.endereco}
                  onChange={(e) => handleInputChange('endereco', e.target.value)}
                  placeholder="Rua, Avenida..."
                />
              </div>
            </div>
            <div className="col-md-3">
              <div className="mb-2">
                <label htmlFor="cliente-create-numero" className="form-label small">Número</label>
                <input
                  type="text"
                  id="cliente-create-numero"
                  name="numero"
                  className="form-control form-control-sm"
                  value={formData.numero}
                  onChange={(e) => handleInputChange('numero', e.target.value)}
                  placeholder="123"
                />
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-2">
                <label htmlFor="cliente-create-complemento" className="form-label small">Complemento</label>
                <input
                  type="text"
                  id="cliente-create-complemento"
                  name="complemento"
                  className="form-control form-control-sm"
                  value={formData.complemento}
                  onChange={(e) => handleInputChange('complemento', e.target.value)}
                  placeholder="Apto, Sala..."
                />
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-2">
                <label htmlFor="cliente-create-bairro" className="form-label small">Bairro</label>
                <input
                  type="text"
                  id="cliente-create-bairro"
                  name="bairro"
                  autoComplete="address-level3"
                  className="form-control form-control-sm"
                  value={formData.bairro}
                  onChange={(e) => handleInputChange('bairro', e.target.value)}
                  placeholder="Nome do bairro"
                />
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-2">
                <label htmlFor="cliente-create-cidade" className="form-label small">Cidade</label>
                <input
                  type="text"
                  id="cliente-create-cidade"
                  name="cidade"
                  autoComplete="address-level2"
                  className="form-control form-control-sm"
                  value={formData.cidade}
                  onChange={(e) => handleInputChange('cidade', e.target.value)}
                  placeholder="Nome da cidade"
                />
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-2">
                <label htmlFor="cliente-create-estado" className="form-label small">Estado</label>
                <input
                  type="text"
                  id="cliente-create-estado"
                  name="estado"
                  autoComplete="address-level1"
                  className="form-control form-control-sm"
                  value={formData.estado}
                  onChange={(e) => handleInputChange('estado', e.target.value)}
                  placeholder="UF"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Configurações */}
        <div className="mb-3">
          <h6 className="border-bottom pb-2 mb-3">Configurações</h6>
          <div className="row g-2">
            <div className="col-md-6">
              <div className="mb-2">
                <label htmlFor="cliente-create-tipo-cobranca" className="form-label small">Tipo de Cobrança</label>
                <select
                  id="cliente-create-tipo-cobranca"
                  name="tipo_cobranca"
                  className="form-select form-select-sm"
                  value={formData.tipo_cobranca}
                  onChange={(e) => handleInputChange('tipo_cobranca', e.target.value)}
                >
                  <option value="carne">Carnê</option>
                  <option value="titulo">Título</option>
                </select>
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-2">
                <label htmlFor="cliente-create-dia-vencimento" className="form-label small">Dia do Vencimento</label>
                <input
                  type="number"
                  id="cliente-create-dia-vencimento"
                  name="dia_vencimento"
                  className="form-control form-control-sm"
                  value={formData.dia_vencimento}
                  onChange={(e) => handleInputChange('dia_vencimento', parseInt(e.target.value))}
                  min="1"
                  max="31"
                />
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-2">
                <label htmlFor="cliente-create-plano" className="form-label small">Plano</label>
                <select
                  id="cliente-create-plano"
                  name="plano_id"
                  className="form-select form-select-sm"
                  value={formData.plano_id}
                  onChange={(e) => handleInputChange('plano_id', parseInt(e.target.value))}
                >
                  <option value={0}>Selecione um plano</option>
                  {planos?.data?.map((plano: any) => (
                    <option key={plano.id} value={plano.id}>
                      {plano.nome_plano}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-2">
                <label htmlFor="cliente-create-conta-boleto" className="form-label small">Banco para Boletos</label>
                <select
                  id="cliente-create-conta-boleto"
                  name="conta_boleto"
                  className="form-select form-select-sm"
                  value={formData.conta_boleto}
                  onChange={(e) => handleInputChange('conta_boleto', parseInt(e.target.value))}
                >
                  <option value={0}>Selecione um banco</option>
                  {bancos?.map((banco: any) => (
                    <option key={banco.id} value={banco.id}>
                      {banco.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

      </form>
    </DraggableModal>
  );
};

export default ClienteCreateModal;
