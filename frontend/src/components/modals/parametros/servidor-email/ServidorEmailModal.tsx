import React, { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { ServidorEmailService } from '@/services/servidorEmailService';
import DraggableModal from '@/components/common/DraggableModal';
import { ServidorEmailForm, ServidorEmailModalProps } from './types';
import ServidorTab from './abas/ServidorTab';
import MensagensTab from './abas/MensagensTab';

const ServidorEmailModal: React.FC<ServidorEmailModalProps> = ({ show, onClose }) => {
  const { success, error: showError } = useNotificationContext();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'servidor' | 'mensagens'>('servidor');
  const [emailTeste, setEmailTeste] = useState<string>('');

  const initialFormData: ServidorEmailForm = useMemo(() => ({
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
  }), []);

  const [formData, setFormData] = useState<ServidorEmailForm>(() => initialFormData);
  const [mensagemTexto, setMensagemTexto] = useState<string>('<p></p>');
  const [mensagemManual, setMensagemManual] = useState<string>('<p></p>');
  const [tipoEnvio, setTipoEnvio] = useState<'desativado' | 'pdf'>('pdf');
  const [mensagemType, setMensagemType] = useState<string>('');

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
    onError: () => showError('Erro ao salvar')
  });

  const saveMensagemMutation = useMutation({
    mutationFn: ServidorEmailService.saveMensagem,
    onSuccess: () => success('Mensagem salva!'),
    onError: () => showError('Erro ao salvar')
  });

  const sendTestEmailMutation = useMutation({
    mutationFn: (data: { id: number; email: string }) => ServidorEmailService.sendTestEmail(data.id, data.email),
    onSuccess: () => success('Email enviado!'),
    onError: () => showError('Erro ao enviar')
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
    } else {
      setFormData(initialFormData);
    }
  }, [servidorAtivo, initialFormData]);

  useEffect(() => {
    if (mensagemData) {
      setTipoEnvio(mensagemData.tipo_envio);
      setMensagemTexto(mensagemData.mensagem_padrao || '<p></p>');
      setMensagemManual(mensagemData.mensagem_manual || '<p></p>');
    } else {
      setTipoEnvio('pdf');
      setMensagemTexto('<p></p>');
      setMensagemManual('<p></p>');
    }
  }, [mensagemData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveServidorMutation.mutateAsync(formData);
  };

  const handleSaveMensagem = () => {
    if (!mensagemType) return showError('Selecione um tipo');
    saveMensagemMutation.mutate({ 
      tipo: mensagemType, 
      tipo_envio: tipoEnvio, 
      mensagem_padrao: mensagemTexto,
      mensagem_manual: mensagemManual || undefined,
      ativo: true 
    });
  };

  const handleReset = () => {
    if (servidorAtivo?.data?.id) {
      ServidorEmailService.delete(servidorAtivo.data.id).then(() => {
        success('Servidor removido!');
        queryClient.invalidateQueries({ queryKey: ['servidor-email-ativo'] });
      });
    }
    setFormData(initialFormData);
  };

  const handleClose = () => {
    setFormData(initialFormData);
    setMensagemType('');
    setMensagemTexto('<p></p>');
    setTipoEnvio('pdf');
    onClose();
  };

  const handleSendTestEmail = () => {
    if (!emailTeste.trim()) return showError('Digite um e-mail');
    if (!servidorAtivo?.data?.id) return showError('Configure o servidor');
    sendTestEmailMutation.mutate({ id: servidorAtivo.data.id, email: emailTeste.trim() });
  };

  const handleFormChange = (field: keyof ServidorEmailForm, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <DraggableModal
        show={show}
        onClose={handleClose}
        title="Servidor de E-Mail"
        size="lg"
        modalId="servidor-email-modal"
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
      title="Servidor de E-Mail"
      size="xl"
      modalId="servidor-email-modal"
      headerActions={
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              if (activeTab === 'servidor') {
                const form = document.getElementById('servidor-email-form') as HTMLFormElement;
                form?.requestSubmit();
              } else {
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
      <div className="modal-body p-2" style={{ maxHeight: 'calc(90vh - 120px)', overflowY: 'auto' }}>
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

        <form id="servidor-email-form" onSubmit={handleSubmit}>
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
    </DraggableModal>
  );
};

export default ServidorEmailModal;

