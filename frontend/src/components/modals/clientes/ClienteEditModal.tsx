import React, { useState, useEffect } from 'react';
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
  const { success, error } = useNotificationContext();
  const queryClient = useQueryClient();

  // Query para buscar cliente
  const { data: cliente, isLoading: clienteLoading } = useQuery({
    queryKey: ['cliente', clienteId],
    queryFn: () => ClienteService.getById(clienteId!),
    enabled: !!clienteId && show,
  });

  // Queries para buscar dados
  const { data: planos } = useQuery({
    queryKey: ['planos-ativos'],
    queryFn: () => PlanoService.findAtivos(),
    enabled: show,
  });

  const { data: bancos } = useQuery({
    queryKey: ['bancos-ativos'],
    queryFn: () => BancoService.findAtivos(),
    enabled: show,
  });

  // Mutation para atualizar cliente
  const updateClienteMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ClienteForm }) => ClienteService.update(id, data),
    onSuccess: () => {
      success('Cliente atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['cliente', clienteId] });
      onClose();
      onSuccess?.();
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Erro ao atualizar cliente');
    }
  });

  // Carregar dados do cliente quando disponível
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
        plano_id: cliente.plano_id || 0,
        desconto_percentual: cliente.desconto_percentual || 0,
        desconto_valor: cliente.desconto_valor || 0,
        data_validade_desconto: cliente.data_validade_desconto || '',
        data_inicio_plano: cliente.data_inicio_plano || '',
        observacoes: cliente.observacoes || ''
      });
    }
  }, [cliente]);

  const handleInputChange = (field: keyof ClienteForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clienteId) return;

    const newErrors: Partial<ClienteForm> = {};
    
    if (!formData.cnpj.trim()) newErrors.cnpj = 'CNPJ é obrigatório';
    if (!formData.razao_social.trim()) newErrors.razao_social = 'Razão social é obrigatória';
    if (!formData.email.trim()) newErrors.email = 'E-mail é obrigatório';
    if (!formData.plano_id) newErrors.plano_id = 'Plano é obrigatório';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    updateClienteMutation.mutate({ id: clienteId, data: formData });
  };

  const handleCancel = () => {
    setErrors({});
    onClose();
  };

  if (clienteLoading) {
    return (
      <DraggableModal show={show} onClose={handleCancel} title="Editar Cliente">
        <div className="text-center p-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      </DraggableModal>
    );
  }

  return (
    <DraggableModal show={show} onClose={handleCancel} title="Editar Cliente">
      <form onSubmit={handleSubmit} className="d-flex flex-column h-100">
        <div className="modal-body flex-grow-1" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <div className="row g-3">
            {/* Dados Básicos */}
            <div className="col-12">
              <h6 className="text-primary mb-3">Dados Básicos</h6>
            </div>
            
            <div className="col-md-6">
              <label htmlFor="cnpj" className="form-label">CNPJ *</label>
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

            <div className="col-md-6">
              <label htmlFor="razao_social" className="form-label">Razão Social *</label>
              <input
                type="text"
                className={`form-control ${errors.razao_social ? 'is-invalid' : ''}`}
                id="razao_social"
                value={formData.razao_social}
                onChange={(e) => handleInputChange('razao_social', e.target.value)}
                placeholder="Razão Social"
              />
              {errors.razao_social && <div className="invalid-feedback">{errors.razao_social}</div>}
            </div>

            <div className="col-md-6">
              <label htmlFor="nome_fantasia" className="form-label">Nome Fantasia</label>
              <input
                type="text"
                className="form-control"
                id="nome_fantasia"
                value={formData.nome_fantasia}
                onChange={(e) => handleInputChange('nome_fantasia', e.target.value)}
                placeholder="Nome Fantasia"
              />
            </div>

            <div className="col-md-6">
              <label htmlFor="email" className="form-label">E-mail *</label>
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

            <div className="col-md-6">
              <label htmlFor="telefone" className="form-label">Telefone</label>
              <input
                type="text"
                className="form-control"
                id="telefone"
                value={formData.telefone}
                onChange={(e) => handleInputChange('telefone', e.target.value)}
                placeholder="(11) 9999-9999"
              />
            </div>

            <div className="col-md-6">
              <label htmlFor="whatsapp" className="form-label">WhatsApp</label>
              <input
                type="text"
                className="form-control"
                id="whatsapp"
                value={formData.whatsapp}
                onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>

            {/* Endereço */}
            <div className="col-12 mt-4">
              <h6 className="text-primary mb-3">Endereço</h6>
            </div>

            <div className="col-md-3">
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

            <div className="col-md-6">
              <label htmlFor="endereco" className="form-label">Endereço</label>
              <input
                type="text"
                className="form-control"
                id="endereco"
                value={formData.endereco}
                onChange={(e) => handleInputChange('endereco', e.target.value)}
                placeholder="Rua, Avenida, etc."
              />
            </div>

            <div className="col-md-3">
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

            <div className="col-md-4">
              <label htmlFor="complemento" className="form-label">Complemento</label>
              <input
                type="text"
                className="form-control"
                id="complemento"
                value={formData.complemento}
                onChange={(e) => handleInputChange('complemento', e.target.value)}
                placeholder="Apto, Sala, etc."
              />
            </div>

            <div className="col-md-4">
              <label htmlFor="bairro" className="form-label">Bairro</label>
              <input
                type="text"
                className="form-control"
                id="bairro"
                value={formData.bairro}
                onChange={(e) => handleInputChange('bairro', e.target.value)}
                placeholder="Centro"
              />
            </div>

            <div className="col-md-2">
              <label htmlFor="cidade" className="form-label">Cidade</label>
              <input
                type="text"
                className="form-control"
                id="cidade"
                value={formData.cidade}
                onChange={(e) => handleInputChange('cidade', e.target.value)}
                placeholder="São Paulo"
              />
            </div>

            <div className="col-md-2">
              <label htmlFor="estado" className="form-label">Estado</label>
              <input
                type="text"
                className="form-control"
                id="estado"
                value={formData.estado}
                onChange={(e) => handleInputChange('estado', e.target.value)}
                placeholder="SP"
              />
            </div>

            {/* Configurações */}
            <div className="col-12 mt-4">
              <h6 className="text-primary mb-3">Configurações</h6>
            </div>

            <div className="col-md-6">
              <label htmlFor="plano_id" className="form-label">Plano *</label>
              <select
                className={`form-select ${errors.plano_id ? 'is-invalid' : ''}`}
                id="plano_id"
                value={formData.plano_id}
                onChange={(e) => handleInputChange('plano_id', parseInt(e.target.value))}
              >
                <option value={0}>Selecione um plano</option>
                {planos?.map((plano: any) => (
                  <option key={plano.id} value={plano.id}>
                    {plano.nome_plano}
                  </option>
                ))}
              </select>
              {errors.plano_id && <div className="invalid-feedback">{errors.plano_id}</div>}
            </div>

            <div className="col-md-6">
              <label htmlFor="tipo_cobranca" className="form-label">Tipo de Cobrança</label>
              <select
                className="form-select"
                id="tipo_cobranca"
                value={formData.tipo_cobranca}
                onChange={(e) => handleInputChange('tipo_cobranca', e.target.value as 'titulo' | 'carne')}
              >
                <option value="carne">Carnê</option>
                <option value="titulo">Título</option>
              </select>
            </div>

            <div className="col-md-6">
              <label htmlFor="dia_vencimento" className="form-label">Dia de Vencimento</label>
              <input
                type="number"
                className="form-control"
                id="dia_vencimento"
                value={formData.dia_vencimento}
                onChange={(e) => handleInputChange('dia_vencimento', parseInt(e.target.value))}
                min="1"
                max="31"
              />
            </div>

            <div className="col-md-6">
              <label htmlFor="conta_boleto" className="form-label">Conta Boleto</label>
              <select
                className="form-select"
                id="conta_boleto"
                value={formData.conta_boleto}
                onChange={(e) => handleInputChange('conta_boleto', parseInt(e.target.value))}
              >
                <option value={0}>Selecione uma conta</option>
                {bancos?.map((banco: any) => (
                  <option key={banco.id} value={banco.id}>
                    {banco.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 mt-4">
              <h6 className="text-primary mb-3">Observações</h6>
            </div>

            <div className="col-12">
              <label htmlFor="observacoes" className="form-label">Observações</label>
              <textarea
                className="form-control"
                id="observacoes"
                rows={3}
                value={formData.observacoes}
                onChange={(e) => handleInputChange('observacoes', e.target.value)}
                placeholder="Observações sobre o cliente..."
              />
            </div>
          </div>
        </div>

        <div className="modal-footer border-top pt-3">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCancel}
            disabled={updateClienteMutation.isPending}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={updateClienteMutation.isPending}
          >
            {updateClienteMutation.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </DraggableModal>
  );
};

export default ClienteEditModal;
