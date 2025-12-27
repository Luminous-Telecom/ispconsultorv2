/**
 * Hook para gerenciar formulário de banco
 * Centraliza toda a lógica de estado, validação e mutations
 * 
 * Refatorado para usar React Hook Form + Zod internamente
 */

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { BancoService } from '../services/bancoService';
import { useNotificationContext } from '../components/notifications/NotificationProvider';
import { Banco } from '../types';
import { BancoForm } from '../components/modals/bancos/banco/types';
import { bancoSchema } from '../schemas/banco.schema';
import type { BancoFormData as ZodBancoFormData } from '../schemas/banco.schema';
import { FormValue } from '../types/common';

interface UseBancoFormParams {
  bancoId: number | null;
  show: boolean;
  onSuccess?: (banco: Banco) => void;
}

interface UseBancoFormReturn {
  // Estado do formulário (mantido para compatibilidade)
  formData: BancoForm;
  errors: Partial<BancoForm>;
  
  // Estados de loading
  isSubmitting: boolean;
  isLoadingBanco: boolean;
  
  // Handlers (mantidos para compatibilidade)
  handleInputChange: (field: keyof BancoForm, value: FormValue) => void;
  handleSubmit: (e: React.FormEvent) => void;
  validateForm: () => boolean;
  
  // Dados do banco (quando editando)
  banco: Banco | undefined;
  
  // Flag de edição
  isEditing: boolean;
}

const initialFormData: BancoForm = {
  nome: '',
  codigo: '364',
  descricao: '',
  ativo: true,
  tipo_banco: 'efi',
  api_url: '',
  api_key: '',
  api_secret: '',
  webhook_secret: '',
  has_api_key: false,
  sandbox: true,
  identificador_conta: '',
  client_id_producao: '',
  client_secret_producao: '',
  url_retorno: '/webhook/efi',
  repassar_email_cliente: false,
  percentual_multa: 2,
  percentual_juros: 0.03,
  desconto_tipo: 'fixo',
  desconto_valor: 0,
  contra_apresentacao: false,
  recalcular_segunda_via: false,
  maximo_dias_recalcular: 0,
  layout_web: 'normal',
  layout_pdf: 'normal',
  layout_carne: '',
  local_pagamento: '',
  dados_avalista: '',
  exibir_mes_referente: false,
  taxa_cobranca: 0,
  incluir_taxa: false,
  observacao_linha_1: '',
  observacao_linha_2: '',
  observacao_linha_3: '',
  observacao_linha_4: '',
  instrucao_linha_1: '',
  instrucao_linha_2: '',
  instrucao_linha_3: '',
  instrucao_linha_4: '',
  instrucao_linha_5: ''
};

const mapBancoToForm = (banco: Banco): BancoForm => ({
  nome: banco.nome || '',
  codigo: banco.codigo || '',
  descricao: banco.descricao || '',
  ativo: banco.ativo ?? true,
  tipo_banco: banco.tipo_banco || 'efi',
  api_url: banco.api_url || '',
  api_key: banco.api_key || '',
  api_secret: banco.api_secret || '',
  webhook_secret: banco.webhook_secret || '',
  has_api_key: banco.has_api_key ?? false,
  sandbox: banco.sandbox ?? true,
  identificador_conta: banco.identificador_conta || '',
  client_id_producao: banco.client_id_producao || '',
  client_secret_producao: banco.client_secret_producao || '',
  url_retorno: banco.url_retorno || '/webhook/efi',
  repassar_email_cliente: banco.repassar_email_cliente ?? false,
  percentual_multa: typeof banco.percentual_multa === 'number' ? banco.percentual_multa : parseFloat(String(banco.percentual_multa || 2)) || 2,
  percentual_juros: typeof banco.percentual_juros === 'number' ? banco.percentual_juros : parseFloat(String(banco.percentual_juros || 0.03)) || 0.03,
  desconto_tipo: banco.desconto_tipo || 'fixo',
  desconto_valor: typeof banco.desconto_valor === 'number' ? banco.desconto_valor : parseFloat(String(banco.desconto_valor || 0)) || 0,
  contra_apresentacao: banco.contra_apresentacao ?? false,
  recalcular_segunda_via: banco.recalcular_segunda_via ?? false,
  maximo_dias_recalcular: typeof banco.maximo_dias_recalcular === 'number' ? banco.maximo_dias_recalcular : parseInt(String(banco.maximo_dias_recalcular || 0), 10) || 0,
  layout_web: banco.layout_web || 'normal',
  layout_pdf: banco.layout_pdf || 'normal',
  layout_carne: banco.layout_carne || '',
  local_pagamento: banco.local_pagamento || '',
  dados_avalista: banco.dados_avalista || '',
  exibir_mes_referente: banco.exibir_mes_referente ?? false,
  taxa_cobranca: typeof banco.taxa_cobranca === 'number' ? banco.taxa_cobranca : parseFloat(String(banco.taxa_cobranca || 0)) || 0,
  incluir_taxa: banco.incluir_taxa ?? false,
  observacao_linha_1: banco.observacao_linha_1 || '',
  observacao_linha_2: banco.observacao_linha_2 || '',
  observacao_linha_3: banco.observacao_linha_3 || '',
  observacao_linha_4: banco.observacao_linha_4 || '',
  instrucao_linha_1: banco.instrucao_linha_1 || '',
  instrucao_linha_2: banco.instrucao_linha_2 || '',
  instrucao_linha_3: banco.instrucao_linha_3 || '',
  instrucao_linha_4: banco.instrucao_linha_4 || '',
  instrucao_linha_5: banco.instrucao_linha_5 || ''
});

export const useBancoForm = ({
  bancoId,
  show,
  onSuccess
}: UseBancoFormParams): UseBancoFormReturn => {
  const isEditing = !!bancoId;
  const { success, error } = useNotificationContext();
  const queryClient = useQueryClient();

  // React Hook Form com Zod
  const {
    handleSubmit: rhfHandleSubmit,
    formState: { errors: rhfErrors },
    watch,
    setValue,
    reset,
    trigger
  } = useForm<ZodBancoFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(bancoSchema) as any,
    defaultValues: initialFormData as ZodBancoFormData,
    mode: 'onSubmit',
    reValidateMode: 'onChange'
  });

  // Observar todos os campos para re-renderizar quando mudarem
  const watchedValues = watch();
  
  // Converter dados do React Hook Form para o formato esperado pelos componentes
  const formData = useMemo(() => {
    return watchedValues as BancoForm;
  }, [watchedValues]);
  
  // Converter erros do React Hook Form para o formato esperado
  const errors: Partial<BancoForm> = useMemo(() => {
    const convertedErrors: Partial<BancoForm> = {};
    Object.keys(rhfErrors).forEach((key) => {
      const field = key as keyof BancoForm;
      const error = rhfErrors[field as keyof typeof rhfErrors];
      if (error?.message) {
        convertedErrors[field] = String(error.message) as never;
      }
    });
    return convertedErrors;
  }, [rhfErrors]);

  // Buscar dados do banco (apenas se estiver editando)
  const { data: banco, isLoading: isLoadingBanco } = useQuery({
    queryKey: ['banco', bancoId],
    queryFn: () => BancoService.getById(bancoId!),
    enabled: isEditing && !!bancoId,
    staleTime: 60 * 1000,
    refetchOnMount: false,
  });

  // Dados customizados do banco (quando editando)
  const customFormData = useMemo(() => {
    if (!banco || typeof banco !== 'object') return undefined;
    return mapBancoToForm(banco) as ZodBancoFormData;
  }, [banco]);

  // Resetar formulário quando modal abrir/fechar ou quando banco carregar
  useEffect(() => {
    if (!show) {
      reset(initialFormData as ZodBancoFormData);
      return;
    }

    if (isEditing && customFormData) {
      reset(customFormData);
    } else if (!isEditing) {
      reset(initialFormData as ZodBancoFormData);
    }
  }, [show, customFormData, isEditing, reset]);

  // Mutation para atualizar banco
  const updateBancoMutation = useMutation({
    mutationFn: (data: BancoForm) => BancoService.update(bancoId!, data),
    onSuccess: (updatedBanco) => {
      success('Banco atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['bancos'] });
      queryClient.invalidateQueries({ queryKey: ['banco', bancoId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onSuccess?.(updatedBanco);
    },
    onError: (err) => {
      const axiosError = err as AxiosError<{ message: string }>;
      error(axiosError.response?.data?.message || 'Erro ao atualizar banco');
    },
  });

  // Mutation para criar banco
  const createBancoMutation = useMutation({
    mutationFn: (data: BancoForm) => BancoService.create(data),
    onSuccess: (createdBanco) => {
      success('Banco criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['bancos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onSuccess?.(createdBanco);
    },
    onError: (err) => {
      const axiosError = err as AxiosError<{ message: string }>;
      error(axiosError.response?.data?.message || 'Erro ao criar banco');
    },
  });

  const isSubmitting = updateBancoMutation.isPending || createBancoMutation.isPending;

  // Handler de mudança de input (mantido para compatibilidade)
  const handleInputChange = (field: keyof BancoForm, value: FormValue) => {
    // Normalizar o valor baseado no tipo esperado do campo
    let normalizedValue: string | boolean | number;
    
    // Campos numéricos que devem ser convertidos
    const numericFields: (keyof BancoForm)[] = [
      'percentual_multa',
      'percentual_juros',
      'desconto_valor',
      'maximo_dias_recalcular',
      'taxa_cobranca'
    ];
    
    if (value === null || value === undefined) {
      if (numericFields.includes(field)) {
        normalizedValue = 0;
      } else if (typeof formData[field] === 'boolean') {
        normalizedValue = false;
      } else {
        normalizedValue = '';
      }
    } else if (Array.isArray(value)) {
      const arrayValue = value.length > 0 ? value[0] : '';
      if (numericFields.includes(field)) {
        normalizedValue = parseFloat(String(arrayValue)) || 0;
      } else {
        normalizedValue = String(arrayValue);
      }
    } else if (numericFields.includes(field)) {
      // Converter para número se for campo numérico
      normalizedValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
    } else if (typeof formData[field] === 'boolean') {
      normalizedValue = Boolean(value);
    } else {
      normalizedValue = String(value);
    }

    // Atualizar React Hook Form
    setValue(field as keyof ZodBancoFormData, normalizedValue as never, { shouldValidate: true });

    // Lógica especial para api_key
    if (field === 'api_key') {
      setValue('has_api_key', !!normalizedValue, { shouldValidate: false });
    }
    
    // Atualizar código e url_retorno quando tipo_banco mudar (apenas em criação)
    if (field === 'tipo_banco' && !isEditing) {
      const codigos: Record<string, string> = {
        'efi': '364',
        'asaas': '461',
        'bancario': '',
        'outros': ''
      };
      const codigo = codigos[String(normalizedValue)] || '';
      setValue('codigo', codigo, { shouldValidate: false });
      setValue('url_retorno', `/webhook/${normalizedValue}`, { shouldValidate: false });
    }
    
    // Trigger validação do campo (assíncrono mas não bloqueia)
    trigger(field as keyof ZodBancoFormData).catch(() => {
      // Ignorar erros de validação
    });
  };

  // Validação usando React Hook Form (mantida para compatibilidade)
  const validateForm = (): boolean => {
    return Object.keys(errors).length === 0;
  };

  // Handler de submit usando React Hook Form
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSubmit = (data: any) => {
    try {
      const typedData = data as ZodBancoFormData;
      
      // Preparar dados para envio
      const dataToSend: BancoForm = { ...typedData } as BancoForm;

      if (isEditing) {
        // Modo edição - não enviar campos de senha vazios
        if (!dataToSend.api_key || dataToSend.api_key.trim() === '') {
          delete (dataToSend as Partial<BancoForm>).api_key;
        }
        if (!dataToSend.client_id_producao || dataToSend.client_id_producao.trim() === '') {
          delete (dataToSend as Partial<BancoForm>).client_id_producao;
        }
        if (!dataToSend.client_secret_producao || dataToSend.client_secret_producao.trim() === '') {
          delete (dataToSend as Partial<BancoForm>).client_secret_producao;
        }
        if (!dataToSend.api_secret || dataToSend.api_secret.trim() === '') {
          delete (dataToSend as Partial<BancoForm>).api_secret;
        }
        if (!dataToSend.webhook_secret || dataToSend.webhook_secret.trim() === '') {
          delete (dataToSend as Partial<BancoForm>).webhook_secret;
        }
        delete (dataToSend as Partial<BancoForm>).has_api_key;
        
        updateBancoMutation.mutate(dataToSend);
      } else {
        // Modo criação
        if (!dataToSend.webhook_secret || dataToSend.webhook_secret.trim() === '') {
          delete (dataToSend as Partial<BancoForm>).webhook_secret;
        }
        if (!dataToSend.api_secret || dataToSend.api_secret.trim() === '') {
          delete (dataToSend as Partial<BancoForm>).api_secret;
        }
        delete (dataToSend as Partial<BancoForm>).has_api_key;
        
        createBancoMutation.mutate(dataToSend);
      }
    } catch (err) {
      error('Erro ao processar formulário');
    }
  };

  // Handler de submit mantido para compatibilidade
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rhfHandleSubmit(onSubmit as any, (errors) => {
      // Mostrar primeiro erro de validação
      const firstError = Object.values(errors)[0];
      if (firstError?.message) {
        error(firstError.message as string);
      } else {
        error('Por favor, corrija os erros no formulário');
      }
    })(e);
  };

  return {
    formData,
    errors,
    isSubmitting,
    isLoadingBanco,
    handleInputChange,
    handleSubmit,
    validateForm,
    banco,
    isEditing
  };
};

