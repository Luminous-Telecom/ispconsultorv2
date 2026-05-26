import React, { useState, useEffect, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useIsMobile } from 'hooks/useMediaQuery';
import { ServidorWhatsAppService, MensagemWhatsApp } from 'services/servidorWhatsAppService';
import { defaultApiClient } from 'services/core';
import DraggableModal from 'components/common/DraggableModal';
import { FecharButton, LimparButton, RemoverButton, SalvarButton, Spinner } from 'components/ui';
import { ServidorWhatsAppForm, ServidorWhatsappModalProps } from './types';
import ServidorTab from './abas/ServidorTab';
import MensagensTab from './abas/MensagensTab';
import TemplatesTab from './abas/TemplatesTab';
import TemplatesMetaTab from './abas/TemplatesMetaTab';
import TemplateSelectModal from './TemplateSelectModal';
import { useI18n } from 'contexts/I18nContext';
import SaasServidorWhatsappModal from 'components/modals/saas/SaasServidorWhatsappModal';

interface GrupoVariaveis {
  titulo: string;
  variaveis: Array<{ variavel: string; descricao: string }>;
}

const ServidorWhatsappModalAdm: React.FC<Omit<ServidorWhatsappModalProps, 'variant'>> = ({ show, onClose, skipWrapper = false, onHeaderActionsReady }) => {
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
  const [activeTab, setActiveTab] = useState<'servidor' | 'mensagens' | 'templates_meta' | 'templates'>('servidor');
  const [showTemplateSelectModal, setShowTemplateSelectModal] = useState(false);
  
  // Estados para mensagens
  const [mensagemType, setMensagemType] = useState<string>('');
  const mensagemTypeRef = useRef<string>('');
  const [tipoEnvio, setTipoEnvio] = useState<'desativado' | 'pdf'>('pdf');
  const tipoEnvioRef = useRef<'desativado' | 'pdf'>('pdf');
  const [mensagemPadrao, setMensagemPadrao] = useState<string>('');
  const mensagemPadraoRef = useRef<string>('');
  const [mensagemManual, setMensagemManual] = useState<string>('');
  const mensagemManualRef = useRef<string>('');
  const [templateId, setTemplateId] = useState<number | null>(null);
  const templateIdRef = useRef<number | null>(null);
  const [interacao1, setInteracao1] = useState<string>('');
  const interacao1Ref = useRef<string>('');
  const [interacao2, setInteracao2] = useState<string>('');
  const interacao2Ref = useRef<string>('');
  const [interacao3, setInteracao3] = useState<string>('');
  const interacao3Ref = useRef<string>('');

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

// Refs sincronizados com o state (botão Salvar no header lê os refs para evitar closure desatualizada)
useEffect(() => {
  mensagemTypeRef.current = mensagemType;
  tipoEnvioRef.current = tipoEnvio;
  mensagemPadraoRef.current = mensagemPadrao;
  mensagemManualRef.current = mensagemManual;
  templateIdRef.current = templateId;
  interacao1Ref.current = interacao1;
  interacao2Ref.current = interacao2;
  interacao3Ref.current = interacao3;
}, [mensagemType, tipoEnvio, mensagemPadrao, mensagemManual, templateId, interacao1, interacao2, interacao3]);

useEffect(() => {
  if (activeTab === 'mensagens' && !mensagemType) {
    setMensagemType('10_dias_antes_vencimento');
  }
}, [activeTab, mensagemType]);

// Carregar dados da mensagem quando buscar
useEffect(() => {
  if (mensagemData) {
    setTipoEnvio(mensagemData.tipo_envio);
    setMensagemPadrao(mensagemData.mensagem_padrao ?? '');
    setMensagemManual(mensagemData.mensagem_manual ?? '');
    setTemplateId(mensagemData.template_id ?? mensagemData.template?.id ?? null);
    setInteracao1(mensagemData.interacao1 ?? '');
    setInteracao2(mensagemData.interacao2 ?? '');
    setInteracao3(mensagemData.interacao3 ?? '');
  } else {
    setTipoEnvio('pdf');
    setMensagemPadrao('');
    setMensagemManual('');
    setTemplateId(null);
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
    const currentMensagemType = mensagemTypeRef.current || mensagemType;
    const currentTipoEnvio = tipoEnvioRef.current;
    const currentMensagemPadrao = mensagemPadraoRef.current;
    const currentMensagemManual = mensagemManualRef.current;
    const currentTemplateId = templateIdRef.current;
    const currentInteracao1 = interacao1Ref.current;
    const currentInteracao2 = interacao2Ref.current;
    const currentInteracao3 = interacao3Ref.current;

    if (!currentMensagemType) {
      showError(t('whatsappServer.selectMessageType'));
      return;
    }

    const isWhatsAppCloud = servidorAtivo?.data?.tipo_api === 'whatsapp_cloud';
    const temTemplate = !!currentTemplateId;

    let mensagemPadraoFinal = currentMensagemPadrao;
    if (currentMensagemType === 'envio_manual' && !temTemplate && currentMensagemManual) {
      mensagemPadraoFinal = currentMensagemManual;
    } else if (currentMensagemType !== 'envio_manual' && !mensagemPadraoFinal && !temTemplate && !isWhatsAppCloud) {
      showError(t('whatsappServer.messageRequired'));
      return;
    }

    await saveMensagemMutation.mutateAsync({
      tipo: currentMensagemType,
      tipo_envio: currentTipoEnvio,
      mensagem_padrao: mensagemPadraoFinal || '',
      mensagem_manual: currentMensagemManual || undefined,
      template_id: currentTemplateId,
      interacao1: currentInteracao1 || undefined,
      interacao2: currentInteracao2 || undefined,
      interacao3: currentInteracao3 || undefined,
      ativo: true
    });
  }, [mensagemType, servidorAtivo?.data?.tipo_api, saveMensagemMutation, showError, t]);

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
      {/* Botões à direita - ordem padrão: Fechar, Salvar, Remover */}
      <div className="whatsapp-header-buttons modal-header-actions">
        <FecharButton type="button" onClick={handleClose} isPending={saveServidorMutation.isPending} />
        <SalvarButton
          type="button"
          onClick={(e) => {
            if (activeTab === 'servidor') {
              const form = document.getElementById('servidor-whatsapp-form') as HTMLFormElement;
              form?.requestSubmit();
            } else if (activeTab === 'mensagens') {
              e.preventDefault();
              handleSaveMensagem();
            }
          }}
          disabled={activeTab === 'templates' || activeTab === 'templates_meta'}
          isPending={saveServidorMutation.isPending || saveMensagemMutation.isPending}
        />
        {servidorAtivo?.data ? (
          <RemoverButton
            type="button"
            onClick={handleReset}
            disabled={saveServidorMutation.isPending}
          />
        ) : (
          <LimparButton
            type="button"
            onClick={handleReset}
            disabled={saveServidorMutation.isPending}
          />
        )}
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
              className={`nav-link modal-tab-hover ${activeTab === 'mensagens' ? 'active' : ''}`}
              onClick={() => setActiveTab('mensagens')}
              type="button"
            >
              {t('whatsappServer.messages')}
            </button>
          </li>
          {(formData.tipo_api === 'whatsapp_cloud' || servidorAtivo?.data?.tipo_api === 'whatsapp_cloud') && (
            <>
              <li className="nav-item" role="presentation">
                <button
                  className={`nav-link modal-tab-hover ${activeTab === 'templates_meta' ? 'active' : ''}`}
                  onClick={() => setActiveTab('templates_meta')}
                  type="button"
                >
                  {t('whatsappServer.templatesMeta')}
                </button>
              </li>
              <li className="nav-item" role="presentation">
                <button
                  className={`nav-link modal-tab-hover ${activeTab === 'templates' ? 'active' : ''}`}
                  onClick={() => setActiveTab('templates')}
                  type="button"
                >
                  {t('whatsappServer.templates')}
                </button>
              </li>
            </>
          )}
        </ul>
      </div>
    </div>
  ), [activeTab, formData.tipo_api, saveServidorMutation.isPending, saveMensagemMutation.isPending, servidorAtivo?.data, handleClose, handleReset, handleSaveMensagem, isMobile, t]);

  const headerActionsContentRef = useRef(headerActionsContent);
  headerActionsContentRef.current = headerActionsContent;

  // useLayoutEffect garante que os botões apareçam antes da pintura
  useLayoutEffect(() => {
    if (skipWrapper && onHeaderActionsReady) {
      if (!show) {
        onHeaderActionsReady(null);
      } else {
        onHeaderActionsReady(headerActionsContentRef.current);
      }
    }
    return () => {
      if (skipWrapper && onHeaderActionsReady) {
        onHeaderActionsReady(null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipWrapper, onHeaderActionsReady, activeTab, saveServidorMutation.isPending, saveMensagemMutation.isPending, servidorAtivo?.data, show]);

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
          className={`tab-content whatsapp-tab-content whatsapp-tab-content-scrollable ${
            (activeTab === 'templates' || activeTab === 'templates_meta') ? '' : 'whatsapp-tab-content-padded'
          }`}
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
              templateId={templateId}
              templateNome={mensagemData?.template ? `${mensagemData.template.nome} (${mensagemData.template.idioma})` : undefined}
              interacao1={interacao1}
              interacao2={interacao2}
              interacao3={interacao3}
              isWhatsAppCloud={servidorAtivo?.data?.tipo_api === 'whatsapp_cloud'}
              onMensagemTypeChange={setMensagemType}
              onTipoEnvioChange={setTipoEnvio}
              onMensagemPadraoChange={setMensagemPadrao}
              onMensagemManualChange={setMensagemManual}
              onTemplateIdChange={setTemplateId}
              onInteracao1Change={setInteracao1}
              onInteracao2Change={setInteracao2}
              onInteracao3Change={setInteracao3}
              onSaveMensagem={handleSaveMensagem}
              isPending={saveMensagemMutation.isPending}
              variaveisData={variaveisData}
              onCopyVariable={handleCopyVariable}
              onInsertVariable={handleInsertVariable}
              onShowTemplates={() => setShowTemplateSelectModal(true)}
            />
          )}

          {activeTab === 'templates_meta' && (
            <TemplatesMetaTab enabled={true} />
          )}
          {activeTab === 'templates' && (
            <TemplatesTab />
          )}
        </div>
      </div>
      )}
      {showTemplateSelectModal && (
        <TemplateSelectModal
          show={showTemplateSelectModal}
          onClose={() => setShowTemplateSelectModal(false)}
          onSelect={({ template_id: templateId }) => {
            setTemplateId(templateId);
            setShowTemplateSelectModal(false);
          }}
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

const ServidorWhatsappModal: React.FC<ServidorWhatsappModalProps> = (props) => {
  if (props.variant === 'saas') {
    return <SaasServidorWhatsappModal show={props.show} onClose={props.onClose} skipWrapper={props.skipWrapper} />;
  }
  return <ServidorWhatsappModalAdm {...props} />;
};

export default ServidorWhatsappModal;

