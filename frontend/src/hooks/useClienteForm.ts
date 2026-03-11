/**
 * Hook para gerenciar formulário de cliente
 * Centraliza toda a lógica de estado, validação, consultas e mutations
 * 
 * Refatorado para usar React Hook Form + Zod internamente
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { ClienteService } from '../services/clienteService';
import { ParametrosService } from '../services/parametrosService';
import { useNotificationContext } from '../components/notifications/NotificationProvider';
import { Cliente, CreateCliente, UpdateCliente } from '../types';
import { ClienteFormData, ClienteFormErrors } from '../types';
import { FormValue } from '../types/common';
import { formatCNPJ, formatPhone, formatCEP } from '../utils/formatters';
import { isValidCNPJ } from '../utils/validators';
import { clienteSchema } from '../schemas/cliente.schema';
import type { ClienteFormData as ZodClienteFormData } from '../schemas/cliente.schema';

interface UseClienteFormParams {
  clienteId: number | null;
  show: boolean;
  onSuccess?: () => void;
}

interface UseClienteFormReturn {
  // Estado do formulário (mantido para compatibilidade)
  formData: ClienteFormData;
  errors: ClienteFormErrors;
  
  // Estados de loading
  isSubmitting: boolean;
  isLoadingCliente: boolean;
  isConsultingCnpj: boolean;
  isConsultingCep: boolean;
  
  // Handlers (mantidos para compatibilidade)
  handleInputChange: (field: keyof ClienteFormData, value: FormValue) => Promise<void>;
  handleSubmit: (e: React.FormEvent) => void;
  validateForm: () => boolean;
  
  // Dados do cliente (quando editando)
  cliente: Cliente | undefined;
  
  // ID do cliente criado (para habilitar abas após criação)
  createdClienteId: number | null;
  
  // Flag de edição
  isEditing: boolean;
}

const initialFormData: ClienteFormData = {
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
  tipo_cobranca: 'titulo',
  valor_primeiro_titulo: 'total',
  recebe_email: true,
  recebe_whatsapp: true,
  observacoes: '',
  central_assinante_senha: ''
};

export const useClienteForm = ({
  clienteId,
  show,
  onSuccess
}: UseClienteFormParams): UseClienteFormReturn => {
  const isEditing = !!clienteId;
  const { success, error, info } = useNotificationContext();
  const queryClient = useQueryClient();
  
  const [isConsultingCnpj, setIsConsultingCnpj] = useState(false);
  const [isConsultingCep, setIsConsultingCep] = useState(false);
  const [createdClienteId, setCreatedClienteId] = useState<number | null>(null);
  
  const lastCnpjConsulted = useRef<string>('');
  const lastCepConsulted = useRef<string>('');

  // React Hook Form com Zod
  const {
    handleSubmit: rhfHandleSubmit,
    formState: { errors: rhfErrors },
    watch,
    setValue,
    reset,
    trigger
  } = useForm<ZodClienteFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(clienteSchema) as any,
    defaultValues: initialFormData as ZodClienteFormData,
    mode: 'onChange'
  });

  // Observar todos os campos para re-renderizar quando mudarem
  const watchedValues = watch();
  
  // Converter dados do React Hook Form para o formato esperado pelos componentes
  const formData = useMemo(() => {
    return watchedValues as ClienteFormData;
  }, [watchedValues]);
  
  // Converter erros do React Hook Form para o formato esperado
  const errors: ClienteFormErrors = useMemo(() => {
    const convertedErrors: ClienteFormErrors = {};
    Object.keys(rhfErrors).forEach((key) => {
      const field = key as keyof ClienteFormErrors;
      const error = rhfErrors[field as keyof typeof rhfErrors];
      if (error?.message) {
        convertedErrors[field] = String(error.message);
      }
    });
    return convertedErrors;
  }, [rhfErrors]);

  // Buscar parâmetros para verificar se deve consultar CNPJ/CEP
  const { data: parametros } = useQuery({
    queryKey: ['parametros'],
    queryFn: () => ParametrosService.get(),
    staleTime: 60 * 1000,
    enabled: show
  });

  // Resetar refs quando modal abrir
  useEffect(() => {
    if (show) {
      lastCnpjConsulted.current = '';
      lastCepConsulted.current = '';
    }
  }, [show]);

  // Buscar dados do cliente (apenas se estiver editando)
  const { data: cliente, isLoading: isLoadingCliente } = useQuery({
    queryKey: ['cliente', clienteId],
    queryFn: () => ClienteService.getById(clienteId!),
    enabled: isEditing && !!clienteId,
  });


  // Dados customizados do cliente (quando editando)
  const customFormData = useMemo(() => {
    if (!cliente || typeof cliente !== 'object') return undefined;

    return {
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
      ativo: cliente.ativo ?? true,
      tipo_cobranca: (cliente.tipo_cobranca === 'carne' ? 'titulo' : cliente.tipo_cobranca) || 'titulo',
      valor_primeiro_titulo: cliente.valor_primeiro_titulo || 'total',
      recebe_email: cliente.recebe_email ?? true,
      recebe_whatsapp: cliente.recebe_whatsapp ?? true,
      observacoes: cliente.observacoes || '',
      central_assinante_senha: '' // Não mostrar senha atual por segurança
    } as ZodClienteFormData;
  }, [cliente, clienteId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resetar formulário quando modal abrir/fechar
  useEffect(() => {
    if (!show) {
      reset(initialFormData as ZodClienteFormData);
      setCreatedClienteId(null);
      return;
    }

    // Só reset quando o modal abre, não quando os dados mudam
    if (!isEditing) {
      reset(initialFormData as ZodClienteFormData);
    }
  }, [show, isEditing, reset]);

  // Reset separado quando os dados do cliente carregam
  useEffect(() => {
    if (show && isEditing && customFormData && cliente) {
      reset(customFormData);
    }
  }, [cliente, show, isEditing]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mutation para atualizar cliente
  const updateClienteMutation = useMutation({
    mutationFn: (data: UpdateCliente) => ClienteService.update(clienteId!, data),
    onSuccess: () => {
      success('Cliente atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['cliente', clienteId] });
      onSuccess?.();
    },
    onError: (err) => {
      const axiosError = err as AxiosError<{ message: string }>;
      error(axiosError.response?.data?.message || 'Erro ao atualizar cliente');
    },
  });

  // Mutation para criar cliente
  const createClienteMutation = useMutation({
    mutationFn: (data: Partial<Cliente>) => ClienteService.create(data as CreateCliente),
    onSuccess: (createdCliente: Cliente) => {
      success('Cliente criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setCreatedClienteId(createdCliente.id);
      onSuccess?.();
    },
    onError: (err) => {
      const axiosError = err as AxiosError<{ message: string }>;
      error(axiosError.response?.data?.message || 'Erro ao criar cliente');
    },
  });

  const isSubmitting = updateClienteMutation.isPending || createClienteMutation.isPending;

  // Handler de mudança de input (mantido para compatibilidade)
  const handleInputChange = async (field: keyof ClienteFormData, value: FormValue) => {
    // Aplicar formatação baseada no campo
    let formattedValue = value;
    if (field === 'cnpj' && typeof value === 'string') {
      formattedValue = formatCNPJ(value);
    } else if ((field === 'telefone' || field === 'whatsapp') && typeof value === 'string') {
      formattedValue = formatPhone(value);
    } else if (field === 'cep' && typeof value === 'string') {
      formattedValue = formatCEP(value);
    }

    // Atualizar React Hook Form
    setValue(field as keyof ZodClienteFormData, formattedValue as never, { shouldValidate: true });
    
    // Trigger validação do campo (assíncrono mas não bloqueia)
    trigger(field as keyof ZodClienteFormData).catch(() => {
      // Ignorar erros de validação
    });

    // Se o campo for CNPJ e estiver completo e válido, consultar dados
    if (field === 'cnpj' && typeof formattedValue === 'string' && !isEditing) {
      const cnpjLimpo = formattedValue.replace(/\D/g, '');
      
      // Verificar se CNPJ está completo (14 dígitos) e válido
      if (cnpjLimpo.length === 14 && isValidCNPJ(formattedValue)) {
        // Verificar se já consultou este CNPJ para evitar consultas duplicadas
        if (lastCnpjConsulted.current === cnpjLimpo) {
          return;
        }

        // Verificar se a opção de validar CNPJ está marcada
        if (parametros?.data?.validar_cpf_cnpj) {
          // Verificar se os campos já estão preenchidos (não sobrescrever se usuário já preencheu)
          const camposVazios = !formData.razao_social && !formData.nome_fantasia && !formData.endereco;
          
          if (camposVazios && !isConsultingCnpj) {
            setIsConsultingCnpj(true);
            lastCnpjConsulted.current = cnpjLimpo;

            try {
              const response = await ClienteService.consultarCnpj(cnpjLimpo);
              
              if (response.success && response.data) {
                const dados = response.data;
                
                // Preencher campos automaticamente usando setValue
                setValue('razao_social', dados.razao_social || '', { shouldValidate: false });
                setValue('nome_fantasia', dados.nome_fantasia || '', { shouldValidate: false });
                setValue('cep', dados.cep || '', { shouldValidate: false });
                setValue('endereco', dados.endereco || '', { shouldValidate: false });
                setValue('numero', dados.numero || '', { shouldValidate: false });
                setValue('complemento', dados.complemento || '', { shouldValidate: false });
                setValue('bairro', dados.bairro || '', { shouldValidate: false });
                setValue('cidade', dados.cidade || '', { shouldValidate: false });
                setValue('estado', dados.estado || '', { shouldValidate: false });
                setValue('telefone', dados.telefone || '', { shouldValidate: false });
                setValue('email', dados.email || '', { shouldValidate: false });

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
            } finally {
              setIsConsultingCnpj(false);
            }
          }
        }
      }
    }

    // Se o campo for CEP e estiver completo, consultar dados
    if (field === 'cep' && typeof formattedValue === 'string') {
      const cepLimpo = formattedValue.replace(/\D/g, '');
      
      // Verificar se CEP está completo (8 dígitos)
      if (cepLimpo.length === 8) {
        // Verificar se já consultou este CEP para evitar consultas duplicadas
        if (lastCepConsulted.current === cepLimpo) {
          return;
        }

        // Verificar se a opção de validar CEP está marcada
        if (parametros?.data?.validar_cep) {
          // Verificar se os campos de endereço já estão preenchidos (não sobrescrever se usuário já preencheu)
          const camposEnderecoVazios = !formData.endereco && !formData.bairro && !formData.cidade && !formData.estado;
          
          if (camposEnderecoVazios && !isConsultingCep) {
            setIsConsultingCep(true);
            lastCepConsulted.current = cepLimpo;

            try {
              const dados = await ClienteService.buscarCep(cepLimpo);
              
              if (dados) {
                // Preencher campos automaticamente usando setValue
                setValue('endereco', dados.logradouro || '', { shouldValidate: false });
                setValue('bairro', dados.bairro || '', { shouldValidate: false });
                setValue('cidade', dados.localidade || '', { shouldValidate: false });
                setValue('estado', dados.uf || '', { shouldValidate: false });
                setValue('complemento', dados.complemento || '', { shouldValidate: false });

                success('Dados do CEP preenchidos automaticamente!');
              }
            } catch (err) {
              const axiosError = err as AxiosError<{ message?: string }>;
              const errorMessage = axiosError?.response?.data?.message || 'Erro ao consultar CEP';
              
              // Só mostrar erro se não for "não encontrado" (pode ser CEP válido mas não na base)
              if (axiosError?.response?.status !== 404) {
                error(errorMessage);
              }
            } finally {
              setIsConsultingCep(false);
            }
          }
        }
      } else if (cepLimpo.length < 8) {
        // Resetar quando o CEP não tem 8 dígitos
        lastCepConsulted.current = '';
      }
    }
  };

  // Validação usando React Hook Form (mantida para compatibilidade)
  const validateForm = (): boolean => {
    return Object.keys(errors).length === 0;
  };

  // Handler de submit usando React Hook Form
  const onSubmit: SubmitHandler<ZodClienteFormData> = (data) => {
    // Preparar dados para envio
    const dataToSend: Partial<CreateCliente> | UpdateCliente = {
      cnpj: data.cnpj,
      razao_social: data.razao_social,
      nome_fantasia: data.nome_fantasia || undefined,
      email: data.email,
      telefone: data.telefone || undefined,
      whatsapp: data.whatsapp || undefined,
      cep: data.cep,
      endereco: data.endereco,
      numero: data.numero,
      complemento: data.complemento || undefined,
      bairro: data.bairro,
      cidade: data.cidade,
      estado: data.estado,
      ativo: data.ativo,
      tipo_cobranca: data.tipo_cobranca as 'titulo' | 'boleto' | 'carne',
      valor_primeiro_titulo: data.valor_primeiro_titulo as 'total' | 'proporcional',
        recebe_email: data.recebe_email,
        recebe_whatsapp: data.recebe_whatsapp,
      observacoes: data.observacoes || undefined,
      central_assinante_senha: data.central_assinante_senha && data.central_assinante_senha.trim() !== '' 
        ? data.central_assinante_senha 
        : undefined
    };

    // Remover campos undefined
    Object.keys(dataToSend).forEach(key => {
      const value = (dataToSend as Record<string, unknown>)[key];
      if (value === undefined) {
        delete (dataToSend as Record<string, unknown>)[key];
      }
    });

    if (isEditing) {
      updateClienteMutation.mutate(dataToSend as UpdateCliente);
    } else {
      createClienteMutation.mutate(dataToSend as Partial<CreateCliente>);
    }
  };

  // Handler de submit mantido para compatibilidade
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    rhfHandleSubmit(onSubmit)(e);
  };

  return {
    formData,
    errors,
    isSubmitting,
    isLoadingCliente,
    isConsultingCnpj,
    isConsultingCep,
    handleInputChange,
    handleSubmit,
    validateForm,
    cliente,
    createdClienteId,
    isEditing
  };
};
