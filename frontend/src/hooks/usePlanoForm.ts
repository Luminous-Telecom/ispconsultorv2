/**
 * Hook para gerenciar formulário de plano
 * Centraliza toda a lógica de estado, validação e mutations
 * 
 * Refatorado para usar React Hook Form + Zod internamente
 */

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlanoService } from '../services/planoService';
import { useNotificationContext } from '../components/notifications/NotificationProvider';
import { useApiError } from './useApiError';
import { CONTEXT_ERROR_MESSAGES } from '../constants/ErrorMessages';
import { Plano } from '../types';
import { PlanoForm } from '../components/modals/planos/plano/types';
import { planoSchema } from '../schemas/plano.schema';
import type { PlanoFormData as ZodPlanoFormData } from '../schemas/plano.schema';

interface UsePlanoFormParams {
  planoId: number | null;
  show: boolean;
  onSuccess?: () => void;
}

interface UsePlanoFormReturn {
  // Estado do formulário (mantido para compatibilidade)
  formData: PlanoForm;
  errors: Partial<PlanoForm>;
  
  // Estados de loading
  isSubmitting: boolean;
  isLoadingPlano: boolean;
  
  // Handlers (mantidos para compatibilidade)
  handleInputChange: (field: keyof PlanoForm, value: string | number | boolean | string[]) => void;
  handleServiceToggle: (service: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  validateForm: () => boolean;
  
  // Dados do plano (quando editando)
  plano: Plano | undefined;
  
  // Flag de edição
  isEditing: boolean;
}

const initialFormData: PlanoForm = {
  nome_plano: '',
  tipo_servico: 'consultoria',
  descricao: '',
  valor_mensal: 0,
  quantidade_usuarios: 1,
  servicos_inclusos: [],
  renovacao_automatica: true,
  status: 'ativo',
  data_inicio: new Date().toISOString().split('T')[0],
  data_fim: '',
  observacoes: ''
};

// Função auxiliar para normalizar data (evitar problemas de timezone)
const normalizeDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
};

export const usePlanoForm = ({
  planoId,
  show,
  onSuccess
}: UsePlanoFormParams): UsePlanoFormReturn => {
  const isEditing = !!planoId;
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const queryClient = useQueryClient();

  // React Hook Form com Zod
  const {
    handleSubmit: rhfHandleSubmit,
    formState: { errors: rhfErrors },
    watch,
    setValue,
    reset,
    trigger
  } = useForm<ZodPlanoFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(planoSchema) as any,
    defaultValues: initialFormData as ZodPlanoFormData,
    mode: 'onChange'
  });

  // Observar todos os campos para re-renderizar quando mudarem
  const watchedValues = watch();
  
  // Converter dados do React Hook Form para o formato esperado pelos componentes
  const formData = useMemo(() => {
    return watchedValues as PlanoForm;
  }, [watchedValues]);
  
  // Converter erros do React Hook Form para o formato esperado
  const errors: Partial<PlanoForm> = useMemo(() => {
    const convertedErrors: Partial<PlanoForm> = {};
    Object.keys(rhfErrors).forEach((key) => {
      const field = key as keyof PlanoForm;
      const error = rhfErrors[field as keyof typeof rhfErrors];
      if (error?.message) {
        convertedErrors[field] = String(error.message) as never;
      }
    });
    return convertedErrors;
  }, [rhfErrors]);

  // Buscar dados do plano (apenas se estiver editando)
  const { data: plano, isLoading: isLoadingPlano } = useQuery({
    queryKey: ['plano', planoId],
    queryFn: () => PlanoService.getById(planoId!),
    enabled: isEditing && !!planoId,
  });

  // Dados customizados do plano (quando editando)
  const customFormData = useMemo(() => {
    if (!plano || typeof plano !== 'object') return undefined;
    
    return {
      nome_plano: plano.nome_plano || '',
      tipo_servico: (plano.tipo_servico || 'consultoria') as ZodPlanoFormData['tipo_servico'],
      descricao: plano.descricao || '',
      valor_mensal: Number(plano.valor_mensal) || 0,
      quantidade_usuarios: Number(plano.quantidade_usuarios) || 1,
      servicos_inclusos: Array.isArray(plano.servicos_inclusos) ? plano.servicos_inclusos : [],
      renovacao_automatica: plano.renovacao_automatica ?? true,
      status: (plano.status || 'ativo') as ZodPlanoFormData['status'],
      data_inicio: normalizeDate(plano.data_inicio) || new Date().toISOString().split('T')[0],
      data_fim: normalizeDate(plano.data_fim),
      observacoes: plano.observacoes || ''
    } as ZodPlanoFormData;
  }, [plano]);

  // Resetar formulário quando modal abrir/fechar ou quando plano carregar
  useEffect(() => {
    if (!show) {
      reset(initialFormData as ZodPlanoFormData);
      return;
    }

    if (isEditing && customFormData) {
      reset(customFormData);
    } else if (!isEditing) {
      reset(initialFormData as ZodPlanoFormData);
    }
  }, [show, customFormData, isEditing, reset]);

  // Mutation para atualizar plano
  const updatePlanoMutation = useMutation({
    mutationFn: (data: PlanoForm) => PlanoService.update(planoId!, data),
    onSuccess: () => {
      success('Plano atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['planos'] });
      queryClient.invalidateQueries({ queryKey: ['plano', planoId] });
      onSuccess?.();
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.PLANO_UPDATE_ERROR),
  });

  // Mutation para criar plano
  const createPlanoMutation = useMutation({
    mutationFn: (data: PlanoForm) => PlanoService.create(data),
    onSuccess: () => {
      success('Plano criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['planos'] });
      onSuccess?.();
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.PLANO_CREATE_ERROR),
  });

  const isSubmitting = updatePlanoMutation.isPending || createPlanoMutation.isPending;

  // Handler de mudança de input (mantido para compatibilidade)
  const handleInputChange = (field: keyof PlanoForm, value: string | number | boolean | string[]) => {
    // Atualizar React Hook Form
    setValue(field as keyof ZodPlanoFormData, value as never, { shouldValidate: true });
    
    // Trigger validação do campo (assíncrono mas não bloqueia)
    trigger(field as keyof ZodPlanoFormData).catch(() => {
      // Ignorar erros de validação
    });
  };

  // Handler para toggle de serviços
  const handleServiceToggle = (service: string) => {
    const currentServices = formData.servicos_inclusos || [];
    const newServices = currentServices.includes(service)
      ? currentServices.filter(s => s !== service)
      : [...currentServices, service];
    
    setValue('servicos_inclusos', newServices, { shouldValidate: true });
  };

  // Validação usando React Hook Form (mantida para compatibilidade)
  const validateForm = (): boolean => {
    return Object.keys(errors).length === 0;
  };

  // Handler de submit usando React Hook Form
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSubmit = (data: any) => {
    const typedData = data as ZodPlanoFormData;
    
    // Preparar dados para envio
    const dataToSend: PlanoForm = {
      nome_plano: typedData.nome_plano,
      tipo_servico: typedData.tipo_servico as PlanoForm['tipo_servico'],
      descricao: typedData.descricao || '',
      valor_mensal: typedData.valor_mensal,
      quantidade_usuarios: typedData.quantidade_usuarios,
      servicos_inclusos: typedData.servicos_inclusos,
      renovacao_automatica: typedData.renovacao_automatica,
      status: typedData.status as PlanoForm['status'],
      data_inicio: typedData.data_inicio,
      data_fim: typedData.data_fim || '',
      observacoes: typedData.observacoes || ''
    };

    if (isEditing) {
      updatePlanoMutation.mutate(dataToSend);
    } else {
      createPlanoMutation.mutate(dataToSend);
    }
  };

  // Handler de submit mantido para compatibilidade
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rhfHandleSubmit(onSubmit as any)(e);
  };

  return {
    formData,
    errors,
    isSubmitting,
    isLoadingPlano,
    handleInputChange,
    handleServiceToggle,
    handleSubmit,
    validateForm,
    plano,
    isEditing
  };
};

