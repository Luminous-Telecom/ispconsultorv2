import React, { useState, useEffect, useMemo } from 'react';
import DraggableModal from '../../../common/DraggableModal';
import { useNotificationContext } from '../../../../components/notifications/NotificationProvider';
import { ServidorWhatsAppService } from '../../../../services/servidorWhatsAppService';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { ServidorWhatsAppForm, ServidorWhatsappModalProps } from './types';
import ServidorTab from './abas/ServidorTab';
import MensagensTab from './abas/MensagensTab';
import { API_CONFIG } from '../../../../config/api';

interface GrupoVariaveis {
  titulo: string;
  variaveis: Array<{ variavel: string; descricao: string }>;
}

const ServidorWhatsappModal: React.FC<ServidorWhatsappModalProps> = ({ show, onClose }) => {
  const { success, error: showError } = useNotificationContext();
  const queryClient = useQueryClient();
  
  const initialFormData: ServidorWhatsAppForm = useMemo(() => ({
    evolution_api_url: 'https://evo-api.example.com',
    evolution_api_key: '',
    instance_name: ''
  }), []);

  const [formData, setFormData] = useState<ServidorWhatsAppForm>(initialFormData);
  const [testPhone, setTestPhone] = useState<string>('');
  const [testMessage, setTestMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'servidor' | 'mensagens'>('servidor');
  
  // Estados para mensagens
  const [mensagemType, setMensagemType] = useState<string>('');
  const [tipoEnvio, setTipoEnvio] = useState<'desativado' | 'pdf'>('pdf');
  const [mensagemPadrao, setMensagemPadrao] = useState<string>('');
  const [interacao1, setInteracao1] = useState<string>('');
  const [interacao2, setInteracao2] = useState<string>('');
  const [interacao3, setInteracao3] = useState<string>('');

  // Buscar mensagem quando tipo for selecionado
  const { data: mensagemData } = useQuery({
    queryKey: ['mensagem-whatsapp', mensagemType],
    queryFn: async () => {
      if (!mensagemType) return null;
      try {
        return await ServidorWhatsAppService.getByTipo(mensagemType);
      } catch (err: unknown) {
        const error = err as AxiosError<{ message?: string }>;
        if (error?.response?.status === 404) {
          return null;
        }
        throw err;
      }
    },
    enabled: !!mensagemType
  });

  // Buscar variáveis disponíveis da API
  const { data: variaveisData } = useQuery<Record<string, GrupoVariaveis>>({
    queryKey: ['variaveis-documento'],
    queryFn: async () => {
      const response = await axios.get(`${API_CONFIG.BASE_URL}/modelos-contrato/variaveis`);
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000
  });

  // Carregar dados da mensagem quando buscar
  useEffect(() => {
    if (mensagemData) {
      setTipoEnvio(mensagemData.tipo_envio);
      setMensagemPadrao(mensagemData.mensagem_padrao);
      setInteracao1(mensagemData.interacao1 || '');
      setInteracao2(mensagemData.interacao2 || '');
      setInteracao3(mensagemData.interacao3 || '');
    } else {
      setTipoEnvio('pdf');
      setMensagemPadrao('');
      setInteracao1('');
      setInteracao2('');
      setInteracao3('');
    }
  }, [mensagemData]);

  // Buscar servidor ativo
  const { data: servidorAtivo, isLoading } = useQuery({
    queryKey: ['servidor-whatsapp-ativo'],
    queryFn: async () => {
      try {
        return await ServidorWhatsAppService.getActive();
      } catch (err: unknown) {
        const error = err as AxiosError<{ message?: string }>;
        if (error?.response?.status === 404) {
          return null;
        }
        throw err;
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
    onError: (err: unknown) => {
      const error = err as AxiosError<{ message: string }>;
      showError(error?.response?.data?.message || 'Erro ao salvar configurações');
    }
  });

  // Mutation para enviar mensagem de teste
  const sendTestMessageMutation = useMutation({
    mutationFn: async (data: { id: number; phone: string; message: string }) => {
      return ServidorWhatsAppService.sendTestMessage(data.id, data.phone, data.message);
    },
    onSuccess: (response: { message: string }) => {
      success(response.message);
    },
    onError: (err: unknown) => {
      const error = err as AxiosError<{ message: string }>;
      showError(error?.response?.data?.message || 'Erro ao enviar mensagem de teste');
    }
  });

  // Mutation para salvar mensagem
  const saveMensagemMutation = useMutation({
    mutationFn: (data: { tipo: string; tipo_envio: 'desativado' | 'pdf'; mensagem_padrao: string; interacao1?: string; interacao2?: string; interacao3?: string; ativo: boolean }) => {
      return ServidorWhatsAppService.saveMensagem(data);
    },
    onSuccess: () => {
      success('Mensagem salva com sucesso!');
    },
    onError: (err: unknown) => {
      const error = err as AxiosError<{ message: string }>;
      showError(error?.response?.data?.message || 'Erro ao salvar mensagem');
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
  }, [servidorAtivo, initialFormData]);

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

  const handleSaveMensagem = async () => {
    if (!mensagemType) {
      showError('Selecione um tipo de mensagem');
      return;
    }
    await saveMensagemMutation.mutateAsync({
      tipo: mensagemType,
      tipo_envio: tipoEnvio,
      mensagem_padrao: mensagemPadrao,
      interacao1: interacao1 || undefined,
      interacao2: interacao2 || undefined,
      interacao3: interacao3 || undefined,
      ativo: true
    });
  };

  const handleReset = async () => {
    if (servidorAtivo?.data?.id) {
      try {
        await ServidorWhatsAppService.delete(servidorAtivo.data.id);
        success('Servidor removido com sucesso!');
        queryClient.invalidateQueries({ queryKey: ['servidor-whatsapp-ativo'] });
      } catch (err: unknown) {
        const error = err as AxiosError<{ message: string }>;
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

  const handleCopyVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
    success('Variável copiada!');
  };

  const handleInsertVariable = (variable: string) => {
    setMensagemPadrao(prev => prev + variable);
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
            type="button"
            className="btn btn-primary btn-sm"
            onClick={(e) => {
              if (activeTab === 'servidor') {
                const form = document.getElementById('servidor-whatsapp-form') as HTMLFormElement;
                form?.requestSubmit();
              } else {
                e.preventDefault();
                handleSaveMensagem();
              }
            }}
            disabled={saveServidorMutation.isPending || saveMensagemMutation.isPending}
          >
            {(saveServidorMutation.isPending || saveMensagemMutation.isPending) ? 'Salvando...' : 'Salvar'}
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
        {/* Navegação de Abas */}
        <ul className="nav nav-tabs mb-3" role="tablist">
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link ${activeTab === 'servidor' ? 'active' : ''}`}
              onClick={() => setActiveTab('servidor')}
              type="button"
            >
              Servidor
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link ${activeTab === 'mensagens' ? 'active' : ''}`}
              onClick={() => setActiveTab('mensagens')}
              type="button"
            >
              Mensagens
            </button>
          </li>
        </ul>

        {/* Conteúdo das Abas */}
        {activeTab === 'servidor' && (
          <form id="servidor-whatsapp-form" onSubmit={handleSubmit}>
            <ServidorTab
              formData={formData}
              onChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
              isPending={saveServidorMutation.isPending}
              servidorAtivo={servidorAtivo}
              testPhone={testPhone}
              testMessage={testMessage}
              onTestPhoneChange={setTestPhone}
              onTestMessageChange={setTestMessage}
              onSendTestMessage={handleSendTestMessage}
              isSendingTest={sendTestMessageMutation.isPending}
            />
          </form>
        )}

        {activeTab === 'mensagens' && (
          <MensagensTab
            mensagemType={mensagemType}
            tipoEnvio={tipoEnvio}
            mensagemPadrao={mensagemPadrao}
            interacao1={interacao1}
            interacao2={interacao2}
            interacao3={interacao3}
            onMensagemTypeChange={setMensagemType}
            onTipoEnvioChange={setTipoEnvio}
            onMensagemPadraoChange={setMensagemPadrao}
            onInteracao1Change={setInteracao1}
            onInteracao2Change={setInteracao2}
            onInteracao3Change={setInteracao3}
            onSaveMensagem={handleSaveMensagem}
            isPending={saveMensagemMutation.isPending}
            variaveisData={variaveisData}
            onCopyVariable={handleCopyVariable}
            onInsertVariable={handleInsertVariable}
          />
        )}
      </div>
    </DraggableModal>
  );
};

export default ServidorWhatsappModal;

