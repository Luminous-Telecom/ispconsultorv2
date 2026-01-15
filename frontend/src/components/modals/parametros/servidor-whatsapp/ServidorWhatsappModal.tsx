import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { ServidorWhatsAppService, MensagemWhatsApp } from '@/services/servidorWhatsAppService';
import { defaultApiClient } from '@/services/core';
import DraggableModal from '@/components/common/DraggableModal';
import { Button, Spinner } from '@/components/ui';
import { ServidorWhatsAppForm, ServidorWhatsappModalProps } from './types';
import ServidorTab from './abas/ServidorTab';
import MensagensTab from './abas/MensagensTab';
import TemplatesModal from './TemplatesModal';
import { useI18n } from '@/contexts/I18nContext';

interface GrupoVariaveis {
  titulo: string;
  variaveis: Array<{ variavel: string; descricao: string }>;
}

const ServidorWhatsappModal: React.FC<ServidorWhatsappModalProps> = ({ show, onClose, skipWrapper = false, onHeaderActionsReady }) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const { success, error: showError } = useNotificationContext();
  const queryClient = useQueryClient();
  
  const initialFormData: ServidorWhatsAppForm = useMemo(() => ({
    tipo_api: 'evolution',
    evolution_api_url: 'https://evo-api.example.com',
    evolution_api_key: '',
    instance_name: '',
    whatsapp_cloud_token: '',
    whatsapp_cloud_phone_number_id: '',
    whatsapp_cloud_business_account_id: ''
  }), []);

  const [formData, setFormData] = useState<ServidorWhatsAppForm>(initialFormData);
  const [testPhone, setTestPhone] = useState<string>('');
  const [testMessage, setTestMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'servidor' | 'mensagens'>('servidor');
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  
  // Estados para mensagens
  const [mensagemType, setMensagemType] = useState<string>('');
  const [tipoEnvio, setTipoEnvio] = useState<'desativado' | 'pdf'>('pdf');
  const [mensagemPadrao, setMensagemPadrao] = useState<string>('');
  const [mensagemManual, setMensagemManual] = useState<string>('');
  const [templateMapping, setTemplateMapping] = useState<string>('');
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
      const response = await defaultApiClient.get<Record<string, GrupoVariaveis>>('/modelos-documento/variaveis');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || t('messages.error'));
  },
  staleTime: 5 * 60 * 1000
});

// Carregar dados da mensagem quando buscar
useEffect(() => {
  if (mensagemData) {
    setTipoEnvio(mensagemData.tipo_envio);
    setMensagemPadrao(mensagemData.mensagem_padrao);
    setMensagemManual(mensagemData.mensagem_manual || '');
    setTemplateMapping(mensagemData.template_mapping || '');
    setInteracao1(mensagemData.interacao1 || '');
    setInteracao2(mensagemData.interacao2 || '');
    setInteracao3(mensagemData.interacao3 || '');
  } else {
    setTipoEnvio('pdf');
    setMensagemPadrao('');
    setMensagemManual('');
    setTemplateMapping('');
    setInteracao1('');
    setInteracao2('');
    setInteracao3('');
  }
}, [mensagemData]);

// Buscar servidor ativo
const { data: servidorAtivo, isLoading, refetch: refetchServidorAtivo } = useQuery({
  queryKey: ['servidor-whatsapp-ativo'],
  queryFn: async () => {
    try {
      return await ServidorWhatsAppService.getActive();
    } catch {
      return null;
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
  onSuccess: async () => {
    success(t('whatsappServer.successSave'));
    queryClient.invalidateQueries({ queryKey: ['servidor-whatsapp-ativo'] });
    await refetchServidorAtivo();
  },
  onError: (err: unknown) => {
    const error = err as AxiosError<{ message?: string; errors?: string[] }>;
    let errorMessage = t('whatsappServer.errorSave');
    
    if (error?.response?.data) {
      if (error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (error.response.data.errors && Array.isArray(error.response.data.errors)) {
        errorMessage = error.response.data.errors.join(', ');
      } else if (error.response.data.errors && typeof error.response.data.errors === 'object') {
        errorMessage = Object.values(error.response.data.errors).flat().join(', ');
      }
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    showError(errorMessage);
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
  onError: (_err: unknown) => {
    // Sempre mostrar mensagem genérica, ignorando qualquer erro técnico
    showError(t('whatsappServer.errorSendTest'));
  }
});

// Mutation para salvar mensagem
const saveMensagemMutation = useMutation({
  mutationFn: (data: MensagemWhatsApp) => {
    return ServidorWhatsAppService.saveMensagem(data);
  },
  onSuccess: () => {
    success(t('whatsappServer.successMessageSave'));
  },
  onError: (err: unknown) => {
    const error = err as AxiosError<{ message: string }>;
    showError(error?.response?.data?.message || t('whatsappServer.errorMessageSave'));
  }
});

  // Carregar dados do servidor existente
  useEffect(() => {
    if (servidorAtivo?.data) {
      const servidor = servidorAtivo.data;
      setFormData({
        tipo_api: servidor.tipo_api || 'evolution',
        evolution_api_url: servidor.evolution_api_url || '',
        evolution_api_key: '', // Não carregar chave por segurança
        instance_name: servidor.instance_name || '',
        whatsapp_cloud_token: '', // Não carregar token por segurança
        whatsapp_cloud_phone_number_id: servidor.whatsapp_cloud_phone_number_id || '',
        whatsapp_cloud_business_account_id: servidor.whatsapp_cloud_business_account_id || ''
      });
    } else if (!servidorAtivo) {
      setFormData(initialFormData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servidorAtivo?.data?.id, initialFormData]);

  // Forçar carregamento quando modal abrir
  useEffect(() => {
    if (show) {
      queryClient.invalidateQueries({ queryKey: ['servidor-whatsapp-ativo'] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveServidorMutation.mutateAsync(formData);
    } catch (error) {
      // O erro já é tratado no onError da mutation
    }
  };

  const handleSaveMensagem = useCallback(async () => {
    if (!mensagemType) {
      showError(t('whatsappServer.selectMessageType'));
      return;
    }

    // Para todos os tipos, se tiver template, não precisa de mensagem_padrao
    // Para envio_manual sem template, usar mensagem_manual como mensagem_padrao
    // Para outros tipos sem template, mensagem_padrao é obrigatória
    const isWhatsAppCloud = servidorAtivo?.data?.tipo_api === 'whatsapp_cloud';
    const temTemplate = !!templateMapping && templateMapping.trim() !== '';
    
    let mensagemPadraoFinal = mensagemPadrao;
    
    // Para envio_manual, se não tiver template, usar mensagem_manual como mensagem_padrao
    if (mensagemType === 'envio_manual' && !temTemplate && mensagemManual) {
      mensagemPadraoFinal = mensagemManual;
    } else if (mensagemType !== 'envio_manual' && !mensagemPadraoFinal && !temTemplate && !isWhatsAppCloud) {
      // Para Evolution API sem template (exceto envio_manual), mensagem_padrao é obrigatória
      showError(t('whatsappServer.messageRequired'));
      return;
    }

    await saveMensagemMutation.mutateAsync({
      tipo: mensagemType,
      tipo_envio: tipoEnvio,
      mensagem_padrao: mensagemPadraoFinal || '',
      mensagem_manual: mensagemManual || undefined,
      template_mapping: templateMapping || undefined,
      interacao1: interacao1 || undefined,
      interacao2: interacao2 || undefined,
      interacao3: interacao3 || undefined,
      ativo: true
    });
  }, [mensagemType, tipoEnvio, mensagemPadrao, mensagemManual, templateMapping, interacao1, interacao2, interacao3, servidorAtivo?.data?.tipo_api, saveMensagemMutation, showError, t]);

  const handleReset = useCallback(async () => {
    if (servidorAtivo?.data?.id) {
      try {
        await ServidorWhatsAppService.delete(servidorAtivo.data.id);
        success(t('whatsappServer.successRemove'));
        queryClient.invalidateQueries({ queryKey: ['servidor-whatsapp-ativo'] });
      } catch (err: unknown) {
        const error = err as AxiosError<{ message: string }>;
        showError(error?.response?.data?.message || t('whatsappServer.errorRemove'));
      }
    }
    setFormData(initialFormData);
  }, [servidorAtivo?.data?.id, success, queryClient, showError, initialFormData, t]);

  const handleClose = useCallback(() => {
    setFormData(initialFormData);
    onClose();
  }, [onClose, initialFormData]);

  const handleSendTestMessage = async () => {
    if (!testPhone.trim()) {
      showError(t('whatsappServer.testPhoneRequired'));
      return;
    }

    if (!testMessage.trim()) {
      showError(t('whatsappServer.testMessageRequired'));
      return;
    }

    if (!servidorAtivo?.data?.id) {
      showError(t('whatsappServer.configureFirst'));
      return;
    }

    // Usar mutate em vez de mutateAsync para evitar que erros não tratados sejam lançados
    // O onError já trata o erro e mostra a mensagem genérica
    sendTestMessageMutation.mutate({
      id: servidorAtivo.data.id,
      phone: testPhone.trim(),
      message: testMessage.trim()
    });
  };

  const handleCopyVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
    success(t('whatsappServer.variableCopied'));
  };

  const handleInsertVariable = (variable: string) => {
    if (mensagemType === 'envio_manual') {
      setMensagemManual(prev => prev + variable);
    } else {
      setMensagemPadrao(prev => prev + variable);
    }
  };

  const headerActionsContent = useMemo(() => (
    <div className="whatsapp-header-unified">
      {/* Botões à direita */}
      <div className="whatsapp-header-buttons modal-header-actions">
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={(e) => {
            if (activeTab === 'servidor') {
              const form = document.getElementById('servidor-whatsapp-form') as HTMLFormElement;
              form?.requestSubmit();
            } else {
              e.preventDefault();
              handleSaveMensagem();
            }
          }}
          isLoading={saveServidorMutation.isPending || saveMensagemMutation.isPending}
        >
          {t('actions.save')}
        </Button>
        <Button
          type="button"
          variant="outline-primary"
          size="sm"
          onClick={handleReset}
          disabled={saveServidorMutation.isPending}
        >
          {servidorAtivo?.data ? t('whatsappServer.removeServer') : t('buttons.clear')}
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleClose}
          disabled={saveServidorMutation.isPending}
        >
          {t('buttons.close')}
        </Button>
      </div>

      {/* Abas na parte inferior do header */}
      <div className="whatsapp-header-tabs">
        <ul
          className={`nav nav-tabs whatsapp-tabs-unified ${isMobile ? 'whatsapp-tabs-mobile' : ''}`}
          id="whatsappTab"
          role="tablist"
          style={{
            margin: 0,
            padding: 0,
            borderBottom: 'none',
            backgroundColor: 'transparent'
          }}
        >
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link modal-tab-hover ${activeTab === 'servidor' ? 'active' : ''}`}
              onClick={() => setActiveTab('servidor')}
              type="button"
            >
              {t('whatsappServer.server')}
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link ${activeTab === 'mensagens' ? 'active' : ''}`}
              onClick={() => setActiveTab('mensagens')}
              type="button"
            >
              {t('whatsappServer.messages')}
            </button>
          </li>
        </ul>
      </div>
    </div>
  ), [activeTab, saveServidorMutation.isPending, saveMensagemMutation.isPending, servidorAtivo?.data, handleClose, handleReset, handleSaveMensagem, isMobile, t]);

  const headerActionsContentRef = useRef(headerActionsContent);
  headerActionsContentRef.current = headerActionsContent;

  // Passar headerActions para o SingleModalWrapper quando skipWrapper for true
  useEffect(() => {
    if (skipWrapper && onHeaderActionsReady) {
      if (!show) {
        onHeaderActionsReady(null);
      } else {
        onHeaderActionsReady(headerActionsContentRef.current);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipWrapper, onHeaderActionsReady, activeTab, saveServidorMutation.isPending, saveMensagemMutation.isPending, servidorAtivo?.data, show]);

  useEffect(() => {
    return () => {
      if (skipWrapper && onHeaderActionsReady) {
        onHeaderActionsReady(null);
      }
    };
  }, [skipWrapper, onHeaderActionsReady]);

  const modalContent = (
    <>
      {isLoading ? (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
          <Spinner size="md" variant="primary" aria-label={t('messages.loading')} />
        </div>
      ) : (
      <div className="whatsapp-modal-content">
        {/* Conteúdo das Abas */}
        <div
          className={`tab-content whatsapp-tab-content whatsapp-tab-content-padded`}
          id="whatsappTabContent"
        >
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
              mensagemManual={mensagemManual}
              templateMapping={templateMapping}
              interacao1={interacao1}
              interacao2={interacao2}
              interacao3={interacao3}
              isWhatsAppCloud={servidorAtivo?.data?.tipo_api === 'whatsapp_cloud'}
              onMensagemTypeChange={setMensagemType}
              onTipoEnvioChange={setTipoEnvio}
              onMensagemPadraoChange={setMensagemPadrao}
              onMensagemManualChange={setMensagemManual}
              onTemplateMappingChange={setTemplateMapping}
              onInteracao1Change={setInteracao1}
              onInteracao2Change={setInteracao2}
              onInteracao3Change={setInteracao3}
              onSaveMensagem={handleSaveMensagem}
              isPending={saveMensagemMutation.isPending}
              variaveisData={variaveisData}
              onCopyVariable={handleCopyVariable}
              onInsertVariable={handleInsertVariable}
              onShowTemplates={() => setShowTemplatesModal(true)}
            />
          )}
        </div>
      </div>
      )}
      {showTemplatesModal && (
        <TemplatesModal
          show={showTemplatesModal}
          onClose={() => setShowTemplatesModal(false)}
        />
      )}
    </>
  );

  if (skipWrapper) {
    return modalContent;
  }

  return (
    <>
      <DraggableModal
        show={show}
        onClose={handleClose}
        title={t('whatsappServer.title')}
        size="lg"
        modalId="servidor-whatsapp-modal"
        headerActions={headerActionsContent}
      >
        {modalContent}
      </DraggableModal>
    </>
  );
};

export default ServidorWhatsappModal;

