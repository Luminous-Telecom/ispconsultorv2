import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useFormReset } from 'hooks/useFormReset';
import { useI18n } from 'contexts/I18nContext';
import { SaasParametrosService } from 'services/saas/saasParametrosService';
import { ClienteService } from 'services/clienteService';
import { saasEmpresasService } from 'services/saas/saasEmpresasService';
import { formatCNPJ, formatCEP } from 'utils/formatters';
import { isValidCNPJ } from 'utils/validators';
import {
  INITIAL_SAAS_EMPRESA_FORM,
  type SaasEmpresaExtended,
  type SaasEmpresaForm,
  type SaasEmpresaFormErrors,
} from '../types';
import { empresaToForm, getFormDataForAddress } from '../utils';

interface UseSaasEmpresaFormDataParams {
  show: boolean;
  itemId?: number | null;
}

export function useSaasEmpresaFormData({ show, itemId }: UseSaasEmpresaFormDataParams) {
  const { t } = useI18n();
  const { success, info } = useNotificationContext();
  const { showApiError } = useApiError();
  const lastCnpjConsulted = useRef<string>('');
  const lastCepConsulted = useRef<string>('');

  const [internalCreatedId, setInternalCreatedId] = useState<number | null>(null);
  const effectiveId = itemId ?? internalCreatedId;
  const isEditing = !!effectiveId;
  const empresaId = isEditing ? effectiveId! : null;

  const [form, setForm] = useState<SaasEmpresaForm>(INITIAL_SAAS_EMPRESA_FORM);
  const [errors, setErrors] = useState<SaasEmpresaFormErrors>({});

  useEffect(() => {
    if (!show) setInternalCreatedId(null);
  }, [show]);

  const { data } = useQuery({
    queryKey: ['saas-empresa', effectiveId],
    queryFn: () => saasEmpresasService.getById(effectiveId!),
    enabled: show && !!effectiveId,
  });

  const { data: parametros } = useQuery({
    queryKey: ['saas-parametros'],
    queryFn: () => SaasParametrosService.get(),
    staleTime: 60 * 1000,
    enabled: show,
  });

  useFormReset({
    show: show && !isEditing,
    initialData: INITIAL_SAAS_EMPRESA_FORM,
    setFormData: setForm,
    setErrors,
  });

  useFormReset({
    show: show && isEditing,
    initialData: INITIAL_SAAS_EMPRESA_FORM,
    setFormData: setForm,
    setErrors,
    customData: data?.data ? empresaToForm(data.data as unknown as SaasEmpresaExtended) : undefined,
  });

  useEffect(() => {
    if (show) {
      lastCnpjConsulted.current = '';
      lastCepConsulted.current = '';
    }
  }, [show, effectiveId]);

  const handleInputChange = useCallback((field: keyof SaasEmpresaForm, value: string) => {
    let formatted = value;
    if (field === 'cnpj') formatted = formatCNPJ(value);
    if (field === 'cep') formatted = formatCEP(value);
    setForm((p) => ({ ...p, [field]: formatted }));
    setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));
  }, []);

  const handleFieldChange = useCallback((field: keyof SaasEmpresaForm, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
  }, []);

  useEffect(() => {
    if (!show || isEditing || !parametros?.data?.validar_cpf_cnpj) return;
    const cnpjLimpo = form.cnpj.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14 || !isValidCNPJ(form.cnpj) || lastCnpjConsulted.current === cnpjLimpo) return;
    const camposVazios = !form.razao_social && !form.nome_fantasia && !form.endereco;
    if (!camposVazios) return;

    lastCnpjConsulted.current = cnpjLimpo;
    ClienteService.consultarCnpj(cnpjLimpo)
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data;
          setForm((prev) => ({
            ...prev,
            razao_social: d.razao_social || prev.razao_social,
            nome_fantasia: d.nome_fantasia || prev.nome_fantasia,
            cep: d.cep || prev.cep,
            endereco: d.endereco || prev.endereco,
            numero: d.numero || prev.numero,
            complemento: d.complemento || prev.complemento,
            bairro: d.bairro || prev.bairro,
            cidade: d.cidade || prev.cidade,
            estado: d.estado || prev.estado,
            telefone: d.telefone || prev.telefone,
            email: d.email || prev.email,
          }));
          success('Dados do CNPJ preenchidos automaticamente!');
        }
      })
      .catch((err) => {
        if (err?.response?.status === 404) {
          info('CNPJ não encontrado na base da Receita Federal. Você pode preencher os dados manualmente.');
        } else {
          showApiError(err, CONTEXT_ERROR_MESSAGES.EMPRESA_CNPJ_ERROR);
        }
      });
  }, [
    form.cnpj,
    form.razao_social,
    form.nome_fantasia,
    form.endereco,
    show,
    isEditing,
    parametros?.data?.validar_cpf_cnpj,
    success,
    info,
    showApiError,
  ]);

  useEffect(() => {
    if (!show || !parametros?.data?.validar_cep) return;
    const cepLimpo = form.cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8 || lastCepConsulted.current === cepLimpo) return;
    const camposVazios = !form.endereco && !form.bairro && !form.cidade && !form.estado;
    if (!camposVazios) return;

    lastCepConsulted.current = cepLimpo;
    ClienteService.buscarCep(cepLimpo)
      .then((cepData) => {
        if (cepData) {
          setForm((prev) => ({
            ...prev,
            endereco: cepData.logradouro || prev.endereco,
            bairro: cepData.bairro || prev.bairro,
            cidade: cepData.localidade || prev.cidade,
            estado: cepData.uf || prev.estado,
            complemento: cepData.complemento || prev.complemento,
          }));
          success('Dados do CEP preenchidos automaticamente!');
        }
      })
      .catch(() => { /* Não resetar em erro — evita loop infinito ao re-tentar o mesmo CEP */ });
  }, [form.cep, form.endereco, form.bairro, form.cidade, form.estado, show, parametros?.data?.validar_cep, success]);

  const formDataForAddress = useMemo(() => getFormDataForAddress(form), [form]);

  return {
    form,
    setForm,
    errors,
    setErrors,
    internalCreatedId,
    setInternalCreatedId,
    effectiveId,
    isEditing,
    empresaId,
    parametros,
    formDataForAddress,
    handleInputChange,
    handleFieldChange,
    t,
  };
}
