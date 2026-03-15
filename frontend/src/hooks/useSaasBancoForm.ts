/**
 * Hook para gerenciar formulário de banco SaaS (SuperAdmin)
 * Mesma estrutura do useBancoForm, usando saasBancoService
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { saasBancoService, type SaasBanco } from '../services/saas/saasConfigService';
import { buildWebhookUrlSaas } from '../utils/webhookUtils';
import { useNotificationContext } from '../components/notifications/NotificationProvider';
import { BancoForm } from '../components/modals/bancos/banco/types';
import { bancoSchema } from '../schemas/banco.schema';
import type { BancoFormData as ZodBancoFormData } from '../schemas/banco.schema';
import { FormValue } from '../types/common';

interface UseSaasBancoFormParams {
  bancoId: number | null;
  show: boolean;
  onSuccess?: () => void;
}

const getInitialUrlRetorno = (tipo: 'efi' | 'asaas') => buildWebhookUrlSaas(tipo);

const initialFormData: BancoForm = {
  nome: '', codigo: '364', descricao: '', ativo: true, tipo_banco: 'efi',
  api_url: '', api_key: '', api_secret: '', webhook_secret: '', has_api_key: false, sandbox: true,
  identificador_conta: '', client_id_producao: '', client_secret_producao: '', url_retorno: getInitialUrlRetorno('efi'),
  repassar_email_cliente: false, percentual_multa: 2, percentual_juros: 0.03, desconto_tipo: 'fixo', desconto_valor: 0,
  contra_apresentacao: false, recalcular_segunda_via: false, maximo_dias_recalcular: 0,
  layout_web: 'normal', layout_pdf: 'normal', layout_carne: '', local_pagamento: '', dados_avalista: '',
  exibir_mes_referente: false, taxa_cobranca: 0, incluir_taxa: false,
  observacao_linha_1: '', observacao_linha_2: '', observacao_linha_3: '', observacao_linha_4: '',
  instrucao_linha_1: '', instrucao_linha_2: '', instrucao_linha_3: '', instrucao_linha_4: '', instrucao_linha_5: '',
};

const mapSaasBancoToForm = (d: SaasBanco): BancoForm => {
  const tipo = (d.tipo_banco || 'efi') as 'efi' | 'asaas';
  const urlFallback = (tipo === 'efi' || tipo === 'asaas') ? buildWebhookUrlSaas(tipo) : '/webhook/efi';
  return {
  nome: d.nome || '', codigo: d.codigo || '364', descricao: d.descricao || '', ativo: d.ativo ?? true,
  tipo_banco: d.tipo_banco || 'efi', api_url: d.api_url || '', api_key: d.api_key || '', api_secret: d.api_secret || '',
  webhook_secret: d.webhook_secret || '', has_api_key: !!(d as { api_key?: string }).api_key, sandbox: d.sandbox ?? true,
  identificador_conta: d.identificador_conta || '', client_id_producao: d.client_id_producao || '',
  client_secret_producao: d.client_secret_producao || '', url_retorno: d.url_retorno || urlFallback,
  repassar_email_cliente: d.repassar_email_cliente ?? false,
  percentual_multa: typeof d.percentual_multa === 'number' ? d.percentual_multa : parseFloat(String(d.percentual_multa || 2)) || 2,
  percentual_juros: typeof d.percentual_juros === 'number' ? d.percentual_juros : parseFloat(String(d.percentual_juros || 0.03)) || 0.03,
  desconto_tipo: d.desconto_tipo || 'fixo',
  desconto_valor: typeof d.desconto_valor === 'number' ? d.desconto_valor : parseFloat(String(d.desconto_valor || 0)) || 0,
  contra_apresentacao: d.contra_apresentacao ?? false, recalcular_segunda_via: d.recalcular_segunda_via ?? false,
  maximo_dias_recalcular: typeof d.maximo_dias_recalcular === 'number' ? d.maximo_dias_recalcular : parseInt(String(d.maximo_dias_recalcular || 0), 10) || 0,
  layout_web: d.layout_web || 'normal', layout_pdf: d.layout_pdf || 'normal', layout_carne: '', local_pagamento: d.local_pagamento || '',
  dados_avalista: d.dados_avalista || '', exibir_mes_referente: d.exibir_mes_referente ?? false,
  taxa_cobranca: typeof d.taxa_cobranca === 'number' ? d.taxa_cobranca : parseFloat(String(d.taxa_cobranca || 0)) || 0,
  incluir_taxa: d.incluir_taxa ?? false,
  observacao_linha_1: d.observacao_linha_1 || '', observacao_linha_2: d.observacao_linha_2 || '',
  observacao_linha_3: d.observacao_linha_3 || '', observacao_linha_4: d.observacao_linha_4 || '',
  instrucao_linha_1: d.instrucao_linha_1 || '', instrucao_linha_2: d.instrucao_linha_2 || '',
  instrucao_linha_3: d.instrucao_linha_3 || '', instrucao_linha_4: d.instrucao_linha_4 || '', instrucao_linha_5: d.instrucao_linha_5 || '',
  };
}

export const useSaasBancoForm = ({ bancoId, show, onSuccess }: UseSaasBancoFormParams) => {
  const lastCreatedBancoIdRef = useRef<number | null>(null);
  const [lastCreatedBancoId, setLastCreatedBancoId] = useState<number | null>(null);
  const effectiveBancoId = bancoId ?? lastCreatedBancoId ?? lastCreatedBancoIdRef.current;
  const isEditing = !!effectiveBancoId;
  const { success, error } = useNotificationContext();
  const queryClient = useQueryClient();
  const submittingRef = useRef(false);

  const { handleSubmit: rhfHandleSubmit, formState: { errors: rhfErrors }, watch, setValue, reset, trigger } = useForm<ZodBancoFormData>({
    resolver: zodResolver(bancoSchema) as never, defaultValues: initialFormData as ZodBancoFormData, mode: 'onSubmit', reValidateMode: 'onChange',
  });

  const watchedValues = watch();
  const formData = useMemo(() => watchedValues as BancoForm, [watchedValues]);
  const errors: Partial<BancoForm> = useMemo(() => {
    const convertedErrors: Partial<BancoForm> = {};
    Object.keys(rhfErrors).forEach((key) => {
      const field = key as keyof BancoForm;
      const err = rhfErrors[field as keyof typeof rhfErrors];
      if (err?.message) convertedErrors[field] = String(err.message) as never;
    });
    return convertedErrors;
  }, [rhfErrors]);

  const { data: bancoRes, isLoading: isLoadingBanco } = useQuery({
    queryKey: ['saas-banco', effectiveBancoId ?? undefined],
    queryFn: () => saasBancoService.getById(effectiveBancoId!),
    enabled: !!effectiveBancoId,
    staleTime: 60 * 1000,
  });

  const banco = bancoRes?.data as SaasBanco | undefined;
  const customFormData = useMemo(() => (banco ? mapSaasBancoToForm(banco) : undefined), [banco]);

  useEffect(() => {
    if (!show) {
      lastCreatedBancoIdRef.current = null;
      setLastCreatedBancoId(null);
      submittingRef.current = false;
      reset(initialFormData as ZodBancoFormData);
      return;
    }
    if (isEditing && customFormData) {
      reset(customFormData);
    } else if (!isEditing) {
      reset(initialFormData as ZodBancoFormData);
    }
  }, [show, customFormData, isEditing, reset]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: BancoForm & { empresa_id?: number } }) => saasBancoService.update(id, data),
    onSuccess: (_, { id }) => {
      success('Banco atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['saas-bancos'] });
      queryClient.invalidateQueries({ queryKey: ['saas-banco', id] });
      onSuccess?.();
    },
    onError: (err) => {
      const e = err as AxiosError;
      error((e.response?.data as { message?: string } | undefined)?.message || 'Erro ao atualizar banco');
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: BancoForm) => saasBancoService.create(data),
    onSuccess: (res) => {
      const created = (res as { data?: SaasBanco })?.data;
      if (created?.id != null) {
        lastCreatedBancoIdRef.current = created.id;
        setLastCreatedBancoId(created.id);
      }
      success('Banco criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['saas-bancos'] });
      onSuccess?.();
    },
    onError: (err) => {
      const e = err as AxiosError;
      error((e.response?.data as { message?: string } | undefined)?.message || 'Erro ao criar banco');
    },
  });

  const isSubmitting = updateMutation.isPending || createMutation.isPending;

  const handleInputChange = (field: keyof BancoForm, value: FormValue) => {
    let normalizedValue: string | boolean | number;
    const numericFields: (keyof BancoForm)[] = ['percentual_multa', 'percentual_juros', 'desconto_valor', 'maximo_dias_recalcular', 'taxa_cobranca'];
    if (value === null || value === undefined) {
      normalizedValue = numericFields.includes(field) ? 0 : (typeof formData[field] === 'boolean' ? false : '');
    } else if (Array.isArray(value)) {
      const v = value.length > 0 ? value[0] : '';
      normalizedValue = numericFields.includes(field) ? (parseFloat(String(v)) || 0) : String(v);
    } else if (numericFields.includes(field)) {
      normalizedValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
    } else if (typeof formData[field] === 'boolean') {
      normalizedValue = Boolean(value);
    } else {
      normalizedValue = String(value);
    }
    setValue(field as keyof ZodBancoFormData, normalizedValue as never, { shouldValidate: true });
    if (field === 'api_key') setValue('has_api_key', !!normalizedValue, { shouldValidate: false });
    if (field === 'tipo_banco' && !isEditing) {
      const codigos: Record<string, string> = { efi: '364', asaas: '461', bancario: '', outros: '' };
      setValue('codigo', codigos[String(normalizedValue)] || '', { shouldValidate: false });
      const tipo = normalizedValue as 'efi' | 'asaas';
      const url = tipo === 'efi' || tipo === 'asaas' ? buildWebhookUrlSaas(tipo) : `/webhook/${normalizedValue}`;
      setValue('url_retorno', url, { shouldValidate: false });
    }
    trigger(field as keyof ZodBancoFormData).catch(() => {});
  };

  const toSaasPayload = (data: BancoForm): Record<string, unknown> => {
    const p: Record<string, unknown> = {
      nome: data.nome,
      banco: data.codigo || data.nome,
      codigo: data.codigo,
      descricao: data.descricao,
      tipo_banco: data.tipo_banco,
      ativo: data.ativo,
      api_url: data.api_url,
      api_key: data.api_key || undefined,
      api_secret: data.api_secret || undefined,
      sandbox: data.sandbox,
      identificador_conta: data.identificador_conta,
      client_id_producao: data.client_id_producao || undefined,
      client_secret_producao: data.client_secret_producao || undefined,
      url_retorno: data.url_retorno,
      webhook_secret: data.webhook_secret || undefined,
      repassar_email_cliente: data.repassar_email_cliente,
      percentual_multa: data.percentual_multa,
      percentual_juros: data.percentual_juros,
      desconto_tipo: data.desconto_tipo,
      desconto_valor: data.desconto_valor,
      contra_apresentacao: data.contra_apresentacao,
      recalcular_segunda_via: data.recalcular_segunda_via,
      maximo_dias_recalcular: data.maximo_dias_recalcular,
      local_pagamento: data.local_pagamento,
      exibir_mes_referente: data.exibir_mes_referente,
      taxa_cobranca: data.taxa_cobranca,
      incluir_taxa: data.incluir_taxa,
      observacao_linha_1: data.observacao_linha_1,
      observacao_linha_2: data.observacao_linha_2,
      observacao_linha_3: data.observacao_linha_3,
      observacao_linha_4: data.observacao_linha_4,
      instrucao_linha_1: data.instrucao_linha_1,
      instrucao_linha_2: data.instrucao_linha_2,
      instrucao_linha_3: data.instrucao_linha_3,
      instrucao_linha_4: data.instrucao_linha_4,
      instrucao_linha_5: data.instrucao_linha_5,
    };
    Object.keys(p).forEach((k) => { if (p[k] === '' || p[k] === undefined) delete p[k]; });
    return p;
  };

  const onSubmit = (data: ZodBancoFormData) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    const payload = toSaasPayload(data as BancoForm);
    const opts = { onSettled: () => { submittingRef.current = false; } };
    const effectiveId = bancoId ?? lastCreatedBancoIdRef.current ?? null;
    if (effectiveId) {
      updateMutation.mutate({ id: effectiveId, data: payload as unknown as BancoForm & { empresa_id?: number } }, opts);
    } else {
      createMutation.mutate(payload as unknown as BancoForm, opts);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    rhfHandleSubmit(onSubmit, (errs) => {
      const first = Object.values(errs)[0];
      error(first?.message as string || 'Corrija os erros no formulário');
    })(e);
  };

  return {
    formData,
    errors,
    isSubmitting,
    isLoadingBanco: !!effectiveBancoId && isLoadingBanco,
    handleInputChange,
    handleSubmit,
    banco,
    isEditing,
    effectiveBancoId: effectiveBancoId ?? null,
  };
};
