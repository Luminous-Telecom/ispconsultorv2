/**
 * Hook para gerenciar formulário de contrato
 * Centraliza toda a lógica de estado, validação e mutations
 * 
 * Refatorado para usar React Hook Form + Zod internamente
 */

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { ContratoService } from '../services/contratoService';
import { useNotificationContext } from '../components/notifications/NotificationProvider';
import { Contrato } from '../hooks/useContratos';
import { ContratoForm } from '../components/modals/clientes/contrato/types';
import { contratoSchema } from '../schemas/contrato.schema';
import type { ContratoFormData as ZodContratoFormData } from '../schemas/contrato.schema';
import { CreateContratoData } from '../hooks/useContratos';
import { ensureString } from '../utils/stringUtils';

interface UseContratoFormParams {
  contratoId: number | null;
  clienteId?: number;
  show: boolean;
  onSuccess?: () => void;
}

interface UseContratoFormReturn {
  // Estado do formulário (mantido para compatibilidade)
  formData: ContratoForm;
  errors: Partial<ContratoForm>;
  
  // Estados de loading
  isSubmitting: boolean;
  isLoadingContrato: boolean;
  
  // Handlers (mantidos para compatibilidade)
  handleInputChange: (field: keyof ContratoForm, value: string | number | boolean) => void;
  handleSubmit: (e: React.FormEvent) => void;
  validateForm: () => boolean;
  
  // Dados do contrato (quando editando ou após criação)
  contrato: Contrato | undefined;
  
  // ID do contrato criado (para habilitar abas após criação)
  createdContratoId: number | null;
  
  // Flag de edição
  isEditing: boolean;
}

const initialFormData: ContratoForm = {
  plano_id: 0,
  desconto_percentual: 0,
  desconto_valor: 0,
  data_inicio: new Date().toISOString().split('T')[0],
  data_fim: '',
  status: 'ativo',
  observacoes: '',
  isento_mensalidade: false,
  dia_vencimento_id: 0,
  conta_boleto: 0,
  data_validade_desconto: '',
  modelo_documento_id: 0,
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  usar_endereco_cliente: false
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

export const useContratoForm = ({
  contratoId,
  clienteId,
  show,
  onSuccess
}: UseContratoFormParams): UseContratoFormReturn => {
  const isEditing = !!contratoId;
  const { success, error } = useNotificationContext();
  const queryClient = useQueryClient();
  const [createdContratoId, setCreatedContratoId] = useState<number | null>(null);

  // Criar schema sem cliente_id para o formulário (cliente_id será adicionado no submit)
  const contratoFormSchema = contratoSchema.omit({ cliente_id: true });

  // React Hook Form com Zod
  const {
    handleSubmit: rhfHandleSubmit,
    formState: { errors: rhfErrors },
    watch,
    setValue,
    reset,
    trigger
  } = useForm<Omit<ZodContratoFormData, 'cliente_id'>>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(contratoFormSchema) as any,
    defaultValues: initialFormData as Omit<ZodContratoFormData, 'cliente_id'>,
    mode: 'onChange'
  });

  // Observar todos os campos para re-renderizar quando mudarem
  const watchedValues = watch();
  
  // Converter dados do React Hook Form para o formato esperado pelos componentes
  const formData = useMemo(() => {
    return watchedValues as ContratoForm;
  }, [watchedValues]);
  
  // Converter erros do React Hook Form para o formato esperado
  const errors: Partial<ContratoForm> = useMemo(() => {
    const convertedErrors: Partial<ContratoForm> = {};
    Object.keys(rhfErrors).forEach((key) => {
      const field = key as keyof ContratoForm;
      const error = rhfErrors[field as keyof typeof rhfErrors];
      if (error?.message) {
        convertedErrors[field] = String(error.message) as never;
      }
    });
    return convertedErrors;
  }, [rhfErrors]);

  // Buscar dados do contrato (se estiver editando ou após criação)
  const contratoIdToFetch = contratoId || createdContratoId;
  const { data: contrato, isLoading: isLoadingContrato } = useQuery({
    queryKey: ['contrato', contratoIdToFetch],
    queryFn: () => ContratoService.getById(contratoIdToFetch!),
    enabled: !!contratoIdToFetch,
    staleTime: 60 * 1000,
  });

  // Dados customizados do contrato (quando editando)
  const customFormData = useMemo(() => {
    if (!contrato || typeof contrato !== 'object') return undefined;
    
    return {
      plano_id: contrato.plano_id || 0,
      desconto_percentual: parseFloat(String(contrato.desconto_percentual || 0)) || 0,
      desconto_valor: parseFloat(String(contrato.desconto_valor || 0)) || 0,
      data_inicio: normalizeDate(contrato.data_inicio) || new Date().toISOString().split('T')[0],
      data_fim: normalizeDate(contrato.data_fim),
      status: (contrato.status || 'ativo') as ContratoForm['status'],
      observacoes: ensureString(contrato.observacoes),
      isento_mensalidade: contrato.isento_mensalidade || false,
      dia_vencimento_id: contrato.dia_vencimento_id || 0,
      conta_boleto: contrato.conta_boleto || 0,
      data_validade_desconto: normalizeDate(contrato.data_validade_desconto),
      modelo_documento_id: contrato.modelo_documento_id || 0,
      endereco: ensureString(contrato.endereco),
      numero: ensureString(contrato.numero),
      complemento: ensureString(contrato.complemento),
      bairro: ensureString(contrato.bairro),
      cidade: ensureString(contrato.cidade),
      estado: ensureString(contrato.estado),
      usar_endereco_cliente: contrato.usar_endereco_cliente || false
    } as Omit<ZodContratoFormData, 'cliente_id'>;
  }, [contrato]);

  // Resetar formulário quando modal abrir/fechar ou quando contrato carregar
  useEffect(() => {
    if (!show) {
      reset(initialFormData as Omit<ZodContratoFormData, 'cliente_id'>);
      return;
    }

    if (isEditing && customFormData) {
      reset(customFormData);
    } else if (!isEditing) {
      reset(initialFormData as Omit<ZodContratoFormData, 'cliente_id'>);
    }
  }, [show, customFormData, isEditing, reset]);

  // Mutation para atualizar contrato
  const updateContratoMutation = useMutation({
    mutationFn: (data: CreateContratoData & { id: number }) => ContratoService.update(data.id, data),
    onSuccess: () => {
      success('Contrato atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      queryClient.invalidateQueries({ queryKey: ['contrato', contratoId] });
      onSuccess?.();
    },
    onError: (err) => {
      const axiosError = err as AxiosError<{ message: string }>;
      error(axiosError.response?.data?.message || 'Erro ao atualizar contrato');
    },
  });

  // Mutation para criar contrato
  const createContratoMutation = useMutation({
    mutationFn: (data: CreateContratoData) => ContratoService.create(data),
    onSuccess: (novoContrato) => {
      setCreatedContratoId(novoContrato.id);
      success('Contrato criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      queryClient.invalidateQueries({ queryKey: ['cliente', clienteId] });
      queryClient.invalidateQueries({ queryKey: ['contrato', novoContrato.id] });
      queryClient.invalidateQueries({ queryKey: ['termos-contrato', novoContrato.id] });
      queryClient.invalidateQueries({ queryKey: ['titulos', 'contrato', novoContrato.id] });
      onSuccess?.();
    },
    onError: (err) => {
      const axiosError = err as AxiosError<{ message: string }>;
      error(axiosError.response?.data?.message || 'Erro ao criar contrato');
    },
  });

  const isSubmitting = updateContratoMutation.isPending || createContratoMutation.isPending;

  // Handler de mudança de input (mantido para compatibilidade)
  const handleInputChange = (field: keyof ContratoForm, value: string | number | boolean) => {
    // Atualizar React Hook Form
    setValue(field as keyof Omit<ZodContratoFormData, 'cliente_id'>, value as never, { shouldValidate: true });
    
    // Trigger validação do campo (assíncrono mas não bloqueia)
    trigger(field as keyof Omit<ZodContratoFormData, 'cliente_id'>).catch(() => {
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
    const typedData = data as Omit<ZodContratoFormData, 'cliente_id'>;
    
    // Função auxiliar para enviar valores numéricos (incluindo 0)
    const getNumericValue = (value: number | undefined | null): number | undefined => {
      if (value === null || value === undefined) return undefined;
      return value;
    };
    
    if (isEditing && contratoId) {
      // Modo edição
      const dataToSend: CreateContratoData & { id: number } = {
        id: contratoId,
        cliente_id: contrato?.cliente_id || 0,
        plano_id: typedData.plano_id,
        desconto_percentual: getNumericValue(typedData.desconto_percentual),
        desconto_valor: getNumericValue(typedData.desconto_valor),
        data_inicio: typedData.data_inicio || undefined,
        data_fim: typedData.data_fim || undefined,
        status: typedData.status as CreateContratoData['status'],
        observacoes: typedData.observacoes || undefined,
        isento_mensalidade: typedData.isento_mensalidade,
        dia_vencimento_id: typedData.dia_vencimento_id,
        conta_boleto: typedData.conta_boleto,
        data_validade_desconto: typedData.data_validade_desconto || undefined,
        modelo_documento_id: typedData.modelo_documento_id,
        endereco: typedData.endereco || undefined,
        numero: typedData.numero || undefined,
        complemento: typedData.complemento || undefined,
        bairro: typedData.bairro || undefined,
        cidade: typedData.cidade || undefined,
        estado: typedData.estado || undefined,
        usar_endereco_cliente: typedData.usar_endereco_cliente || false
      };
      
      updateContratoMutation.mutate(dataToSend);
    } else if (!isEditing && clienteId) {
      // Modo criação
      const dataToSend: CreateContratoData = {
        cliente_id: clienteId,
        plano_id: typedData.plano_id,
        desconto_percentual: getNumericValue(typedData.desconto_percentual),
        desconto_valor: getNumericValue(typedData.desconto_valor),
        data_inicio: typedData.data_inicio || undefined,
        data_fim: typedData.data_fim || undefined,
        status: typedData.status as CreateContratoData['status'],
        observacoes: typedData.observacoes || undefined,
        isento_mensalidade: typedData.isento_mensalidade,
        dia_vencimento_id: typedData.dia_vencimento_id,
        conta_boleto: typedData.conta_boleto,
        data_validade_desconto: typedData.data_validade_desconto || undefined,
        modelo_documento_id: typedData.modelo_documento_id,
        endereco: typedData.endereco || undefined,
        numero: typedData.numero || undefined,
        complemento: typedData.complemento || undefined,
        bairro: typedData.bairro || undefined,
        cidade: typedData.cidade || undefined,
        estado: typedData.estado || undefined,
        usar_endereco_cliente: typedData.usar_endereco_cliente || false
      };
      
      createContratoMutation.mutate(dataToSend);
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
    isLoadingContrato,
    handleInputChange,
    handleSubmit,
    validateForm,
    contrato,
    createdContratoId,
    isEditing
  };
};

