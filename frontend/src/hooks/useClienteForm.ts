/**
 * Hook para gerenciar formulário de cliente
 * Centraliza toda a lógica de estado, validação, consultas e mutations
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { ClienteService } from '../services/clienteService';
import { ParametrosService } from '../services/parametrosService';
import { useNotificationContext } from '../components/notifications/NotificationProvider';
import { Cliente, CreateCliente } from '../types';
import { ClienteFormData, ClienteFormErrors } from '../types';
import { FormValue } from '../types/common';
import { formatCNPJ, formatPhone, formatCEP } from '../utils/formatters';
import { isValidCNPJ } from '../utils/validators';
import { validateClienteForm } from '../schemas/cliente.schemas';
import { useFormReset } from './useFormReset';

interface UseClienteFormParams {
  clienteId: number | null;
  show: boolean;
  onSuccess?: () => void;
}

interface UseClienteFormReturn {
  // Estado do formulário
  formData: ClienteFormData;
  errors: ClienteFormErrors;
  
  // Estados de loading
  isSubmitting: boolean;
  isLoadingCliente: boolean;
  isConsultingCnpj: boolean;
  isConsultingCep: boolean;
  
  // Handlers
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
  recebe_sms: false,
  recebe_whatsapp: true,
  observacoes: ''
};

export const useClienteForm = ({
  clienteId,
  show,
  onSuccess
}: UseClienteFormParams): UseClienteFormReturn => {
  const isEditing = !!clienteId;
  const { success, error, info } = useNotificationContext();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<ClienteFormData>(initialFormData);
  const [errors, setErrors] = useState<ClienteFormErrors>({});
  const [isConsultingCnpj, setIsConsultingCnpj] = useState(false);
  const [isConsultingCep, setIsConsultingCep] = useState(false);
  const [createdClienteId, setCreatedClienteId] = useState<number | null>(null);
  
  const lastCnpjConsulted = useRef<string>('');
  const lastCepConsulted = useRef<string>('');

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
      recebe_sms: cliente.recebe_sms ?? false,
      recebe_whatsapp: cliente.recebe_whatsapp ?? true,
      observacoes: cliente.observacoes || ''
    };
  }, [cliente]);

  // Usar hook personalizado para reset do formulário
  useFormReset({
    show,
    initialData: initialFormData,
    setFormData,
    setErrors,
    customData: customFormData
  });

  // Mutation para atualizar cliente
  const updateClienteMutation = useMutation({
    mutationFn: (data: Partial<Cliente>) => ClienteService.update(clienteId!, data),
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

    setFormData(prev => ({ ...prev, [field]: formattedValue }));
    
    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[field as keyof ClienteFormErrors]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }

    // Se o campo for CNPJ e estiver completo e válido, consultar dados
    if (field === 'cnpj' && typeof formattedValue === 'string' && !isEditing) {
      const cnpjLimpo = formattedValue.replace(/\D/g, '');
      
      // Verificar se CNPJ está completo (14 dígitos) e válido
      if (cnpjLimpo.length === 14 && isValidCNPJ(formattedValue)) {
        // Verificar se já consultou este CNPJ para evitar consultas duplicadas
        if (lastCnpjConsulted.current === cnpjLimpo) {
          return;
        }

        // Verificar se a opção de validar CPF/CNPJ está marcada
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
                
                // Preencher campos automaticamente
                setFormData(prev => ({
                  ...prev,
                  razao_social: dados.razao_social || prev.razao_social,
                  nome_fantasia: dados.nome_fantasia || prev.nome_fantasia,
                  cep: dados.cep || prev.cep,
                  endereco: dados.endereco || prev.endereco,
                  numero: dados.numero || prev.numero,
                  complemento: dados.complemento || prev.complemento,
                  bairro: dados.bairro || prev.bairro,
                  cidade: dados.cidade || prev.cidade,
                  estado: dados.estado || prev.estado,
                  telefone: dados.telefone || prev.telefone,
                  email: dados.email || prev.email
                }));

                success('Dados do CNPJ preenchidos automaticamente!');
              }
            } catch (err) {
              const axiosError = err as AxiosError<{ message?: string; error?: string }>;
              const status = axiosError?.response?.status;
              
              if (status === 404) {
                // CNPJ não encontrado na base da Receita Federal - não é erro crítico
                info('CNPJ não encontrado na base da Receita Federal. Você pode preencher os dados manualmente.');
              } else {
                // Outros erros (timeout, servidor, etc.)
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
                // Preencher campos automaticamente
                setFormData(prev => ({
                  ...prev,
                  endereco: dados.logradouro || prev.endereco,
                  bairro: dados.bairro || prev.bairro,
                  cidade: dados.localidade || prev.cidade,
                  estado: dados.uf || prev.estado,
                  complemento: dados.complemento || prev.complemento
                }));

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

  const validateForm = (): boolean => {
    const validationErrors = validateClienteForm(formData);
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    // Preparar dados para envio com conversão de tipos correta
    const dataToSend: Partial<CreateCliente> = {
      cnpj: formData.cnpj,
      razao_social: formData.razao_social,
      nome_fantasia: formData.nome_fantasia,
      email: formData.email,
      telefone: formData.telefone,
      whatsapp: formData.whatsapp,
      cep: formData.cep,
      endereco: formData.endereco,
      numero: formData.numero,
      complemento: formData.complemento,
      bairro: formData.bairro,
      cidade: formData.cidade,
      estado: formData.estado,
      ativo: formData.ativo,
      tipo_cobranca: formData.tipo_cobranca,
      valor_primeiro_titulo: formData.valor_primeiro_titulo,
      recebe_email: formData.recebe_email,
      recebe_sms: formData.recebe_sms,
      recebe_whatsapp: formData.recebe_whatsapp,
      observacoes: formData.observacoes
    };

    // Remover apenas campos undefined
    Object.keys(dataToSend).forEach(key => {
      const value = (dataToSend as Record<string, unknown>)[key];
      if (value === undefined) {
        delete (dataToSend as Record<string, unknown>)[key];
      }
    });

    if (isEditing) {
      updateClienteMutation.mutate(dataToSend);
    } else {
      createClienteMutation.mutate(dataToSend);
    }
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

