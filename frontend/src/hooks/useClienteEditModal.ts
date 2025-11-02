import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ClienteService } from '../services/clienteService';
import { TituloService } from '../services/tituloService';
import { useNotificationContext } from '../contexts/NotificationContext';
import { ClienteFormData, ClienteFormErrors, ContratoItem, TituloItem, ApiError } from '../types';
import { validateClienteForm } from '../utils/validators';
import { FormValue } from '../types/common';

export const useClienteEditModal = (clienteId: number | null) => {
  const { success, error } = useNotificationContext();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<ClienteFormData>({
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
  });
  
  const [errors, setErrors] = useState<ClienteFormErrors>({});
  const [activeTab, setActiveTab] = useState('dados-basicos');
  const [selectedItems, setSelectedItems] = useState<TituloItem[]>([]);
  const [selectedContratosItems, setSelectedContratosItems] = useState<ContratoItem[]>([]);
  
  // Estados dos modais
  const [showTituloEditModal, setShowTituloEditModal] = useState(false);
  const [showReceberModal, setShowReceberModal] = useState(false);
  const [showContratoCreateModal, setShowContratoCreateModal] = useState(false);
  const [showContratoEditModal, setShowContratoEditModal] = useState(false);
  const [showCancelados, setShowCancelados] = useState(false);
  const [showInativosContratos, setShowInativosContratos] = useState(false);
  
  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    if (type === 'success') success(message);
    else if (type === 'error') error(message);
    else success(message); // Para info, usar success
  }, [success, error]);
  
  const handleInputChange = useCallback((field: keyof ClienteFormData, value: FormValue) => {
    setFormData((prev: ClienteFormData) => ({
      ...prev,
      [field]: value
    }));
    
    // Limpar erro do campo quando usuário começar a digitar
    if (errors[field as keyof ClienteFormErrors]) {
      setErrors((prev: ClienteFormErrors) => ({
        ...prev,
        [field]: undefined
      }));
    }
  }, [errors]);
  
  const validateForm = useCallback((): boolean => {
    const newErrors = validateClienteForm(formData as unknown as Record<string, unknown>);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);
  
  // Mutation para atualizar cliente
  const updateClienteMutation = useMutation({
    mutationFn: (data: Partial<ClienteFormData>) => ClienteService.update(clienteId!, data),
    onSuccess: () => {
      success('Cliente atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['cliente', clienteId] });
    },
    onError: (err: ApiError) => {
      error(err.response?.data?.message || 'Erro ao atualizar cliente');
    }
  });
  
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const dataToSend = {
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
    
    updateClienteMutation.mutate(dataToSend);
  }, [formData, validateForm, updateClienteMutation]);
  
  // Funções para ações em massa dos títulos
  const handleMarcarPago = useCallback(async (selectedItems: TituloItem[]) => {
    if (selectedItems.length === 0) return;
    
    try {
      const promises = selectedItems.map(item => 
        TituloService.marcarPago(item.id, undefined, item.valor)
      );
      
      await Promise.all(promises);
      showNotification('Títulos marcados como pagos com sucesso!', 'success');
      queryClient.invalidateQueries({ queryKey: ['parcelas', 'cliente', clienteId] });
    } catch (err) {
      showNotification('Erro ao marcar títulos como pagos', 'error');
    }
  }, [showNotification, queryClient, clienteId]);
  
  const handleCancelarTitulos = useCallback(async (selectedItems: TituloItem[]) => {
    if (selectedItems.length === 0) return;
    
    const confirmar = window.confirm(
      `Tem certeza que deseja cancelar ${selectedItems.length} título(s)?`
    );
    
    if (confirmar) {
      try {
        // Como não existe método cancelar, vamos usar update para marcar como cancelado
        const promises = selectedItems.map(item => 
          TituloService.update(item.id, { status: 'cancelado' })
        );
        const results = await Promise.allSettled(promises);
        
        const successCount = results.filter(r => r.status === 'fulfilled').length;
        const errorCount = results.length - successCount;
        
        if (successCount > 0) {
          const message = errorCount === 0 
            ? `${successCount} título(s) cancelado(s) com sucesso!`
            : `${successCount} título(s) cancelado(s), ${errorCount} não puderam ser cancelados`;
          showNotification(message, errorCount > 0 ? 'error' : 'success');
        }
        
        queryClient.invalidateQueries({ queryKey: ['cliente', clienteId] });
        queryClient.invalidateQueries({ queryKey: ['parcelas', 'cliente', clienteId] });
      } catch (err) {
        showNotification('Erro ao cancelar títulos', 'error');
      }
    }
  }, [showNotification, queryClient, clienteId]);
  
  const handleEstornarTitulo = useCallback(async (item: TituloItem) => {
    if (item.status === 'pago' || item.status === 'pago_atraso') {
      const confirmar = window.confirm(
        `Tem certeza que deseja estornar o título ${item.numero_titulo}?\n\n` +
        `Valor: R$ ${item.valor_pago || item.valor}\n` +
        `O título voltará para status PENDENTE.`
      );
      
      if (confirmar) {
        try {
          await TituloService.estornar(item.id);
          showNotification('Título estornado com sucesso!', 'success');
          queryClient.invalidateQueries({ queryKey: ['parcelas', 'cliente', clienteId] });
        } catch (err) {
          showNotification('Erro ao estornar título', 'error');
        }
      }
    } else {
      showNotification('Só é possível estornar títulos que estão pagos', 'info');
    }
  }, [showNotification, queryClient, clienteId]);
  
  return {
    // Estados
    formData,
    errors,
    activeTab,
    selectedItems,
    selectedContratosItems,
    showTituloEditModal,
    showReceberModal,
    showContratoCreateModal,
    showContratoEditModal,
    showCancelados,
    showInativosContratos,
    
    // Setters
    setFormData,
    setErrors,
    setActiveTab,
    setSelectedItems,
    setSelectedContratosItems,
    setShowTituloEditModal,
    setShowReceberModal,
    setShowContratoCreateModal,
    setShowContratoEditModal,
    setShowCancelados,
    setShowInativosContratos,
    
    // Funções
    handleInputChange,
    validateForm,
    handleSubmit,
    handleMarcarPago,
    handleCancelarTitulos,
    handleEstornarTitulo,
    showNotification,
    
    // Mutations
    updateClienteMutation
  };
};
