import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ClienteService } from '../../services/clienteService';
import { PlanoService } from '../../services/planoService';
import { BancoService } from '../../services/bancoService';
import { useNotificationContext } from '../../contexts/NotificationContext';

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

const ClientesCreate: React.FC = () => {
  const navigate = useNavigate();
  const { success, error } = useNotificationContext();

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
    dia_vencimento: 1,
    conta_boleto: 0,
    isento_mensalidade: false,
    recebe_email: true,
    recebe_sms: false,
    recebe_whatsapp: true,
    plano_id: 0,
    desconto_percentual: 0,
    desconto_valor: 0,
    data_validade_desconto: '',
    data_inicio_plano: new Date().toISOString().split('T')[0],
    observacoes: ''
  });

  const [errors, setErrors] = useState<Partial<ClienteForm>>({});

  const createClienteMutation = useMutation({
    mutationFn: ClienteService.create,
    onSuccess: () => {
      success('Cliente criado com sucesso!');
      navigate('/clientes');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Erro ao criar cliente');
    }
  });

  const { data: planos } = useQuery({
    queryKey: ['planos-ativos'],
    queryFn: () => PlanoService.findAtivos()
  });

  const { data: bancos } = useQuery({
    queryKey: ['bancos-ativos'],
    queryFn: () => BancoService.findAtivos()
  });

  const handleInputChange = (field: keyof ClienteForm, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
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
    if (!formData.tipo_cobranca) newErrors.tipo_cobranca = 'Tipo de cobrança é obrigatório';
    if (!formData.valor_primeiro_titulo) newErrors.valor_primeiro_titulo = 'Valor do primeiro título é obrigatório';
    if (!formData.conta_boleto) newErrors.conta_boleto = 'Banco para boleto é obrigatório';

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

    // Filtrar campos vazios antes de enviar
    const dataToSend = Object.fromEntries(
      Object.entries(formData).filter(([_, value]) => {
        if (value === null || value === undefined) return false;
        if (typeof value === 'string') return value.trim() !== '';
        if (typeof value === 'number') return value !== 0;
        return true;
      })
    );

    createClienteMutation.mutate(dataToSend as any);
  };

  const handleCancel = () => {
    navigate('/clientes');
  };

  // Máscaras de input
  const formatCNPJ = (value: string) => {
    let formatted = value.replace(/\D/g, '');
    formatted = formatted.replace(/^(\d{2})(\d)/, '$1.$2');
    formatted = formatted.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
    formatted = formatted.replace(/\.(\d{3})(\d)/, '.$1/$2');
    formatted = formatted.replace(/(\d{4})(\d)/, '$1-$2');
    return formatted;
  };

  const formatTelefone = (value: string) => {
    let formatted = value.replace(/\D/g, '');
    formatted = formatted.replace(/^(\d{2})(\d)/, '($1) $2');
    formatted = formatted.replace(/(\d{4})(\d)/, '$1-$2');
    return formatted;
  };

  const formatWhatsApp = (value: string) => {
    let formatted = value.replace(/\D/g, '');
    formatted = formatted.replace(/^(\d{2})(\d)/, '($1) $2');
    formatted = formatted.replace(/(\d{5})(\d)/, '$1-$2');
    return formatted;
  };

  const formatCEP = (value: string) => {
    let formatted = value.replace(/\D/g, '');
    formatted = formatted.replace(/^(\d{5})(\d)/, '$1-$2');
    return formatted;
  };

  return (
    <div className="container-fluid">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Dados do Cliente</h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
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
                        onChange={(e) => handleInputChange('cnpj', formatCNPJ(e.target.value))}
                        placeholder="00.000.000/0000-00"
                        required
                      />
                      {errors.cnpj && <div className="invalid-feedback">{errors.cnpj}</div>}
                    </div>
                  </div>
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
                        required
                      />
                      {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-8">
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
                        required
                      />
                      {errors.razao_social && <div className="invalid-feedback">{errors.razao_social}</div>}
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label htmlFor="ativo" className="form-label">Status</label>
                      <select
                        className={`form-select ${errors.ativo ? 'is-invalid' : ''}`}
                        id="ativo"
                        value={formData.ativo ? 1 : 0}
                        onChange={(e) => handleInputChange('ativo', e.target.value === '1')}
                      >
                        <option value={1}>Ativo</option>
                        <option value={0}>Inativo</option>
                      </select>
                      {errors.ativo && <div className="invalid-feedback">{errors.ativo}</div>}
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="nome_fantasia" className="form-label">Nome Fantasia</label>
                  <input
                    type="text"
                    className={`form-control ${errors.nome_fantasia ? 'is-invalid' : ''}`}
                    id="nome_fantasia"
                    value={formData.nome_fantasia}
                    onChange={(e) => handleInputChange('nome_fantasia', e.target.value)}
                  />
                  {errors.nome_fantasia && <div className="invalid-feedback">{errors.nome_fantasia}</div>}
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="telefone" className="form-label">Telefone</label>
                      <input
                        type="text"
                        className={`form-control ${errors.telefone ? 'is-invalid' : ''}`}
                        id="telefone"
                        value={formData.telefone}
                        onChange={(e) => handleInputChange('telefone', formatTelefone(e.target.value))}
                        placeholder="(00) 0000-0000"
                      />
                      {errors.telefone && <div className="invalid-feedback">{errors.telefone}</div>}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="whatsapp" className="form-label">WhatsApp</label>
                      <input
                        type="text"
                        className={`form-control ${errors.whatsapp ? 'is-invalid' : ''}`}
                        id="whatsapp"
                        value={formData.whatsapp}
                        onChange={(e) => handleInputChange('whatsapp', formatWhatsApp(e.target.value))}
                        placeholder="(00) 00000-0000"
                      />
                      {errors.whatsapp && <div className="invalid-feedback">{errors.whatsapp}</div>}
                    </div>
                  </div>
                </div>

                <h6 className="mt-4 mb-3">Endereço</h6>
                
                <div className="row">
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label htmlFor="cep" className="form-label">CEP</label>
                      <input
                        type="text"
                        className={`form-control ${errors.cep ? 'is-invalid' : ''}`}
                        id="cep"
                        value={formData.cep}
                        onChange={(e) => handleInputChange('cep', formatCEP(e.target.value))}
                        placeholder="00000-000"
                      />
                      {errors.cep && <div className="invalid-feedback">{errors.cep}</div>}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="endereco" className="form-label">Endereço</label>
                      <input
                        type="text"
                        className={`form-control ${errors.endereco ? 'is-invalid' : ''}`}
                        id="endereco"
                        value={formData.endereco}
                        onChange={(e) => handleInputChange('endereco', e.target.value)}
                      />
                      {errors.endereco && <div className="invalid-feedback">{errors.endereco}</div>}
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label htmlFor="numero" className="form-label">Número</label>
                      <input
                        type="text"
                        className={`form-control ${errors.numero ? 'is-invalid' : ''}`}
                        id="numero"
                        value={formData.numero}
                        onChange={(e) => handleInputChange('numero', e.target.value)}
                      />
                      {errors.numero && <div className="invalid-feedback">{errors.numero}</div>}
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label htmlFor="complemento" className="form-label">Complemento</label>
                      <input
                        type="text"
                        className={`form-control ${errors.complemento ? 'is-invalid' : ''}`}
                        id="complemento"
                        value={formData.complemento}
                        onChange={(e) => handleInputChange('complemento', e.target.value)}
                      />
                      {errors.complemento && <div className="invalid-feedback">{errors.complemento}</div>}
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label htmlFor="bairro" className="form-label">Bairro</label>
                      <input
                        type="text"
                        className={`form-control ${errors.bairro ? 'is-invalid' : ''}`}
                        id="bairro"
                        value={formData.bairro}
                        onChange={(e) => handleInputChange('bairro', e.target.value)}
                      />
                      {errors.bairro && <div className="invalid-feedback">{errors.bairro}</div>}
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label htmlFor="cidade" className="form-label">Cidade</label>
                      <input
                        type="text"
                        className={`form-control ${errors.cidade ? 'is-invalid' : ''}`}
                        id="cidade"
                        value={formData.cidade}
                        onChange={(e) => handleInputChange('cidade', e.target.value)}
                      />
                      {errors.cidade && <div className="invalid-feedback">{errors.cidade}</div>}
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="estado" className="form-label">Estado</label>
                      <select
                        className={`form-select ${errors.estado ? 'is-invalid' : ''}`}
                        id="estado"
                        value={formData.estado}
                        onChange={(e) => handleInputChange('estado', e.target.value)}
                      >
                        <option value="">Selecione</option>
                        <option value="AC">Acre</option>
                        <option value="AL">Alagoas</option>
                        <option value="AP">Amapá</option>
                        <option value="AM">Amazonas</option>
                        <option value="BA">Bahia</option>
                        <option value="CE">Ceará</option>
                        <option value="DF">Distrito Federal</option>
                        <option value="ES">Espírito Santo</option>
                        <option value="GO">Goiás</option>
                        <option value="MA">Maranhão</option>
                        <option value="MT">Mato Grosso</option>
                        <option value="MS">Mato Grosso do Sul</option>
                        <option value="MG">Minas Gerais</option>
                        <option value="PA">Pará</option>
                        <option value="PB">Paraíba</option>
                        <option value="PR">Paraná</option>
                        <option value="PE">Pernambuco</option>
                        <option value="PI">Piauí</option>
                        <option value="RJ">Rio de Janeiro</option>
                        <option value="RN">Rio Grande do Norte</option>
                        <option value="RS">Rio Grande do Sul</option>
                        <option value="RO">Rondônia</option>
                        <option value="RR">Roraima</option>
                        <option value="SC">Santa Catarina</option>
                        <option value="SP">São Paulo</option>
                        <option value="SE">Sergipe</option>
                        <option value="TO">Tocantins</option>
                      </select>
                      {errors.estado && <div className="invalid-feedback">{errors.estado}</div>}
                    </div>
                  </div>
                </div>

                <h6 className="mt-4 mb-3">Configurações Financeiras</h6>
                
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="tipo_cobranca" className="form-label">
                        Tipo de Cobrança <span className="text-danger">*</span>
                      </label>
                      <select
                        className={`form-select ${errors.tipo_cobranca ? 'is-invalid' : ''}`}
                        id="tipo_cobranca"
                        value={formData.tipo_cobranca}
                        onChange={(e) => handleInputChange('tipo_cobranca', e.target.value as ClienteForm['tipo_cobranca'])}
                        required
                      >
                        <option value="">Selecione o tipo</option>
                        <option value="titulo">Título</option>
                        <option value="carne">Carnê</option>
                      </select>
                      {errors.tipo_cobranca && <div className="invalid-feedback">{errors.tipo_cobranca}</div>}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="valor_primeiro_titulo" className="form-label">
                        Valor do Primeiro Título <span className="text-danger">*</span>
                      </label>
                      <select
                        className={`form-select ${errors.valor_primeiro_titulo ? 'is-invalid' : ''}`}
                        id="valor_primeiro_titulo"
                        value={formData.valor_primeiro_titulo}
                        onChange={(e) => handleInputChange('valor_primeiro_titulo', e.target.value as ClienteForm['valor_primeiro_titulo'])}
                        required
                      >
                        <option value="">Selecione o tipo</option>
                        <option value="total">Total</option>
                        <option value="proporcional">Proporcional</option>
                      </select>
                      {errors.valor_primeiro_titulo && <div className="invalid-feedback">{errors.valor_primeiro_titulo}</div>}
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="dia_vencimento" className="form-label">Dia de Vencimento</label>
                      <select
                        className={`form-select ${errors.dia_vencimento ? 'is-invalid' : ''}`}
                        id="dia_vencimento"
                        value={formData.dia_vencimento}
                        onChange={(e) => handleInputChange('dia_vencimento', parseInt(e.target.value))}
                      >
                        <option value="">Selecione o dia</option>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                      {errors.dia_vencimento && <div className="invalid-feedback">{errors.dia_vencimento}</div>}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="conta_boleto" className="form-label">
                        Banco para Boleto <span className="text-danger">*</span>
                      </label>
                      <select
                        className={`form-select ${errors.conta_boleto ? 'is-invalid' : ''}`}
                        id="conta_boleto"
                        value={formData.conta_boleto}
                        onChange={(e) => handleInputChange('conta_boleto', parseInt(e.target.value))}
                        required
                      >
                        <option value="">Selecione o banco</option>
                        {bancos?.map(banco => (
                          <option key={banco.id} value={banco.id}>
                            {banco.nome} - {banco.codigo}
                          </option>
                        ))}
                      </select>
                      {errors.conta_boleto && <div className="invalid-feedback">{errors.conta_boleto}</div>}
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Preferências de Comunicação</label>
                      <div className="row">
                        <div className="col-md-3">
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
                        <div className="col-md-3">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="recebe_email"
                              checked={formData.recebe_email}
                              onChange={(e) => handleInputChange('recebe_email', e.target.checked)}
                            />
                            <label className="form-check-label" htmlFor="recebe_email">
                              Recebe E-mails
                            </label>
                          </div>
                        </div>
                        <div className="col-md-3">
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
                        <div className="col-md-3">
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
                  </div>
                </div>

                <h6 className="mt-4 mb-3">Planos do Cliente</h6>
                
                <div className="mb-3">
                  <label htmlFor="plano_id" className="form-label">Plano Contratado</label>
                  <select
                    className={`form-select ${errors.plano_id ? 'is-invalid' : ''}`}
                    id="plano_id"
                    value={formData.plano_id}
                    onChange={(e) => handleInputChange('plano_id', parseInt(e.target.value))}
                  >
                    <option value="">Selecione um plano (opcional)</option>
                    {planos?.map(plano => (
                      <option key={plano.id} value={plano.id}>
                        {plano.nome_plano} - {plano.tipo_servico.charAt(0).toUpperCase() + plano.tipo_servico.slice(1)} - R$ {Number(plano.valor_mensal).toFixed(2).replace('.', ',')}
                      </option>
                    ))}
                  </select>
                  {errors.plano_id && <div className="invalid-feedback">{errors.plano_id}</div>}
                </div>

                {formData.plano_id > 0 && (
                  <div className="row" id="plano-config">
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label htmlFor="desconto_percentual" className="form-label">Desconto Percentual (%)</label>
                        <div className="input-group">
                          <input
                            type="number"
                            className={`form-control ${errors.desconto_percentual ? 'is-invalid' : ''}`}
                            id="desconto_percentual"
                            value={formData.desconto_percentual}
                            onChange={(e) => handleInputChange('desconto_percentual', parseFloat(e.target.value) || 0)}
                            step="0.01"
                            min="0"
                            max="100"
                          />
                          <span className="input-group-text">%</span>
                        </div>
                        {errors.desconto_percentual && <div className="invalid-feedback">{errors.desconto_percentual}</div>}
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label htmlFor="desconto_valor" className="form-label">Desconto em Valor (R$)</label>
                        <div className="input-group">
                          <span className="input-group-text">R$</span>
                          <input
                            type="number"
                            className={`form-control ${errors.desconto_valor ? 'is-invalid' : ''}`}
                            id="desconto_valor"
                            value={formData.desconto_valor}
                            onChange={(e) => handleInputChange('desconto_valor', parseFloat(e.target.value) || 0)}
                            step="0.01"
                            min="0"
                          />
                        </div>
                        {errors.desconto_valor && <div className="invalid-feedback">{errors.desconto_valor}</div>}
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label htmlFor="data_validade_desconto" className="form-label">Data de Validade do Desconto</label>
                        <input
                          type="date"
                          className={`form-control ${errors.data_validade_desconto ? 'is-invalid' : ''}`}
                          id="data_validade_desconto"
                          value={formData.data_validade_desconto}
                          onChange={(e) => handleInputChange('data_validade_desconto', e.target.value)}
                        />
                        <div className="form-text">Data até quando o desconto é válido</div>
                        {errors.data_validade_desconto && <div className="invalid-feedback">{errors.data_validade_desconto}</div>}
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label htmlFor="data_inicio_plano" className="form-label">Data de Início</label>
                        <input
                          type="date"
                          className={`form-control ${errors.data_inicio_plano ? 'is-invalid' : ''}`}
                          id="data_inicio_plano"
                          value={formData.data_inicio_plano}
                          onChange={(e) => handleInputChange('data_inicio_plano', e.target.value)}
                        />
                        {errors.data_inicio_plano && <div className="invalid-feedback">{errors.data_inicio_plano}</div>}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mb-3">
                  <label htmlFor="observacoes" className="form-label">Observações</label>
                  <textarea
                    className={`form-control ${errors.observacoes ? 'is-invalid' : ''}`}
                    id="observacoes"
                    rows={3}
                    value={formData.observacoes}
                    onChange={(e) => handleInputChange('observacoes', e.target.value)}
                  />
                  {errors.observacoes && <div className="invalid-feedback">{errors.observacoes}</div>}
                </div>

                <div className="d-flex justify-content-end gap-2">
                  <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={createClienteMutation.isPending}>
                    {createClienteMutation.isPending ? 'Salvando...' : 'Salvar Cliente'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientesCreate;