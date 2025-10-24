import React, { useState, useEffect } from 'react';
import DraggableModal from '../../common/DraggableModal';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import { ServidorWhatsAppService, ServidorWhatsApp } from '../../../services/servidorWhatsAppService';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormField } from '../../ui';

interface ServidorWhatsappModalProps {
  show: boolean;
  onClose: () => void;
}

interface ServidorWhatsAppForm {
  evolution_api_url: string;
  evolution_api_key: string;
  instance_name: string;
}

const ServidorWhatsappModal: React.FC<ServidorWhatsappModalProps> = ({ show, onClose }) => {
  const { success, error: showError } = useNotificationContext();
  const queryClient = useQueryClient();
  
  const initialFormData: ServidorWhatsAppForm = {
    evolution_api_url: 'https://evo-api.luminoustelecom.com.br',
    evolution_api_key: '',
    instance_name: ''
  };

  const [formData, setFormData] = useState<ServidorWhatsAppForm>(initialFormData);
  const [testPhone, setTestPhone] = useState<string>('');
  const [testMessage, setTestMessage] = useState<string>('');

  // Buscar servidor ativo
  const { data: servidorAtivo, isLoading } = useQuery({
    queryKey: ['servidor-whatsapp-ativo'],
    queryFn: async () => {
      try {
        return await ServidorWhatsAppService.getActive();
      } catch (error: any) {
        if (error?.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: show,
    retry: false,
  });

  // Mutation para criar/atualizar servidor único
  const saveServidorMutation = useMutation({
    mutationFn: (data: ServidorWhatsAppForm) => {
      return ServidorWhatsAppService.createOrUpdate(data);
    },
    onSuccess: () => {
      success('Configurações do servidor de WhatsApp salvas com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['servidor-whatsapp-ativo'] });
    },
    onError: (error: any) => {
      showError(error?.response?.data?.message || 'Erro ao salvar configurações');
    }
  });

  // Mutation para enviar mensagem de teste
  const sendTestMessageMutation = useMutation({
    mutationFn: async (data: { id: number; phone: string; message: string }) => {
      return ServidorWhatsAppService.sendTestMessage(data.id, data.phone, data.message);
    },
    onSuccess: (response: any) => {
      success(response.message);
    },
    onError: (error: any) => {
      showError(error?.response?.data?.message || 'Erro ao enviar mensagem de teste');
    }
  });

  // Carregar dados do servidor existente
  useEffect(() => {
    if (servidorAtivo?.data) {
      setFormData({
        evolution_api_url: servidorAtivo.data.evolution_api_url,
        evolution_api_key: '', // Não carregar chave por segurança
        instance_name: servidorAtivo.data.instance_name
      });
    } else {
      setFormData(initialFormData);
    }
  }, [servidorAtivo]);

  // Forçar carregamento quando modal abrir
  useEffect(() => {
    if (show) {
      queryClient.invalidateQueries({ queryKey: ['servidor-whatsapp-ativo'] });
    }
  }, [show, queryClient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveServidorMutation.mutateAsync(formData);
  };

  const handleReset = async () => {
    if (servidorAtivo?.data?.id) {
      try {
        await ServidorWhatsAppService.delete(servidorAtivo.data.id);
        success('Servidor removido com sucesso!');
        queryClient.invalidateQueries({ queryKey: ['servidor-whatsapp-ativo'] });
      } catch (error: any) {
        showError(error?.response?.data?.message || 'Erro ao remover servidor');
      }
    }
    setFormData(initialFormData);
  };

  const handleClose = () => {
    setFormData(initialFormData);
    onClose();
  };

  const handleSendTestMessage = async () => {
    if (!testPhone.trim()) {
      showError('Por favor, digite um número de telefone para teste');
      return;
    }

    if (!testMessage.trim()) {
      showError('Por favor, digite uma mensagem para teste');
      return;
    }

    if (!servidorAtivo?.data?.id) {
      showError('Configure o servidor primeiro antes de enviar mensagem de teste');
      return;
    }

    await sendTestMessageMutation.mutateAsync({
      id: servidorAtivo.data.id,
      phone: testPhone.trim(),
      message: testMessage.trim()
    });
  };


  if (isLoading) {
    return (
      <DraggableModal
        show={show}
        onClose={handleClose}
        title="Servidor de WhatsApp"
        size="lg"
        modalId="servidor-whatsapp-modal"
      >
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      </DraggableModal>
    );
  }

  return (
    <DraggableModal
      show={show}
      onClose={handleClose}
      title="Servidor de WhatsApp - Evolution API"
      size="lg"
      modalId="servidor-whatsapp-modal"
      headerActions={
        <div className="d-flex gap-2">
          <button
            type="submit"
            form="servidor-whatsapp-form"
            className="btn btn-primary btn-sm"
            disabled={saveServidorMutation.isPending}
          >
            {saveServidorMutation.isPending ? 'Salvando...' : 'Salvar'}
          </button>
          <button
            type="button"
            className="btn btn-outline-danger btn-sm"
            onClick={handleReset}
            disabled={saveServidorMutation.isPending}
          >
            {servidorAtivo?.data ? 'Remover Servidor' : 'Limpar'}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleClose}
            disabled={saveServidorMutation.isPending}
          >
            Fechar
          </button>
        </div>
      }
    >
      <div className="modal-body p-2">
        {/* Formulário de configuração */}
        <form id="servidor-whatsapp-form" onSubmit={handleSubmit}>
          <div className="card">
            <div className="card-header py-1 px-2">
              <small className="fw-bold mb-0">
                {servidorAtivo?.data ? 'Configurações da Evolution API' : 'Configurar Evolution API'}
              </small>
            </div>
            <div className="card-body p-2">
              <div className="row g-2">
                <div className="col-12">
                  <FormField
                    name="evolution_api_url"
                    type="url"
                    label="Servidor"
                    placeholder="https://evo-api.luminoustelecom.com.br"
                    required={true}
                    size="sm"
                    value={formData.evolution_api_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, evolution_api_url: e.value }))}
                  />
                </div>
              </div>

              <div className="row g-2">
                <div className="col-12">
                  <FormField
                    name="instance_name"
                    type="text"
                    label="Nome da Instância"
                    placeholder="mkauth"
                    required={true}
                    size="sm"
                    value={formData.instance_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, instance_name: e.value }))}
                  />
                </div>
              </div>

              <div className="row g-2">
                <div className="col-12">
                  <FormField
                    name="evolution_api_key"
                    type="password"
                    label={`Token da Instância ${!servidorAtivo?.data ? '*' : ''}`}
                    placeholder={servidorAtivo?.data ? "Deixe em branco para manter o token atual" : "Digite o token da instância"}
                    required={!servidorAtivo?.data}
                    size="sm"
                    value={formData.evolution_api_key}
                    onChange={(e) => setFormData(prev => ({ ...prev, evolution_api_key: e.value }))}
                    autoComplete={servidorAtivo?.data ? "current-password" : "new-password"}
                  />
                  {servidorAtivo?.data && (
                    <small className="form-text text-secondary">
                      Deixe em branco para manter o token atual
                    </small>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Seção de Teste de Mensagem */}
        {servidorAtivo?.data && (
          <div className="row mt-3">
            <div className="col-12">
              <small className="fw-bold text-primary mb-3">
                <i className="bi bi-chat-dots me-2"></i>
                Enviar Mensagem de Teste
              </small>
              <div className="row g-2">
                <div className="col-md-6">
                  <FormField
                    name="testPhone"
                    type="text"
                    label="Número do Telefone"
                    placeholder="5511999999999"
                    size="sm"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.value)}
                  />
                  <small className="form-text text-secondary">
                    Digite o número com código do país (ex: 5511999999999)
                  </small>
                </div>
                <div className="col-md-6">
                  <FormField
                    name="testMessage"
                    type="text"
                    label="Mensagem"
                    placeholder="Mensagem de teste do sistema CTM Telecom"
                    size="sm"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.value)}
                  />
                </div>
              </div>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline-success"
                  onClick={handleSendTestMessage}
                  disabled={sendTestMessageMutation.isPending}
                >
                  {sendTestMessageMutation.isPending ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send me-2"></i>
                      Enviar Teste
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DraggableModal>
  );
};

export default ServidorWhatsappModal;