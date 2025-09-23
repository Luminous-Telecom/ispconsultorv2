import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCep } from '../../hooks/useCep';
import { useCliente, useUpdateCliente } from '../../hooks/useClientes';

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

const ClientesEdit: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const clienteId = parseInt(id || '0');

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
  
  const { data: cliente, isLoading: clienteLoading } = useCliente(clienteId);
  const updateClienteMutation = useUpdateCliente();

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
        ativo: cliente.ativo || true,
        isento_mensalidade: cliente.isento_mensalidade || false,
        recebe_email: cliente.recebe_email || true,
        recebe_sms: cliente.recebe_sms || false,
        recebe_whatsapp: cliente.recebe_whatsapp || true,
      });
    }
  }, [cliente]);

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

  const handleCepChange = async (cep: string) => {
    const cepFormatado = formatarCep(cep);
    handleInputChange('cep', cepFormatado);

    if (cepFormatado.length === 9) {
      try {
        const dadosCep = await buscarCep(cepFormatado);
        if (dadosCep) {
          handleInputChange('endereco', dadosCep.logradouro);
          handleInputChange('bairro', dadosCep.bairro);
          handleInputChange('cidade', dadosCep.localidade);
          handleInputChange('estado', dadosCep.uf);
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      }
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    updateClienteMutation.mutate(
      { id: clienteId, data: formData },
      {
        onSuccess: () => {
          navigate('/clientes');
        }
      }
    );
  };

  const handleCancel = () => {
    navigate('/clientes');
  };

  if (clienteLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">Editar Cliente</h1>
      </div>

      <div className="card">
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
                    className={`form-control ${errors.nome_fantasia ? 'is-invalid' : ''}`}
                    id="nome_fantasia"
                    value={formData.nome_fantasia}
                    onChange={(e) => handleInputChange('nome_fantasia', e.target.value)}
                    placeholder="Nome comercial"
                  />
                  {errors.nome_fantasia && <div className="invalid-feedback">{errors.nome_fantasia}</div>}
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
                    placeholder="email@empresa.com"
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
                    type="text"
                    className={`form-control ${errors.telefone ? 'is-invalid' : ''}`}
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => handleInputChange('telefone', e.target.value)}
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
                    onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                  {errors.whatsapp && <div className="invalid-feedback">{errors.whatsapp}</div>}
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-md-3">
                <div className="mb-3">
                  <label htmlFor="cep" className="form-label">
                    CEP <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control ${errors.cep ? 'is-invalid' : ''}`}
                    id="cep"
                    value={formData.cep}
                    onChange={(e) => handleCepChange(e.target.value)}
                    placeholder="00000-000"
                    disabled={cepLoading}
                  />
                  {errors.cep && <div className="invalid-feedback">{errors.cep}</div>}
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
                    className={`form-control ${errors.complemento ? 'is-invalid' : ''}`}
                    id="complemento"
                    value={formData.complemento}
                    onChange={(e) => handleInputChange('complemento', e.target.value)}
                    placeholder="Apto, Sala, etc."
                  />
                  {errors.complemento && <div className="invalid-feedback">{errors.complemento}</div>}
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
                  <input
                    type="text"
                    className={`form-control ${errors.estado ? 'is-invalid' : ''}`}
                    id="estado"
                    value={formData.estado}
                    onChange={(e) => handleInputChange('estado', e.target.value)}
                    placeholder="UF"
                    maxLength={2}
                  />
                  {errors.estado && <div className="invalid-feedback">{errors.estado}</div>}
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-md-3">
                <div className="mb-3 form-check form-switch">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="ativo"
                    checked={formData.ativo}
                    onChange={(e) => handleInputChange('ativo', e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="ativo">Ativo</label>
                </div>
              </div>
              <div className="col-md-3">
                <div className="mb-3 form-check form-switch">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="isento_mensalidade"
                    checked={formData.isento_mensalidade}
                    onChange={(e) => handleInputChange('isento_mensalidade', e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="isento_mensalidade">Isento de Mensalidade</label>
                </div>
              </div>
              <div className="col-md-3">
                <div className="mb-3 form-check form-switch">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="recebe_email"
                    checked={formData.recebe_email}
                    onChange={(e) => handleInputChange('recebe_email', e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="recebe_email">Recebe Email</label>
                </div>
              </div>
              <div className="col-md-3">
                <div className="mb-3 form-check form-switch">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="recebe_whatsapp"
                    checked={formData.recebe_whatsapp}
                    onChange={(e) => handleInputChange('recebe_whatsapp', e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="recebe_whatsapp">Recebe WhatsApp</label>
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2 mt-4">
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
                {updateClienteMutation.isPending ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Salvando...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check"></i> Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default ClientesEdit;
