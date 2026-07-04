import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { ServidorWhatsAppService, MensagemWhatsApp } from 'services/servidorWhatsAppService';
import { defaultApiClient } from 'services/core';
import { useI18n } from 'contexts/I18nContext';
import { ServidorWhatsAppForm, ServidorWhatsappModalProps } from '../types';
import { GrupoVariaveis, INITIAL_FORM_DATA, WhatsappActiveTab } from './constants';

type UseServidorWhatsappModalParams = Omit<
  ServidorWhatsappModalProps,
  'variant' | 'skipWrapper' | 'onHeaderActionsReady'
>;

export function useServidorWhatsappModal({ show, onClose }: UseServidorWhatsappModalParams) {
  const { t } = useI18n();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const queryClient = useQueryClient();

  const initialFormData = useMemo(() => ({ ...INITIAL_FORM_DATA }), []);

  const [formData, setFormData] = useState<ServidorWhatsAppForm>(initialFormData);
  const [testPhone, setTestPhone] = useState<string>('');
  const [testMessage, setTestMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<WhatsappActiveTab>('servidor');
  const [showTemplateSelectModal, setShowTemplateSelectModal] = useState(false);

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

  const { data: mensagemData } = useQuery({
    queryKey: ['mensagem-whatsapp', mensagemType],
    queryFn: async () => {
      if (!mensagemType) return null;
      try {
        return await ServidorWhatsAppService.getByTipo(mensagemType);
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number } };
        if (axiosErr?.response?.status === 404) {
          return null;
        }
        throw err;
      }
    },
    enabled: !!mensagemType,
  });

  const { data: variaveisData } = useQuery<Record<string, GrupoVariaveis>>({
    queryKey: ['variaveis-documento'],
    queryFn: async () => {
      const response = await defaultApiClient.get<Record<string, GrupoVariaveis>>('/modelos-documento/variaveis');

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || t('messages.error'));
    },
    staleTime: 5 * 60 * 1000,
  });

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

  const saveServidorMutation = useMutation({
    mutationFn: (data: ServidorWhatsAppForm) => {
      return ServidorWhatsAppService.createOrUpdate(data);
    },
    onSuccess: async () => {
      success(t('whatsappServer.successSave'));
      queryClient.invalidateQueries({ queryKey: ['servidor-whatsapp-ativo'] });
      await refetchServidorAtivo();
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.SERVER_WHATSAPP_SAVE_ERROR),
  });

  const sendTestMessageMutation = useMutation({
    mutationFn: async (data: { id: number; phone: string; message: string }) => {
      return ServidorWhatsAppService.sendTestMessage(data.id, data.phone, data.message);
    },
    onSuccess: (response: { message: string }) => {
      success(response.message);
    },
    onError: () => showApiError(t('whatsappServer.errorSendTest')),
  });

  const saveMensagemMutation = useMutation({
    mutationFn: (data: MensagemWhatsApp) => {
      return ServidorWhatsAppService.saveMensagem(data);
    },
    onSuccess: () => {
      success(t('whatsappServer.successMessageSave'));
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.SERVER_SEND_ERROR),
  });

  useEffect(() => {
    if (servidorAtivo?.data) {
      const servidor = servidorAtivo.data;
      setFormData({
        tipo_api: servidor.tipo_api || 'evolution',
        evolution_api_url: servidor.evolution_api_url || '',
        evolution_api_key: '',
        instance_name: servidor.instance_name || '',
        whatsapp_cloud_token: '',
        whatsapp_cloud_phone_number_id: servidor.whatsapp_cloud_phone_number_id || '',
        whatsapp_cloud_business_account_id: servidor.whatsapp_cloud_business_account_id || '',
      });
    } else if (!servidorAtivo) {
      setFormData(initialFormData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servidorAtivo?.data?.id, initialFormData]);

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
    } catch {
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
      showApiError(t('whatsappServer.selectMessageType'));
      return;
    }

    const isWhatsAppCloud = servidorAtivo?.data?.tipo_api === 'whatsapp_cloud';
    const temTemplate = !!currentTemplateId;

    if (currentMensagemType === 'envio_manual' && !temTemplate && !currentMensagemManual.trim()) {
      showApiError(t('whatsappServer.manualMessageRequired'));
      return;
    }

    const mensagemPadraoFinal = currentMensagemType === 'envio_manual' ? '' : currentMensagemPadrao;
    if (currentMensagemType !== 'envio_manual' && !mensagemPadraoFinal && !temTemplate && !isWhatsAppCloud) {
      showApiError(t('whatsappServer.messageRequired'));
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
      ativo: true,
    });
  }, [mensagemType, servidorAtivo?.data?.tipo_api, saveMensagemMutation, showApiError, t]);

  const handleReset = useCallback(async () => {
    if (servidorAtivo?.data?.id) {
      try {
        await ServidorWhatsAppService.delete(servidorAtivo.data.id);
        success(t('whatsappServer.successRemove'));
        queryClient.invalidateQueries({ queryKey: ['servidor-whatsapp-ativo'] });
      } catch (err: unknown) {
        showApiError(err, CONTEXT_ERROR_MESSAGES.SERVER_WHATSAPP_DELETE_ERROR);
      }
    }
    setFormData(initialFormData);
  }, [servidorAtivo?.data?.id, success, queryClient, showApiError, initialFormData, t]);

  const handleClose = useCallback(() => {
    setFormData(initialFormData);
    onClose();
  }, [onClose, initialFormData]);

  const handleSendTestMessage = async () => {
    if (!testPhone.trim()) {
      showApiError(t('whatsappServer.testPhoneRequired'));
      return;
    }

    if (!testMessage.trim()) {
      showApiError(t('whatsappServer.testMessageRequired'));
      return;
    }

    if (!servidorAtivo?.data?.id) {
      showApiError(t('whatsappServer.configureFirst'));
      return;
    }

    sendTestMessageMutation.mutate({
      id: servidorAtivo.data.id,
      phone: testPhone.trim(),
      message: testMessage.trim(),
    });
  };

  const handleInsertVariable = (variable: string) => {
    if (mensagemType === 'envio_manual') {
      setMensagemManual((prev) => prev + variable);
    } else {
      setMensagemPadrao((prev) => prev + variable);
    }
  };

  const handleFormFieldChange = useCallback(
    (field: keyof ServidorWhatsAppForm, value: string | 'evolution' | 'whatsapp_cloud') => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleTemplateSelect = useCallback(({ template_id: selectedTemplateId }: { template_id: number }) => {
    setTemplateId(selectedTemplateId);
    setShowTemplateSelectModal(false);
  }, []);

  return {
    t,
    isLoading,
    formData,
    testPhone,
    testMessage,
    activeTab,
    setActiveTab,
    showTemplateSelectModal,
    setShowTemplateSelectModal,
    mensagemType,
    setMensagemType,
    tipoEnvio,
    setTipoEnvio,
    mensagemPadrao,
    setMensagemPadrao,
    mensagemManual,
    setMensagemManual,
    templateId,
    setTemplateId,
    interacao1,
    setInteracao1,
    interacao2,
    setInteracao2,
    interacao3,
    setInteracao3,
    mensagemData,
    variaveisData,
    servidorAtivo,
    saveServidorMutation,
    saveMensagemMutation,
    sendTestMessageMutation,
    handleSubmit,
    handleSaveMensagem,
    handleReset,
    handleClose,
    handleSendTestMessage,
    handleInsertVariable,
    handleFormFieldChange,
    handleTemplateSelect,
    setTestPhone,
    setTestMessage,
  };
}
