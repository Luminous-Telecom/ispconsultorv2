/**
 * Hook para gerenciar formulário de título
 * Centraliza toda a lógica de estado, validação e mutations
 * 
 * Refatorado para usar React Hook Form + Zod internamente
 */

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { TituloService } from '../services/tituloService';
import { useNotificationContext } from '../components/notifications/NotificationProvider';
import { useApiError } from './useApiError';
import { CONTEXT_ERROR_MESSAGES } from '../constants/ErrorMessages';
import { CarneParcela, CreateCarneParcela } from '../types';
import { TituloForm, TituloFormErrors } from '../components/modals/titulos/titulo/types';
import { tituloSchema } from '../schemas/titulo.schema';
import type { TituloFormData as ZodTituloFormData } from '../schemas/titulo.schema';
import {
  getRequiredValidationMessage,
  shouldShowInlineValidationMessage,
} from '../utils/requiredValidationToast';

interface UseTituloFormParams {
  tituloId: number | null;
  clienteId?: number;
  contratoId?: number;
  show: boolean;
  onSuccess?: () => void;
  isAvulso?: boolean;
}

interface UseTituloFormReturn {
  // Estado do formulário (mantido para compatibilidade)
  formData: TituloForm;
  errors: TituloFormErrors;
  
  // Estados de loading
  isSubmitting: boolean;
  isLoadingTitulo: boolean;
  
  // Handlers (mantidos para compatibilidade)
  handleInputChange: <K extends keyof TituloForm>(field: K, value: TituloForm[K]) => void;
  handleSubmit: (e: React.FormEvent) => void;
  validateForm: () => boolean;
  
  // Dados do título (quando editando)
  titulo: CarneParcela | undefined;
  
  // Flag de edição
  isEditing: boolean;
  
  // Flag indicando se título foi registrado no banco emissor
  tituloRegistradoNoBanco: boolean;
}

const initialFormData: TituloForm = {
  cliente_id: undefined,
  plano_id: 0,
  contrato_id: undefined,
  data_vencimento: '',
  valor: 0,
  observacoes: '',
  desconto_percentual: 0,
  desconto_valor: 0,
  acrescimo_percentual: 0,
  acrescimo_valor: 0,
  descricao: ''
};

export const useTituloForm = ({
  tituloId,
  clienteId,
  contratoId,
  show,
  onSuccess,
  isAvulso = false
}: UseTituloFormParams): UseTituloFormReturn => {
  const isEditing = !!tituloId;
  const { success, error: notifyError } = useNotificationContext();
  const { showApiError } = useApiError();
  const queryClient = useQueryClient();

  // Criar schema sem cliente_id para o formulário (cliente_id será adicionado no submit)
  // Se for título avulso, tornar valor obrigatório
  // No modo edição, valor é opcional (pode já estar preenchido)
  const tituloFormSchema = isAvulso && !isEditing
    ? tituloSchema.omit({ cliente_id: true }).extend({
        valor: z
          .number()
          .min(0.01, 'Valor deve ser maior que zero')
          .max(999999.99, 'Valor muito alto')
      })
    : tituloSchema.omit({ cliente_id: true });

  // React Hook Form com Zod
  const {
    handleSubmit: rhfHandleSubmit,
    formState: { errors: rhfErrors },
    watch,
    setValue,
    reset,
    trigger
  } = useForm<Omit<ZodTituloFormData, 'cliente_id'>>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(tituloFormSchema) as any,
    defaultValues: initialFormData as Omit<ZodTituloFormData, 'cliente_id'>,
    mode: 'onChange'
  });

  // Observar todos os campos para re-renderizar quando mudarem
  const watchedValues = watch();
  
  // Converter dados do React Hook Form para o formato esperado pelos componentes
  const formData = useMemo(() => {
    return watchedValues as TituloForm;
  }, [watchedValues]);
  
  // Converter erros do React Hook Form para o formato esperado
  const errors: TituloFormErrors = useMemo(() => {
    const convertedErrors: TituloFormErrors = {};
    Object.keys(rhfErrors).forEach((key) => {
      const field = key as keyof TituloFormErrors;
      const error = rhfErrors[field as keyof typeof rhfErrors];
      const message = error?.message;
      if (shouldShowInlineValidationMessage(message)) {
        convertedErrors[field] = String(message);
      }
    });
    return convertedErrors;
  }, [rhfErrors]);

  // Buscar dados do título (apenas se estiver editando)
  const { data: tituloResponse, isLoading: isLoadingTitulo } = useQuery({
    queryKey: ['carne-parcela', tituloId],
    queryFn: () => TituloService.getById(tituloId!),
    enabled: isEditing && !!tituloId,
    staleTime: 60 * 1000,
    refetchOnMount: false,
  });

  const titulo = tituloResponse?.success ? tituloResponse.data : undefined;
  
  // Verificar se o título foi registrado no banco emissor
  // Um título está registrado no banco se tiver algum dos campos: nosso_numero, codigo_barras, linha_digitavel, charge_id, url_boleto
  const tituloRegistradoNoBanco: boolean = !!(isEditing && titulo && (
    (titulo.nosso_numero && String(titulo.nosso_numero).trim() !== '') ||
    (titulo.codigo_barras && String(titulo.codigo_barras).trim() !== '') ||
    (titulo.linha_digitavel && String(titulo.linha_digitavel).trim() !== '') ||
    (titulo.charge_id && String(titulo.charge_id).trim() !== '') ||
    (titulo.url_boleto && String(titulo.url_boleto).trim() !== '')
  ));

  // Dados customizados do título (quando editando)
  const customFormData = useMemo(() => {
    if (!titulo || typeof titulo !== 'object') return undefined;
    
    // Formatar data de vencimento para o input date
    const dataVencimento = titulo.data_vencimento 
      ? new Date(titulo.data_vencimento).toISOString().split('T')[0]
      : '';

    return {
      cliente_id: titulo.cliente_id,
      plano_id: titulo.plano_id || 0,
      contrato_id: titulo.contrato_id,
      data_vencimento: dataVencimento,
      valor: (() => {
        if (titulo.valor_final) {
          const v = parseFloat(String(titulo.valor_final));
          return v > 0 ? v : undefined;
        }
        if (titulo.valor) {
          const v = parseFloat(String(titulo.valor));
          return v > 0 ? v : undefined;
        }
        if (titulo.valor_parcela) {
          const v = parseFloat(String(titulo.valor_parcela));
          return v > 0 ? v : undefined;
        }
        return undefined;
      })(),
      status: titulo.status || 'pendente',
      pago: titulo.pago || false,
      observacoes: titulo.observacoes || '',
      desconto_percentual: titulo.desconto_percentual || 0,
      desconto_valor: titulo.desconto_valor || 0,
      acrescimo_percentual: titulo.acrescimo_percentual || 0,
      acrescimo_valor: titulo.acrescimo_valor || 0,
      descricao: titulo.descricao || ''
    } as Omit<ZodTituloFormData, 'cliente_id'>;
  }, [titulo]);

  // Resetar formulário quando modal abrir/fechar ou quando título carregar
  useEffect(() => {
    if (!show) {
      reset(initialFormData as Omit<ZodTituloFormData, 'cliente_id'>);
      return;
    }

    if (isEditing && customFormData) {
      reset(customFormData);
    } else if (!isEditing) {
      const defaultData = {
        ...initialFormData,
        contrato_id: contratoId
      } as Omit<ZodTituloFormData, 'cliente_id'>;
      reset(defaultData);
    }
  }, [show, customFormData, isEditing, contratoId, reset]);

  // Mutation para atualizar título
  const updateTituloMutation = useMutation({
    mutationFn: (data: Partial<CarneParcela>) => TituloService.update(tituloId!, data),
    onSuccess: () => {
      success('Título atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['carne-parcelas'] });
      queryClient.invalidateQueries({ queryKey: ['carne-parcela', tituloId] });
      queryClient.invalidateQueries({ queryKey: ['parcelas'] });
      queryClient.invalidateQueries({ queryKey: ['titulos'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      onSuccess?.();
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.TITULO_UPDATE_ERROR),
  });

  // Mutation para criar título
  const createTituloMutation = useMutation({
    mutationFn: (data: CreateCarneParcela) => TituloService.create(data),
    onSuccess: (response) => {
      const mensagem = response?.message || 'Título salvo com sucesso!';
      success(mensagem);
      queryClient.invalidateQueries({ queryKey: ['carne-parcelas'] });
      queryClient.invalidateQueries({ queryKey: ['parcelas'] });
      queryClient.invalidateQueries({ queryKey: ['titulos'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onSuccess?.();
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.TITULO_CREATE_ERROR),
  });

  const isSubmitting = updateTituloMutation.isPending || createTituloMutation.isPending;

  // Handler de mudança de input (mantido para compatibilidade)
  const handleInputChange = <K extends keyof TituloForm>(
    field: K,
    value: TituloForm[K]
  ) => {
    // Atualizar React Hook Form
    setValue(field as keyof Omit<ZodTituloFormData, 'cliente_id'>, value as never, { shouldValidate: true });
    
    // Trigger validação do campo (assíncrono mas não bloqueia)
    trigger(field as keyof Omit<ZodTituloFormData, 'cliente_id'>).catch(() => {
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
    // O schema Zod já converte strings para números automaticamente
    const typedData = data as Omit<ZodTituloFormData, 'cliente_id'>;
    
    if (isEditing && tituloId) {
      // Modo edição - apenas campos editáveis conforme backend
      // Backend aceita: status, data_vencimento, observacoes
      // Se título foi gerado, não permite alterar data_vencimento
      const dataToSend: Partial<CarneParcela> = {
        observacoes: typedData.observacoes || undefined,
      };
      
      // Só incluir data_vencimento e valor se o título não foi registrado no banco
      if (!tituloRegistradoNoBanco) {
        dataToSend.data_vencimento = typedData.data_vencimento;
        if (typedData.valor && typedData.valor > 0) {
          dataToSend.valor = typedData.valor;
        }
      }
      
      updateTituloMutation.mutate(dataToSend);
    } else if (!isEditing && clienteId) {
      // Modo criação
      const payload: Partial<CreateCarneParcela> & { cliente_id: number; contrato_id?: number; is_avulso?: boolean } = {
        plano_id: typedData.plano_id,
        data_vencimento: typedData.data_vencimento,
        observacoes: typedData.observacoes || undefined,
        desconto_percentual: (typedData.desconto_percentual || 0) > 0 ? typedData.desconto_percentual : undefined,
        desconto_valor: (typedData.desconto_valor || 0) > 0 ? typedData.desconto_valor : undefined,
        acrescimo_percentual: (typedData.acrescimo_percentual || 0) > 0 ? typedData.acrescimo_percentual : undefined,
        acrescimo_valor: (typedData.acrescimo_valor || 0) > 0 ? typedData.acrescimo_valor : undefined,
        descricao: typedData.descricao || undefined,
        cliente_id: clienteId,
        is_avulso: isAvulso || false
      };
      
      // Para título avulso, incluir valor se informado
      // Para título não avulso, não enviar valor (backend usa valor do plano)
      if (isAvulso) {
        if (typedData.valor && typedData.valor > 0) {
          payload.valor = typedData.valor;
        }
      }
      // Se não for avulso, não incluir valor no payload
      
      if (contratoId || typedData.contrato_id) {
        payload.contrato_id = contratoId || typedData.contrato_id;
      }

      createTituloMutation.mutate(payload as CreateCarneParcela);
    }
  };
  
  // Handler para quando há erros de validação
  const onError = (submitErrors: Record<string, { message?: unknown }>) => {
    const requiredMessage = getRequiredValidationMessage(submitErrors);
    if (requiredMessage) {
      notifyError(requiredMessage);
    }
  };

  // Handler de submit mantido para compatibilidade
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    rhfHandleSubmit(
      onSubmit as (data: Omit<ZodTituloFormData, 'cliente_id'>) => void,
      onError as (errors: Record<string, { message?: string }>) => void
    )(e);
  };

  return {
    formData,
    errors,
    isSubmitting,
    isLoadingTitulo,
    handleInputChange,
    handleSubmit,
    validateForm,
    titulo,
    isEditing,
    tituloRegistradoNoBanco
  };
};

