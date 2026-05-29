import { useState, useEffect, useRef, useCallback } from 'react';
import { useI18n } from 'contexts/I18nContext';
import { useFornecedor, useCreateFornecedor, useUpdateFornecedor } from 'hooks/useFornecedores';
import { useFormPrefix } from 'hooks/useFormId';
import { useIsMobile } from 'hooks/useMediaQuery';
import { useCep } from 'hooks/useCep';
import { formatCPF, formatCNPJ, formatCEP } from 'utils/formatters';
import { isValidCPF, isValidCNPJ } from 'utils/validators';
import { CreateFornecedor } from 'types';
import { FornecedorService } from 'services/fornecedorService';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { DEFAULT_TAB, INITIAL_FORM_DATA } from './constants';
import {
  FornecedorFormData,
  FornecedorFormErrors,
  FornecedorModalProps,
  FornecedorTab,
} from './types';

export function useFornecedorModal({
  show,
  fornecedorId = null,
  onSuccess,
}: FornecedorModalProps) {
  const { t } = useI18n();
  const formPrefix = useFormPrefix('FornecedorModal');
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<FornecedorTab>(DEFAULT_TAB);
  const [formData, setFormData] = useState<FornecedorFormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<FornecedorFormErrors>({});

  const isEditing = !!fornecedorId;
  const { data: fornecedor, isLoading: isLoadingFornecedor } = useFornecedor(fornecedorId);
  const createMutation = useCreateFornecedor();
  const updateMutation = useUpdateFornecedor();
  const cepSearchedRef = useRef<string>('');
  const lastCnpjConsultedRef = useRef<string>('');

  const { buscarCep } = useCep();
  const { success, info } = useNotificationContext();
  const { showApiError } = useApiError();

  useEffect(() => {
    if (!show) {
      setFormData(INITIAL_FORM_DATA);
      setErrors({});
      setActiveTab(DEFAULT_TAB);
      cepSearchedRef.current = '';
      lastCnpjConsultedRef.current = '';
    }
  }, [show]);

  useEffect(() => {
    if (show && isEditing && fornecedor) {
      const cleanedCep = fornecedor.cep?.replace(/\D/g, '') || '';
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
        observacoes: fornecedor.observacoes || '',
      });
    } else if (show && !isEditing) {
      setFormData(INITIAL_FORM_DATA);
      cepSearchedRef.current = '';
    }
  }, [show, fornecedor, isEditing]);

  const clearFieldError = useCallback((field: keyof FornecedorFormData) => {
    setErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const handleInputChange = async (field: keyof FornecedorFormData, value: string) => {
    clearFieldError(field);

    if (field === 'cpf_cnpj') {
      const formatted = formData.tipo_pessoa === 'FISICA' ? formatCPF(value) : formatCNPJ(value);
      setFormData((prev) => ({ ...prev, cpf_cnpj: formatted }));

      if (formData.tipo_pessoa === 'JURIDICA' && !isEditing) {
        const cnpjLimpo = formatted.replace(/\D/g, '');

        if (cnpjLimpo.length === 14 && isValidCNPJ(formatted)) {
          if (lastCnpjConsultedRef.current === cnpjLimpo) {
            return;
          }

          const camposVazios =
            !formData.nome_razao_social && !formData.nome_fantasia && !formData.logradouro;

          if (camposVazios) {
            lastCnpjConsultedRef.current = cnpjLimpo;

            try {
              const response = await FornecedorService.consultarCnpj(cnpjLimpo);

              if (response.success && response.data) {
                const dados = response.data;

                setFormData((prev) => ({
                  ...prev,
                  nome_razao_social: dados.nome_razao_social || prev.nome_razao_social,
                  nome_fantasia: dados.nome_fantasia || prev.nome_fantasia,
                  cep: dados.cep || prev.cep,
                  logradouro: dados.logradouro || prev.logradouro,
                  numero: dados.numero || prev.numero,
                  complemento: dados.complemento || prev.complemento,
                  bairro: dados.bairro || prev.bairro,
                  cidade: dados.cidade || prev.cidade,
                  estado: dados.estado || prev.estado,
                }));

                success(t('messages.cnpjDataAutoFilled'));
              }
            } catch (err) {
              const status = (err as { response?: { status?: number } })?.response?.status;

              if (status === 404) {
                info(t('messages.cnpjNotFound'));
              } else {
                showApiError(err, CONTEXT_ERROR_MESSAGES.EMPRESA_CNPJ_ERROR);
              }
            }
          }
        }
      }

      return;
    }

    if (field === 'cep') {
      const formatted = formatCEP(value);
      setFormData((prev) => ({ ...prev, cep: formatted }));
      return;
    }

    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (isLoadingFornecedor && isEditing) {
      return;
    }

    const cleanedCep = formData.cep.replace(/\D/g, '');
    if (cleanedCep.length === 8 && show && cleanedCep !== cepSearchedRef.current) {
      cepSearchedRef.current = cleanedCep;
      buscarCep(cleanedCep)
        .then((cepData) => {
          if (cepData) {
            setFormData((prev) => ({
              ...prev,
              logradouro: cepData.logradouro || prev.logradouro,
              bairro: cepData.bairro || prev.bairro,
              cidade: cepData.localidade || prev.cidade,
              estado: cepData.uf || prev.estado,
            }));
          }
        })
        .catch(() => {
          // Ignorar erros de CEP silenciosamente
        });
    }
  }, [formData.cep, show, buscarCep, isLoadingFornecedor, isEditing]);

  useEffect(() => {
    if (!show) {
      cepSearchedRef.current = '';
    }
  }, [show]);

  const handleTipoPessoaChange = (tipoPessoa: 'FISICA' | 'JURIDICA') => {
    setFormData((prev) => ({
      ...prev,
      tipo_pessoa: tipoPessoa,
      cpf_cnpj: '',
    }));
    clearFieldError('cpf_cnpj');
  };

  const validateForm = (): boolean => {
    const newErrors: FornecedorFormErrors = {};

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
      } else if (cleaned.length !== 14 || !isValidCNPJ(formData.cpf_cnpj)) {
        newErrors.cpf_cnpj = t('messages.invalidCnpj');
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

    const submitData: CreateFornecedor = {
      tipo_pessoa: formData.tipo_pessoa,
      nome_razao_social: formData.nome_razao_social.trim(),
      nome_fantasia: formData.nome_fantasia.trim() || undefined,
      cpf_cnpj: formData.cpf_cnpj,
      cep: formData.cep.trim() || undefined,
      logradouro: formData.logradouro.trim() || undefined,
      numero: formData.numero.trim() || undefined,
      complemento: formData.complemento.trim() || undefined,
      bairro: formData.bairro.trim() || undefined,
      cidade: formData.cidade.trim() || undefined,
      estado: formData.estado.trim() || undefined,
      pais: formData.pais.trim() || undefined,
      observacoes: formData.observacoes.trim() || undefined,
    };

    try {
      if (isEditing && fornecedorId) {
        await updateMutation.mutateAsync({ id: fornecedorId, data: submitData });
      } else {
        await createMutation.mutateAsync(submitData);
      }
      onSuccess?.();
    } catch {
      // Erro já tratado pelo hook
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const formId = isEditing ? 'fornecedor-edit-form' : 'fornecedor-create-form';
  const modalId = isEditing ? 'fornecedor-edit-modal' : 'fornecedor-create-modal';
  const showHeaderActions = !(isLoadingFornecedor && isEditing);

  return {
    t,
    formPrefix,
    isMobile,
    activeTab,
    setActiveTab,
    formData,
    errors,
    isEditing,
    isLoadingFornecedor,
    handleInputChange,
    handleTipoPessoaChange,
    handleSubmit,
    isSubmitting,
    formId,
    modalId,
    showHeaderActions,
    modalTitle: t('menu.suppliers'),
  };
}
