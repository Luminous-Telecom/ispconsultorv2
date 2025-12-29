import React, { useState, useEffect, useRef } from 'react';
import { useFornecedor, useCreateFornecedor, useUpdateFornecedor } from '@/hooks/useFornecedores';
import { useFormPrefix } from '@/hooks/useFormId';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useCep } from '@/hooks/useCep';
import { formatCPF, formatCNPJ, formatCEP } from '@/utils/formatters';
import { isValidCPF, isValidCNPJ } from '@/utils/validators';
import DraggableModal from '@/components/common/DraggableModal';
import { Button } from '@/components/ui';
import FormField from '@/components/ui/FormField';
import { CreateFornecedor } from '@/types';
import { FornecedorService } from '@/services/fornecedorService';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { AxiosError } from 'axios';

interface FornecedorModalProps {
  show: boolean;
  onClose: () => void;
  fornecedorId?: number | null;
  onSuccess?: () => void;
}

interface FornecedorFormData {
  tipo_pessoa: 'FISICA' | 'JURIDICA';
  nome_razao_social: string;
  nome_fantasia: string;
  cpf_cnpj: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  pais: string;
  observacoes: string;
}

const initialFormData: FornecedorFormData = {
  tipo_pessoa: 'JURIDICA',
  nome_razao_social: '',
  nome_fantasia: '',
  cpf_cnpj: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  pais: 'Brasil',
  observacoes: ''
};

const FornecedorModal: React.FC<FornecedorModalProps> = ({ 
  show, 
  onClose, 
  fornecedorId = null,
  onSuccess 
}) => {
  const formPrefix = useFormPrefix('FornecedorModal');
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('dados-basicos');
  const [formData, setFormData] = useState<FornecedorFormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FornecedorFormData, string>>>({});

  const isEditing = !!fornecedorId;
  const { data: fornecedor, isLoading: isLoadingFornecedor } = useFornecedor(fornecedorId);
  const createMutation = useCreateFornecedor();
  const updateMutation = useUpdateFornecedor();
  const cepSearchedRef = useRef<string>('');
  const lastCnpjConsultedRef = useRef<string>('');

  const { buscarCep } = useCep();
  const { success, error, info } = useNotificationContext();

  // Resetar formulário quando modal fechar
  useEffect(() => {
    if (!show) {
      setFormData(initialFormData);
      setErrors({});
      setActiveTab('dados-basicos');
      cepSearchedRef.current = '';
      lastCnpjConsultedRef.current = '';
    }
  }, [show]);

  // Carregar dados do fornecedor quando disponível (apenas em modo edição)
  useEffect(() => {
    if (show && isEditing && fornecedor) {
      const cleanedCep = fornecedor.cep?.replace(/\D/g, '') || '';
      // Marcar CEP como já buscado para evitar busca automática ao carregar
      if (cleanedCep.length === 8) {
        cepSearchedRef.current = cleanedCep;
      }
      setFormData({
        tipo_pessoa: fornecedor.tipo_pessoa,
        nome_razao_social: fornecedor.nome_razao_social || '',
        nome_fantasia: fornecedor.nome_fantasia || '',
        cpf_cnpj: fornecedor.cpf_cnpj || '',
        cep: fornecedor.cep || '',
        logradouro: fornecedor.logradouro || '',
        numero: fornecedor.numero || '',
        complemento: fornecedor.complemento || '',
        bairro: fornecedor.bairro || '',
        cidade: fornecedor.cidade || '',
        estado: fornecedor.estado || '',
        pais: fornecedor.pais || 'Brasil',
        observacoes: fornecedor.observacoes || ''
      });
    } else if (show && !isEditing) {
      // Resetar para dados iniciais quando criar novo fornecedor
      setFormData(initialFormData);
      cepSearchedRef.current = '';
    }
  }, [show, fornecedor, isEditing]);

  const handleInputChange = async (field: keyof FornecedorFormData, value: string) => {
    // Limpar erro do campo quando começar a digitar
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // Formatação automática de CPF/CNPJ
    if (field === 'cpf_cnpj') {
      const formatted = formData.tipo_pessoa === 'FISICA' ? formatCPF(value) : formatCNPJ(value);
      setFormData(prev => ({ ...prev, cpf_cnpj: formatted }));
      
      // Se for CNPJ (pessoa jurídica) e estiver completo e válido, consultar dados
      if (formData.tipo_pessoa === 'JURIDICA' && !isEditing) {
        const cnpjLimpo = formatted.replace(/\D/g, '');
        
        // Verificar se CNPJ está completo (14 dígitos) e válido
        if (cnpjLimpo.length === 14 && isValidCNPJ(formatted)) {
          // Verificar se já consultou este CNPJ para evitar consultas duplicadas
          if (lastCnpjConsultedRef.current === cnpjLimpo) {
            return;
          }

          // Verificar se os campos já estão preenchidos (não sobrescrever se usuário já preencheu)
          const camposVazios = !formData.nome_razao_social && !formData.nome_fantasia && !formData.logradouro;
          
          if (camposVazios) {
            lastCnpjConsultedRef.current = cnpjLimpo;

            try {
              const response = await FornecedorService.consultarCnpj(cnpjLimpo);
              
              if (response.success && response.data) {
                const dados = response.data;
                
                // Preencher campos automaticamente
                setFormData(prev => ({
                  ...prev,
                  nome_razao_social: dados.nome_razao_social || prev.nome_razao_social,
                  nome_fantasia: dados.nome_fantasia || prev.nome_fantasia,
                  cep: dados.cep || prev.cep,
                  logradouro: dados.logradouro || prev.logradouro,
                  numero: dados.numero || prev.numero,
                  complemento: dados.complemento || prev.complemento,
                  bairro: dados.bairro || prev.bairro,
                  cidade: dados.cidade || prev.cidade,
                  estado: dados.estado || prev.estado
                }));

                success('Dados do CNPJ preenchidos automaticamente!');
              }
            } catch (err) {
              const axiosError = err as AxiosError<{ message?: string; error?: string }>;
              const status = axiosError?.response?.status;
              
              if (status === 404) {
                info('CNPJ não encontrado na base da Receita Federal. Você pode preencher os dados manualmente.');
              } else {
                const errorMessage = axiosError?.response?.data?.message || 
                                   axiosError?.response?.data?.error || 
                                   'Erro ao consultar CNPJ. Tente novamente ou preencha os dados manualmente.';
                error(errorMessage);
              }
            }
          }
        }
      }
      
      return;
    }

    // Formatação de CEP
    if (field === 'cep') {
      const formatted = formatCEP(value);
      setFormData(prev => ({ ...prev, cep: formatted }));
      return;
    }

    // Outros campos
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Buscar CEP automaticamente quando tiver 8 dígitos (apenas quando o usuário digitar)
  useEffect(() => {
    // Não buscar se estiver carregando dados do fornecedor
    if (isLoadingFornecedor && isEditing) {
      return;
    }
    
    const cleanedCep = formData.cep.replace(/\D/g, '');
    if (cleanedCep.length === 8 && show && cleanedCep !== cepSearchedRef.current) {
      cepSearchedRef.current = cleanedCep;
      buscarCep(cleanedCep).then(cepData => {
        if (cepData) {
          setFormData(prev => ({
            ...prev,
            logradouro: cepData.logradouro || prev.logradouro,
            bairro: cepData.bairro || prev.bairro,
            cidade: cepData.localidade || prev.cidade,
            estado: cepData.uf || prev.estado
          }));
        }
      }).catch(() => {
        // Ignorar erros de CEP
      });
    }
  }, [formData.cep, show, buscarCep, isLoadingFornecedor, isEditing]);

  // Resetar ref quando modal fechar
  useEffect(() => {
    if (!show) {
      cepSearchedRef.current = '';
    }
  }, [show]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FornecedorFormData, string>> = {};

    if (!formData.nome_razao_social.trim()) {
      newErrors.nome_razao_social = 'Nome/Razão Social é obrigatório';
    }

    if (!formData.cpf_cnpj.trim()) {
      newErrors.cpf_cnpj = 'CPF/CNPJ é obrigatório';
    } else {
      const cleaned = formData.cpf_cnpj.replace(/\D/g, '');
      if (formData.tipo_pessoa === 'FISICA') {
        if (cleaned.length !== 11 || !isValidCPF(formData.cpf_cnpj)) {
          newErrors.cpf_cnpj = 'CPF inválido';
        }
      } else {
        if (cleaned.length !== 14 || !isValidCNPJ(formData.cpf_cnpj)) {
          newErrors.cpf_cnpj = 'CNPJ inválido';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const cleanedCpfCnpj = formData.cpf_cnpj.replace(/\D/g, '');
    const submitData: CreateFornecedor = {
      tipo_pessoa: formData.tipo_pessoa,
      nome_razao_social: formData.nome_razao_social.trim(),
      nome_fantasia: formData.nome_fantasia.trim() || undefined,
      cpf_cnpj: cleanedCpfCnpj,
      cep: formData.cep.trim() || undefined,
      logradouro: formData.logradouro.trim() || undefined,
      numero: formData.numero.trim() || undefined,
      complemento: formData.complemento.trim() || undefined,
      bairro: formData.bairro.trim() || undefined,
      cidade: formData.cidade.trim() || undefined,
      estado: formData.estado.trim() || undefined,
      pais: formData.pais.trim() || undefined,
      observacoes: formData.observacoes.trim() || undefined
    };

    try {
      if (isEditing && fornecedorId) {
        await updateMutation.mutateAsync({ id: fornecedorId, data: submitData });
      } else {
        await createMutation.mutateAsync(submitData);
      }
      onSuccess?.();
      // Não fechar o modal automaticamente - permitir múltiplas edições
    } catch (error) {
      // Erro já tratado pelo hook
    }
  };

  const modalTitle = isLoadingFornecedor && isEditing 
    ? 'Fornecedor' 
    : (isEditing ? 'Editar Fornecedor' : 'Novo Fornecedor');

  const renderContent = () => {
    if (isLoadingFornecedor && isEditing) {
      return (
        <div className="text-center p-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
          <p className="mt-2">Carregando dados do fornecedor...</p>
        </div>
      );
    }

    return (
      <form id={isEditing ? 'fornecedor-edit-form' : 'fornecedor-create-form'} onSubmit={handleSubmit}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Navegação por Abas */}
          <ul className="nav nav-tabs" role="tablist" style={{ 
            flexShrink: 0, 
            marginBottom: isMobile ? '1rem' : 0, 
            marginTop: isMobile ? '0' : '1rem', 
            marginLeft: isMobile ? '0' : '1rem', 
            marginRight: isMobile ? '0' : '1rem'
          }}>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'dados-basicos' ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveTab('dados-basicos')}
              >
                Dados Básicos
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'endereco' ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveTab('endereco')}
              >
                Endereço
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'observacoes' ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveTab('observacoes')}
              >
                Observações
              </button>
            </li>
          </ul>

          {/* Conteúdo das Abas */}
          <div 
            className="tab-content" 
            style={{ 
              flex: 1, 
              overflow: 'auto', 
              padding: isMobile ? '0' : '16px',
              minHeight: 0
            }}
          >
            {/* Aba Dados Básicos */}
            {activeTab === 'dados-basicos' && (
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    Tipo de Pessoa:
                    <span className="text-danger ms-1">*</span>
                  </label>
                  <div className="d-flex gap-3 mt-2">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name={`${formPrefix}-tipo_pessoa`}
                        id={`${formPrefix}-tipo_pessoa_fisica`}
                        value="FISICA"
                        checked={formData.tipo_pessoa === 'FISICA'}
                        onChange={() => {
                          setFormData(prev => ({ 
                            ...prev, 
                            tipo_pessoa: 'FISICA',
                            cpf_cnpj: '' // Limpar CPF/CNPJ ao mudar tipo
                          }));
                          // Limpar erro de CPF/CNPJ
                          if (errors.cpf_cnpj) {
                            setErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.cpf_cnpj;
                              return newErrors;
                            });
                          }
                        }}
                      />
                      <label className="form-check-label" htmlFor={`${formPrefix}-tipo_pessoa_fisica`}>
                        Física
                      </label>
                    </div>
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name={`${formPrefix}-tipo_pessoa`}
                        id={`${formPrefix}-tipo_pessoa_juridica`}
                        value="JURIDICA"
                        checked={formData.tipo_pessoa === 'JURIDICA'}
                        onChange={() => {
                          setFormData(prev => ({ 
                            ...prev, 
                            tipo_pessoa: 'JURIDICA',
                            cpf_cnpj: '' // Limpar CPF/CNPJ ao mudar tipo
                          }));
                          // Limpar erro de CPF/CNPJ
                          if (errors.cpf_cnpj) {
                            setErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.cpf_cnpj;
                              return newErrors;
                            });
                          }
                        }}
                      />
                      <label className="form-check-label" htmlFor={`${formPrefix}-tipo_pessoa_juridica`}>
                        Jurídica
                      </label>
                    </div>
                  </div>
                  {errors.tipo_pessoa && (
                    <div className="form-text text-danger">{errors.tipo_pessoa}</div>
                  )}
                </div>

                <div className="col-md-6 mb-3">
                  <FormField
                    name="cpf_cnpj"
                    type="text"
                    label={formData.tipo_pessoa === 'FISICA' ? 'CPF' : 'CNPJ'}
                    value={formData.cpf_cnpj}
                    onChange={(value) => handleInputChange('cpf_cnpj', value as string)}
                    placeholder={formData.tipo_pessoa === 'FISICA' ? '000.000.000-00' : '00.000.000/0000-00'}
                    required
                    error={errors.cpf_cnpj}
                    formPrefix={formPrefix}
                  />
                </div>

                <div className="col-md-8 mb-3">
                  <FormField
                    name="nome_razao_social"
                    type="text"
                    label={formData.tipo_pessoa === 'FISICA' ? 'Nome' : 'Razão Social'}
                    value={formData.nome_razao_social}
                    onChange={(value) => handleInputChange('nome_razao_social', value as string)}
                    required
                    error={errors.nome_razao_social}
                    formPrefix={formPrefix}
                  />
                </div>

                <div className="col-md-4 mb-3">
                  <FormField
                    name="nome_fantasia"
                    type="text"
                    label="Nome Fantasia"
                    value={formData.nome_fantasia}
                    onChange={(value) => handleInputChange('nome_fantasia', value as string)}
                    error={errors.nome_fantasia}
                    formPrefix={formPrefix}
                  />
                </div>
              </div>
            )}

            {/* Aba Endereço */}
            {activeTab === 'endereco' && (
              <div className="row">
                <div className="col-md-3 mb-3">
                  <FormField
                    name="cep"
                    type="text"
                    label="CEP"
                    value={formData.cep}
                    onChange={(value) => handleInputChange('cep', value as string)}
                    placeholder="00000-000"
                    error={errors.cep}
                    formPrefix={formPrefix}
                  />
                </div>

                <div className="col-md-7 mb-3">
                  <FormField
                    name="logradouro"
                    type="text"
                    label="Logradouro"
                    value={formData.logradouro}
                    onChange={(value) => handleInputChange('logradouro', value as string)}
                    error={errors.logradouro}
                    formPrefix={formPrefix}
                  />
                </div>

                <div className="col-md-2 mb-3">
                  <FormField
                    name="numero"
                    type="text"
                    label="Número"
                    value={formData.numero}
                    onChange={(value) => handleInputChange('numero', value as string)}
                    error={errors.numero}
                    formPrefix={formPrefix}
                  />
                </div>

                <div className="col-md-4 mb-3">
                  <FormField
                    name="complemento"
                    type="text"
                    label="Complemento"
                    value={formData.complemento}
                    onChange={(value) => handleInputChange('complemento', value as string)}
                    error={errors.complemento}
                    formPrefix={formPrefix}
                  />
                </div>

                <div className="col-md-4 mb-3">
                  <FormField
                    name="bairro"
                    type="text"
                    label="Bairro"
                    value={formData.bairro}
                    onChange={(value) => handleInputChange('bairro', value as string)}
                    error={errors.bairro}
                    formPrefix={formPrefix}
                  />
                </div>

                <div className="col-md-3 mb-3">
                  <FormField
                    name="cidade"
                    type="text"
                    label="Cidade"
                    value={formData.cidade}
                    onChange={(value) => handleInputChange('cidade', value as string)}
                    error={errors.cidade}
                    formPrefix={formPrefix}
                  />
                </div>

                <div className="col-md-1 mb-3">
                  <FormField
                    name="estado"
                    type="text"
                    label="UF"
                    value={formData.estado}
                    onChange={(value) => handleInputChange('estado', (value as string).toUpperCase())}
                    maxLength={2}
                    error={errors.estado}
                    formPrefix={formPrefix}
                  />
                </div>

                <div className="col-md-12 mb-3">
                  <FormField
                    name="pais"
                    type="text"
                    label="País"
                    value={formData.pais}
                    onChange={(value) => handleInputChange('pais', value as string)}
                    error={errors.pais}
                    formPrefix={formPrefix}
                  />
                </div>
              </div>
            )}

            {/* Aba Observações */}
            {activeTab === 'observacoes' && (
              <div className="row">
                <div className="col-md-12 mb-3">
                  <FormField
                    name="observacoes"
                    type="textarea"
                    label="Observações"
                    value={formData.observacoes}
                    onChange={(value) => handleInputChange('observacoes', value as string)}
                    rows={8}
                    error={errors.observacoes}
                    formPrefix={formPrefix}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </form>
    );
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={modalTitle}
      size="xl"
      modalId={isEditing ? 'fornecedor-edit-modal' : 'fornecedor-create-modal'}
      headerActions={
        !(isLoadingFornecedor && isEditing) ? (
          <div className="d-flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form={isEditing ? 'fornecedor-edit-form' : 'fornecedor-create-form'}
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
            >
              Salvar
            </Button>
          </div>
        ) : undefined
      }
    >
      {renderContent()}
    </DraggableModal>
  );
};

export default FornecedorModal;

