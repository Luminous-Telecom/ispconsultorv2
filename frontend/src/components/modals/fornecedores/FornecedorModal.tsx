import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { useFornecedor, useCreateFornecedor, useUpdateFornecedor } from '@/hooks/useFornecedores';
import { useFormPrefix } from '@/hooks/useFormId';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useCep } from '@/hooks/useCep';
import { formatCPF, formatCNPJ, formatCEP } from '@/utils/formatters';
import { isValidCPF, isValidCNPJ } from '@/utils/validators';
import DraggableModal from '@/components/common/DraggableModal';
import { Button, Spinner } from '@/components/ui';
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
  const { t } = useI18n();
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

                success(t('messages.cnpjDataAutoFilled'));
              }
            } catch (err) {
              const axiosError = err as AxiosError<{ message?: string; error?: string }>;
              const status = axiosError?.response?.status;
              
              if (status === 404) {
                info(t('messages.cnpjNotFound'));
              } else {
                const errorMessage = axiosError?.response?.data?.message || 
                                   axiosError?.response?.data?.error || 
                                   t('messages.errorConsultingCnpj');
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
        // Ignorar todos os erros de CEP silenciosamente para evitar logout
        // O erro já foi tratado no hook useCep
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
      newErrors.nome_razao_social = t('messages.nameRequired');
    }

    if (!formData.cpf_cnpj.trim()) {
      newErrors.cpf_cnpj = t('messages.cpfCnpjRequired');
    } else {
      const cleaned = formData.cpf_cnpj.replace(/\D/g, '');
      if (formData.tipo_pessoa === 'FISICA') {
        if (cleaned.length !== 11 || !isValidCPF(formData.cpf_cnpj)) {
          newErrors.cpf_cnpj = t('messages.invalidCpf');
        }
      } else {
        if (cleaned.length !== 14 || !isValidCNPJ(formData.cpf_cnpj)) {
          newErrors.cpf_cnpj = t('messages.invalidCnpj');
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

    // Manter CPF/CNPJ formatado como nos clientes (formato completo: CPF = 14 chars, CNPJ = 18 chars)
    const submitData: CreateFornecedor = {
      tipo_pessoa: formData.tipo_pessoa,
      nome_razao_social: formData.nome_razao_social.trim(),
      nome_fantasia: formData.nome_fantasia.trim() || undefined,
      cpf_cnpj: formData.cpf_cnpj, // Já vem formatado do campo
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

  const modalTitle = t('menu.suppliers');

  const renderContent = () => {
    if (isLoadingFornecedor && isEditing) {
      return (
        <div className="text-center p-4">
          <Spinner size="md" variant="primary" aria-label={t('messages.loading')} />
          <p className="mt-2">{t('messages.loading')}</p>
        </div>
      );
    }

    return (
      <form id={isEditing ? 'fornecedor-edit-form' : 'fornecedor-create-form'} onSubmit={handleSubmit}>
        <div className="fornecedor-modal-content">
          {/* Conteúdo das Abas */}
          <div
            className={`tab-content fornecedor-tab-content fornecedor-tab-content-padded`}
            id="fornecedorTabContent"
          >
            {/* Aba Dados Básicos */}
            {activeTab === 'dados-basicos' && (
              <div className="d-flex flex-column gap-2">
                <div>
                  <label className="form-label">
                    {t('form.personType')}:
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
                        {t('form.personTypePhysical')}
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
                        {t('form.personTypeLegal')}
                      </label>
                    </div>
                  </div>
                  {errors.tipo_pessoa && (
                    <div className="form-text text-danger">{errors.tipo_pessoa}</div>
                  )}
                </div>

                <FormField
                  name="cpf_cnpj"
                  type="text"
                  label={formData.tipo_pessoa === 'FISICA' ? t('form.cpf') : t('form.cnpj')}
                  value={formData.cpf_cnpj}
                  onChange={(value) => handleInputChange('cpf_cnpj', value as string)}
                  placeholder={formData.tipo_pessoa === 'FISICA' ? '000.000.000-00' : t('placeholder.cnpj')}
                  required
                  error={errors.cpf_cnpj}
                  formPrefix={formPrefix}
                />

                <FormField
                  name="nome_razao_social"
                  type="text"
                  label={formData.tipo_pessoa === 'FISICA' ? t('form.name') : t('form.companyName')}
                  value={formData.nome_razao_social}
                  onChange={(value) => handleInputChange('nome_razao_social', value as string)}
                  required
                  error={errors.nome_razao_social}
                  formPrefix={formPrefix}
                />

                <FormField
                  name="nome_fantasia"
                  type="text"
                  label={t('form.tradeName')}
                  value={formData.nome_fantasia}
                  onChange={(value) => handleInputChange('nome_fantasia', value as string)}
                  error={errors.nome_fantasia}
                  formPrefix={formPrefix}
                />
              </div>
            )}

            {/* Aba Endereço */}
            {activeTab === 'endereco' && (
              <div className="d-flex flex-column gap-2">
                <FormField
                  name="cep"
                  type="text"
                  label={t('form.zipCode')}
                  value={formData.cep}
                  onChange={(value) => handleInputChange('cep', value as string)}
                  placeholder="00000-000"
                  error={errors.cep}
                  formPrefix={formPrefix}
                />

                <FormField
                  name="logradouro"
                  type="text"
                  label={t('form.address')}
                  value={formData.logradouro}
                  onChange={(value) => handleInputChange('logradouro', value as string)}
                  error={errors.logradouro}
                  formPrefix={formPrefix}
                />

                <div className="d-flex gap-2">
                  <div className="flex-fill">
                    <FormField
                      name="numero"
                      type="text"
                      label={t('form.number')}
                      value={formData.numero}
                      onChange={(value) => handleInputChange('numero', value as string)}
                      error={errors.numero}
                      formPrefix={formPrefix}
                    />
                  </div>
                  <div className="flex-fill">
                    <FormField
                      name="complemento"
                      type="text"
                      label={t('form.complement')}
                      value={formData.complemento}
                      onChange={(value) => handleInputChange('complemento', value as string)}
                      error={errors.complemento}
                      formPrefix={formPrefix}
                    />
                  </div>
                </div>

                <div className="d-flex gap-2">
                  <div className="flex-fill">
                    <FormField
                      name="bairro"
                      type="text"
                      label={t('form.neighborhood')}
                      value={formData.bairro}
                      onChange={(value) => handleInputChange('bairro', value as string)}
                      error={errors.bairro}
                      formPrefix={formPrefix}
                    />
                  </div>
                  <div className="flex-fill">
                    <FormField
                      name="cidade"
                      type="text"
                      label={t('form.city')}
                      value={formData.cidade}
                      onChange={(value) => handleInputChange('cidade', value as string)}
                      error={errors.cidade}
                      formPrefix={formPrefix}
                    />
                  </div>
                  <div style={{ width: '80px' }}>
                    <FormField
                      name="estado"
                      type="text"
                      label={t('form.state')}
                      value={formData.estado}
                      onChange={(value) => handleInputChange('estado', (value as string).toUpperCase())}
                      maxLength={2}
                      error={errors.estado}
                      formPrefix={formPrefix}
                    />
                  </div>
                </div>

                <FormField
                  name="pais"
                  type="text"
                  label={t('form.country')}
                  value={formData.pais}
                  onChange={(value) => handleInputChange('pais', value as string)}
                  error={errors.pais}
                  formPrefix={formPrefix}
                />
              </div>
            )}

            {/* Aba Observações */}
            {activeTab === 'observacoes' && (
              <div className="row">
                <div className="col-md-12 mb-1">
                  <FormField
                    name="observacoes"
                    type="textarea"
                    label={t('form.observations')}
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
          <div className="fornecedor-header-unified">
            {/* Botões à direita */}
            <div className="fornecedor-header-buttons">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
              >
                {t('buttons.cancel')}
              </Button>
              <Button
                type="submit"
                form={isEditing ? 'fornecedor-edit-form' : 'fornecedor-create-form'}
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
              >
                {t('buttons.save')}
              </Button>
            </div>

            {/* Abas na parte inferior do header */}
            <div className="fornecedor-header-tabs">
              <ul
                className={`nav nav-tabs fornecedor-tabs-unified ${isMobile ? 'fornecedor-tabs-mobile' : ''}`}
                id="fornecedorTab"
                role="tablist"
                style={{
                  margin: 0,
                  padding: 0,
                  borderBottom: 'none',
                  backgroundColor: 'transparent'
                }}
              >
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link modal-tab-hover ${activeTab === 'dados-basicos' ? 'active' : ''}`}
                    type="button"
                    onClick={() => setActiveTab('dados-basicos')}
                  >
                    {t('tabs.basicData')}
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link modal-tab-hover ${activeTab === 'endereco' ? 'active' : ''}`}
                    type="button"
                    onClick={() => setActiveTab('endereco')}
                  >
                    {t('tabs.address')}
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link modal-tab-hover ${activeTab === 'observacoes' ? 'active' : ''}`}
                    type="button"
                    onClick={() => setActiveTab('observacoes')}
                  >
                    {t('tabs.observations')}
                  </button>
                </li>
              </ul>
            </div>
          </div>
        ) : undefined
      }
    >
      {renderContent()}
    </DraggableModal>
  );
};

export default FornecedorModal;

