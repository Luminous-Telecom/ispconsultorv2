import React, { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useIsMobile } from 'hooks/useMediaQuery';
import { useI18n } from 'contexts/I18nContext';
import { ServidorEmailService, MensagemEmail } from 'services/servidorEmailService';
import DraggableModal from 'components/common/DraggableModal';
import ModalTabsOverflow, { ModalTabItem } from 'components/common/ModalTabsOverflow';
import { FecharButton, LimparButton, Loading, RemoverButton, SalvarButton } from 'components/ui';
import { formatDateTime } from 'utils/formatters';
import { ServidorEmailForm, ServidorEmailModalProps } from './types';
import ServidorTab from './abas/ServidorTab';
import MensagensTab from './abas/MensagensTab';
import SaasServidorEmailModal from 'components/modals/saas/SaasServidorEmailModal';

const INITIAL_FORM_DATA: ServidorEmailForm = {
  host: '',
  porta: 587,
  usuario: '',
  senha: '',
  ssl: false,
  tls: true,
  nome_remetente: '',
  email_remetente: '',
  timeout: 30000,
  tentativas: 3,
  intervalo_tentativas: 5000
};

const ServidorEmailModalAdm: React.FC<Omit<ServidorEmailModalProps, 'variant'>> = ({ show, onClose, skipWrapper = false, onHeaderActionsReady }) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'servidor' | 'mensagens'>('servidor');
  const [emailTeste, setEmailTeste] = useState<string>('');
  const [formData, setFormData] = useState<ServidorEmailForm>(INITIAL_FORM_DATA);
  const [mensagemTexto, setMensagemTexto] = useState<string>('<p></p>');
  const [mensagemManual, setMensagemManual] = useState<string>('<p></p>');
  const [tipoEnvio, setTipoEnvio] = useState<'desativado' | 'pdf'>('pdf');
  const [mensagemType, setMensagemType] = useState<string>('');
  const mensagemTypeRef = useRef<string>('');
  const mensagemTextoRef = useRef<string>('<p></p>');
  const mensagemManualRef = useRef<string>('<p></p>');
  const tipoEnvioRef = useRef<'desativado' | 'pdf'>('pdf');
  const lastLoadedMensagemIdRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    mensagemTypeRef.current = mensagemType;
    if (mensagemType) {
      lastLoadedMensagemIdRef.current = undefined;
    }
  }, [mensagemType]);

  // Ao abrir a aba Mensagens, garantir que um tipo esteja selecionado (evita "Selecione um tipo" ao salvar)
  useEffect(() => {
    if (activeTab === 'mensagens' && !mensagemType) {
      setMensagemType('10_dias_antes_vencimento');
    }
  }, [activeTab, mensagemType]);

  useEffect(() => {
    mensagemTextoRef.current = mensagemTexto;
  }, [mensagemTexto]);

  useEffect(() => {
    mensagemManualRef.current = mensagemManual;
  }, [mensagemManual]);

  useEffect(() => {
    tipoEnvioRef.current = tipoEnvio;
  }, [tipoEnvio]);
  const [editorKey, setEditorKey] = useState<number>(0);

  // Buscar mensagem quando tipo for selecionado
  const { data: mensagemData } = useQuery({
    queryKey: ['mensagem-email', mensagemType],
    queryFn: async () => {
      if (!mensagemType) return null;
      try {
        return await ServidorEmailService.getMensagemByTipo(mensagemType);
      } catch {
        return null;
      }
    },
    enabled: !!mensagemType
  });

  const ultimaAtualizacaoMensagem = useMemo(
    () => (mensagemData?.updated_at ? formatDateTime(mensagemData.updated_at) : '-'),
    [mensagemData?.updated_at],
  );

  // Buscar servidor ativo
  const { data: servidorAtivo, isLoading } = useQuery({
    queryKey: ['servidor-email-ativo'],
    queryFn: async () => {
      try {
        return await ServidorEmailService.getActive();
      } catch {
        return null;
      }
    },
    enabled: show,
    retry: false,
  });

  const saveServidorMutation = useMutation({
    mutationFn: ServidorEmailService.createOrUpdate,
    onSuccess: () => {
      success('Configurações salvas!');
      queryClient.invalidateQueries({ queryKey: ['servidor-email-ativo'] });
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.SERVER_EMAIL_SAVE_ERROR)
  });

  const saveMensagemMutation = useMutation({
    mutationFn: ServidorEmailService.saveMensagem,
    onSuccess: (response) => {
      if (response.success) {
        success('Mensagem salva!');
        const currentMensagemType = mensagemTypeRef.current;
        
        if (currentMensagemType && response.data) {
          lastLoadedMensagemIdRef.current = response.data.id;
          queryClient.setQueryData(['mensagem-email', currentMensagemType], response.data);
        }
      } else {
        showApiError(response.message || CONTEXT_ERROR_MESSAGES.SERVER_EMAIL_SAVE_ERROR);
      }
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.SERVER_EMAIL_SAVE_ERROR),
  });

  const sendTestEmailMutation = useMutation({
    mutationFn: (data: { id: number; email: string }) => ServidorEmailService.sendTestEmail(data.id, data.email),
    onSuccess: () => success('Email enviado!'),
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.SERVER_EMAIL_SEND_ERROR)
  });

  useEffect(() => {
    if (servidorAtivo?.data) {
      setFormData({
        host: servidorAtivo.data.host,
        porta: servidorAtivo.data.porta,
        usuario: servidorAtivo.data.usuario,
        senha: '',
        ssl: servidorAtivo.data.ssl,
        tls: servidorAtivo.data.tls,
        nome_remetente: servidorAtivo.data.nome_remetente,
        email_remetente: servidorAtivo.data.email_remetente,
        timeout: servidorAtivo.data.timeout,
        tentativas: servidorAtivo.data.tentativas,
        intervalo_tentativas: servidorAtivo.data.intervalo_tentativas
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servidorAtivo?.data?.id]);

  useEffect(() => {
    if (!mensagemType) {
      setTipoEnvio('pdf');
      setMensagemTexto('<p></p>');
      setMensagemManual('<p></p>');
      lastLoadedMensagemIdRef.current = undefined;
      return;
    }

    if (mensagemData?.id && mensagemData.id !== lastLoadedMensagemIdRef.current) {
      setTipoEnvio(mensagemData.tipo_envio);
      setMensagemTexto(mensagemData.mensagem_padrao || '<p></p>');
      setMensagemManual(mensagemData.mensagem_manual || '<p></p>');
      setEditorKey(prev => prev + 1);
      lastLoadedMensagemIdRef.current = mensagemData.id;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mensagemData?.id, mensagemType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveServidorMutation.mutate(formData);
  };

  const handleSaveMensagem = useCallback(() => {
    const currentMensagemType = mensagemTypeRef.current;
    const currentMensagemTexto = mensagemTextoRef.current;
    const currentMensagemManual = mensagemManualRef.current;
    const currentTipoEnvio = tipoEnvioRef.current;

    if (!currentMensagemType) {
      showApiError('Selecione um tipo');
      return;
    }

    if (currentTipoEnvio === 'pdf' && !currentMensagemTexto?.trim() && currentMensagemType !== 'envio_manual') {
      showApiError('Preencha a mensagem');
      return;
    }

    if (currentMensagemType === 'envio_manual' && !currentMensagemManual?.trim() && !currentMensagemTexto?.trim()) {
      showApiError('Preencha a mensagem manual ou padrão');
      return;
    }
    
    const dataToSave: MensagemEmail = {
      tipo: currentMensagemType,
      tipo_envio: currentTipoEnvio,
      mensagem_padrao: currentMensagemTexto || '<p></p>',
      mensagem_manual: currentMensagemManual && currentMensagemManual.trim() ? currentMensagemManual : undefined,
      ativo: true
    };
    
    saveMensagemMutation.mutate(dataToSave);
  }, [saveMensagemMutation, showApiError]);

  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
    setMensagemType('');
    setMensagemTexto('<p></p>');
    setMensagemManual('<p></p>');
    setTipoEnvio('pdf');
    setActiveTab('servidor');
    setEmailTeste('');
    lastLoadedMensagemIdRef.current = undefined;
  }, []);

  const handleReset = useCallback(() => {
    if (servidorAtivo?.data?.id) {
      ServidorEmailService.delete(servidorAtivo.data.id).then(() => {
        success('Servidor removido!');
        queryClient.invalidateQueries({ queryKey: ['servidor-email-ativo'] });
      });
    }
    resetForm();
  }, [servidorAtivo?.data?.id, success, queryClient, resetForm]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  useEffect(() => {
    if (!show) {
      resetForm();
    }
  }, [show, resetForm]);

  const handleSendTestEmail = () => {
    if (!emailTeste.trim()) return showApiError('Digite um e-mail');
    if (!servidorAtivo?.data?.id) return showApiError('Configure o servidor');
    sendTestEmailMutation.mutate({ id: servidorAtivo.data.id, email: emailTeste.trim() });
  };

  const handleFormChange = (field: keyof ServidorEmailForm, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveClick = useCallback(() => {
    if (activeTab === 'servidor') {
      const form = document.getElementById('servidor-email-form') as HTMLFormElement;
      form?.requestSubmit();
    } else {
      handleSaveMensagem();
    }
  }, [activeTab, handleSaveMensagem]);

  const emailTabs = useMemo(
    (): ModalTabItem<'servidor' | 'mensagens'>[] => [
      { id: 'servidor', label: t('whatsappServer.server') },
      { id: 'mensagens', label: t('whatsappServer.messages') },
    ],
    [t]
  );

  const headerActionsContent = useMemo(() => (
    <div className="email-header-unified">
      {/* Botões à direita - ordem padrão: Cancelar/Fechar, Salvar, Remover */}
      <div className="email-header-buttons modal-header-actions">
        <FecharButton type="button" onClick={handleClose} isPending={saveServidorMutation.isPending} />
        <SalvarButton
          type="button"
          onClick={handleSaveClick}
          isPending={saveServidorMutation.isPending || saveMensagemMutation.isPending}
        />
        {(show && servidorAtivo?.data) ? (
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
      <div className="email-header-tabs">
        <ModalTabsOverflow
          tabs={emailTabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabsClassName={`email-tabs-unified ${isMobile ? 'email-tabs-mobile' : ''}`}
          isMobile={isMobile}
          id="emailTab"
        />
      </div>
    </div>
  ), [handleSaveClick, saveServidorMutation.isPending, saveMensagemMutation.isPending, show, servidorAtivo?.data, handleReset, handleClose, activeTab, isMobile, emailTabs]);

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
        <Loading variant="modal" />
      ) : (
      <div className="email-modal-content">
        {/* Conteúdo das Abas */}
        <div
          className={`tab-content email-tab-content email-tab-content-padded`}
          id="emailTabContent"
        >
          <form id="servidor-email-form" onSubmit={handleSubmit} className="form-modal-simple">
            {/* Conteúdo da Aba Servidor */}
            {activeTab === 'servidor' && (
              <ServidorTab
                formData={formData}
                onChange={handleFormChange}
                isPending={saveServidorMutation.isPending}
                servidorAtivo={servidorAtivo}
                emailTeste={emailTeste}
                onEmailTesteChange={setEmailTeste}
                onSendTestEmail={handleSendTestEmail}
                isSendingTest={sendTestEmailMutation.isPending}
              />
            )}

            {/* Conteúdo da Aba Mensagens */}
            {activeTab === 'mensagens' && (
              <MensagensTab
                mensagemType={mensagemType}
                tipoEnvio={tipoEnvio}
                mensagemTexto={mensagemTexto}
                mensagemManual={mensagemManual}
                editorKey={editorKey}
                lastUpdated={ultimaAtualizacaoMensagem}
                onMensagemTypeChange={setMensagemType}
                onTipoEnvioChange={setTipoEnvio}
                onMensagemTextoChange={setMensagemTexto}
                onMensagemManualChange={setMensagemManual}
                onSaveMensagem={handleSaveMensagem}
                isPending={saveMensagemMutation.isPending}
              />
            )}
          </form>
        </div>
      </div>
      )}
    </>
  );

  if (skipWrapper) {
    return modalContent;
  }

  return (
    <DraggableModal
      show={show}
      onClose={handleClose}
      title={t('modal.emailServer')}
      size="xl"
      modalId="servidor-email-modal"
      headerActions={headerActionsContent}
    >
      {modalContent}
    </DraggableModal>
  );
};

const ServidorEmailModal: React.FC<ServidorEmailModalProps> = (props) => {
  if (props.variant === 'saas') {
    return <SaasServidorEmailModal show={props.show} onClose={props.onClose} skipWrapper={props.skipWrapper} />;
  }
  return <ServidorEmailModalAdm {...props} />;
};

export default ServidorEmailModal;

