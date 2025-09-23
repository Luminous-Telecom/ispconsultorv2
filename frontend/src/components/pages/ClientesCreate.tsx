import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCep } from '../../hooks/useCep';
import { useCreateCliente } from '../../hooks/useClientes';

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
  isento_mensalidade: boolean;
  recebe_email: boolean;
  recebe_sms: boolean;
  recebe_whatsapp: boolean;
}

const ClientesCreate: React.FC = () => {
  const navigate = useNavigate();
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
    isento_mensalidade: false,
    recebe_email: true,
    recebe_sms: false,
    recebe_whatsapp: true,
  });

  const [errors, setErrors] = useState<Partial<ClienteForm>>({});
  const { buscarCep, formatarCep, isLoading: cepLoading } = useCep();
  const createClienteMutation = useCreateCliente();

  const handleInputChange = (field: keyof ClienteForm, value: string | boolean) => {
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
    const newErrors: Partial<ClienteForm> = {};

    if (!formData.cnpj) newErrors.cnpj = 'CNPJ é obrigatório';
    if (!formData.razao_social) newErrors.razao_social = 'Razão social é obrigatória';
    if (!formData.email) newErrors.email = 'Email é obrigatório';
    if (!formData.cep) newErrors.cep = 'CEP é obrigatório';
    if (!formData.endereco) newErrors.endereco = 'Endereço é obrigatório';
    if (!formData.numero) newErrors.numero = 'Número é obrigatório';
    if (!formData.bairro) newErrors.bairro = 'Bairro é obrigatório';
    if (!formData.cidade) newErrors.cidade = 'Cidade é obrigatória';
    if (!formData.estado) newErrors.estado = 'Estado é obrigatório';

    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    createClienteMutation.mutate(formData, {
      onSuccess: () => {
        navigate('/clientes');
      }
    });
  };

  const handleCancel = () => {
    navigate('/clientes');
  };

  const handleBuscarCep = async () => {
    if (!formData.cep) {
      return;
    }

    const cepData = await buscarCep(formData.cep);
    if (cepData) {
      setFormData(prev => ({
        ...prev,
        endereco: cepData.logradouro,
        bairro: cepData.bairro,
        cidade: cepData.localidade,
        estado: cepData.uf,
      }));
    }
  };

  return (
    <>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">Novo Cliente</h1>
        <div className="btn-group" role="group">
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={handleCancel}
          >
            <i className="bi bi-arrow-left"></i> Voltar
          </button>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-8">
          <div className="card shadow">
            <div className="card-header py-3" style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #e3e6f0' }}>
              <h6 className="m-0 font-weight-bold text-primary" style={{ fontWeight: 'bold', color: '#007bff' }}>
                Dados do Cliente
              </h6>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                {/* Dados Básicos */}
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
                  </div>
                  <div className="col-md-6">
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
                        placeholder="Nome da empresa"
                      />
                      {errors.razao_social && <div className="invalid-feedback">{errors.razao_social}</div>}
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="nome_fantasia" className="form-label">Nome Fantasia</label>
                      <input
                        type="text"
                        className="form-control"
                        id="nome_fantasia"
                        value={formData.nome_fantasia}
                        onChange={(e) => handleInputChange('nome_fantasia', e.target.value)}
                        placeholder="Nome comercial (opcional)"
                      />
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
                        placeholder="email@exemplo.com"
                      />
                      {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="telefone" className="form-label">Telefone</label>
                      <input
                        type="tel"
                        className="form-control"
                        id="telefone"
                        value={formData.telefone}
                        onChange={(e) => handleInputChange('telefone', e.target.value)}
                        placeholder="(11) 3333-4444"
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="whatsapp" className="form-label">WhatsApp</label>
                      <input
                        type="tel"
                        className="form-control"
                        id="whatsapp"
                        value={formData.whatsapp}
                        onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                  </div>
                </div>

                <hr className="my-4" />
                <h5 className="mb-3">Endereço</h5>

                <div className="row">
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label htmlFor="cep" className="form-label">
                        CEP <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <input
                          type="text"
                          className={`form-control ${errors.cep ? 'is-invalid' : ''}`}
                          id="cep"
                          value={formData.cep}
                          onChange={(e) => handleInputChange('cep', formatarCep(e.target.value))}
                          placeholder="00000-000"
                          maxLength={9}
                        />
                        <button 
                          className="btn btn-outline-secondary" 
                          type="button"
                          onClick={handleBuscarCep}
                          disabled={cepLoading || !formData.cep}
                        >
                          {cepLoading ? (
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          ) : (
                            <i className="bi bi-search"></i>
                          )}
                        </button>
                        {errors.cep && <div className="invalid-feedback">{errors.cep}</div>}
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="endereco" className="form-label">
                        Endereço <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${errors.endereco ? 'is-invalid' : ''}`}
                        id="endereco"
                        value={formData.endereco}
                        onChange={(e) => handleInputChange('endereco', e.target.value)}
                        placeholder="Rua, Avenida, etc."
                      />
                      {errors.endereco && <div className="invalid-feedback">{errors.endereco}</div>}
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label htmlFor="numero" className="form-label">
                        Número <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${errors.numero ? 'is-invalid' : ''}`}
                        id="numero"
                        value={formData.numero}
                        onChange={(e) => handleInputChange('numero', e.target.value)}
                        placeholder="123"
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
                        className="form-control"
                        id="complemento"
                        value={formData.complemento}
                        onChange={(e) => handleInputChange('complemento', e.target.value)}
                        placeholder="Sala, Andar, etc."
                      />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label htmlFor="bairro" className="form-label">
                        Bairro <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${errors.bairro ? 'is-invalid' : ''}`}
                        id="bairro"
                        value={formData.bairro}
                        onChange={(e) => handleInputChange('bairro', e.target.value)}
                        placeholder="Nome do bairro"
                      />
                      {errors.bairro && <div className="invalid-feedback">{errors.bairro}</div>}
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="mb-3">
                      <label htmlFor="cidade" className="form-label">
                        Cidade <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${errors.cidade ? 'is-invalid' : ''}`}
                        id="cidade"
                        value={formData.cidade}
                        onChange={(e) => handleInputChange('cidade', e.target.value)}
                        placeholder="Cidade"
                      />
                      {errors.cidade && <div className="invalid-feedback">{errors.cidade}</div>}
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="mb-3">
                      <label htmlFor="estado" className="form-label">
                        Estado <span className="text-danger">*</span>
                      </label>
                      <select
                        className={`form-select ${errors.estado ? 'is-invalid' : ''}`}
                        id="estado"
                        value={formData.estado}
                        onChange={(e) => handleInputChange('estado', e.target.value)}
                      >
                        <option value="">UF</option>
                        <option value="AC">AC</option>
                        <option value="AL">AL</option>
                        <option value="AP">AP</option>
                        <option value="AM">AM</option>
                        <option value="BA">BA</option>
                        <option value="CE">CE</option>
                        <option value="DF">DF</option>
                        <option value="ES">ES</option>
                        <option value="GO">GO</option>
                        <option value="MA">MA</option>
                        <option value="MT">MT</option>
                        <option value="MS">MS</option>
                        <option value="MG">MG</option>
                        <option value="PA">PA</option>
                        <option value="PB">PB</option>
                        <option value="PR">PR</option>
                        <option value="PE">PE</option>
                        <option value="PI">PI</option>
                        <option value="RJ">RJ</option>
                        <option value="RN">RN</option>
                        <option value="RS">RS</option>
                        <option value="RO">RO</option>
                        <option value="RR">RR</option>
                        <option value="SC">SC</option>
                        <option value="SP">SP</option>
                        <option value="SE">SE</option>
                        <option value="TO">TO</option>
                      </select>
                      {errors.estado && <div className="invalid-feedback">{errors.estado}</div>}
                    </div>
                  </div>
                </div>

                <hr className="my-4" />
                
                <div className="row">
                  <div className="col-md-12">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id="ativo"
                        checked={formData.ativo}
                        onChange={(e) => handleInputChange('ativo', e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="ativo">
                        Cliente ativo
                      </label>
                    </div>
                  </div>
                </div>

                <div className="d-flex justify-content-end gap-2 mt-4">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={handleCancel}
                    disabled={createClienteMutation.isPending}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={createClienteMutation.isPending}
                  >
                    {createClienteMutation.isPending ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check"></i> Salvar Cliente
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card shadow">
            <div className="card-header py-3" style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #e3e6f0' }}>
              <h6 className="m-0 font-weight-bold text-primary" style={{ fontWeight: 'bold', color: '#007bff' }}>
                Informações
              </h6>
            </div>
            <div className="card-body">
              <div className="alert alert-info">
                <i className="bi bi-info-circle me-2"></i>
                <strong>Dicas:</strong>
                <ul className="mb-0 mt-2">
                  <li>Preencha todos os campos obrigatórios marcados com <span className="text-danger">*</span></li>
                  <li>O CNPJ deve ser válido e único no sistema</li>
                  <li>O email será usado para notificações</li>
                  <li>Você pode ativar/desativar o cliente a qualquer momento</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ClientesCreate;
