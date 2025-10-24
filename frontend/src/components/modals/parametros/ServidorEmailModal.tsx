import React, { useState, useEffect } from 'react';
import DraggableModal from '../../common/DraggableModal';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import { ServidorEmailService, ServidorEmail } from '../../../services/servidorEmailService';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormField, Checkbox } from '../../ui';

interface ServidorEmailModalProps {
  show: boolean;
  onClose: () => void;
}

interface ServidorEmailForm {
  host: string;
  porta: number;
  usuario: string;
  senha: string;
  ssl: boolean;
  tls: boolean;
  nome_remetente: string;
  email_remetente: string;
  timeout: number;
  tentativas: number;
  intervalo_tentativas: number;
}

interface EmailTeste {
  email_teste: string;
}

const ServidorEmailModal: React.FC<ServidorEmailModalProps> = ({ show, onClose }) => {
  const { success, error: showError } = useNotificationContext();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);

  const initialFormData: ServidorEmailForm = {
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

  const [formData, setFormData] = useState<ServidorEmailForm>(initialFormData);
  const [emailTeste, setEmailTeste] = useState<string>('');

  // Buscar servidor ativo
  const { data: servidorAtivo, isLoading } = useQuery({
    queryKey: ['servidor-email-ativo'],
    queryFn: async () => {
      try {
        return await ServidorEmailService.getActive();
      } catch (error: any) {
        // Se retornar 404, não há servidor configurado
        if (error?.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: show,
    retry: false, // Não tentar novamente em caso de 404
  });

  // Mutation para criar/atualizar servidor único
  const saveServidorMutation = useMutation({
    mutationFn: (data: ServidorEmailForm) => {
      return ServidorEmailService.createOrUpdate(data);
    },
    onSuccess: () => {
      success('Configurações do servidor de email salvas com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['servidor-email-ativo'] });
      // Não limpar o formulário - os dados serão recarregados pelo useEffect
    },
    onError: (error: any) => {
      showError(error?.response?.data?.message || 'Erro ao salvar configurações');
    }
  });


  // Mutation para enviar e-mail de teste
  const sendTestEmailMutation = useMutation({
    mutationFn: async (data: { id: number; email: string }) => {
      return ServidorEmailService.sendTestEmail(data.id, data.email);
    },
    onSuccess: (response: any) => {
      success(response.message);
    },
    onError: (error: any) => {
      showError(error?.response?.data?.message || 'Erro ao enviar e-mail de teste');
    }
  });

  // Carregar dados do servidor existente
  useEffect(() => {
    if (servidorAtivo?.data) {
      setFormData({
        host: servidorAtivo.data.host,
        porta: servidorAtivo.data.porta,
        usuario: servidorAtivo.data.usuario,
        senha: '', // Não carregar senha por segurança
        ssl: servidorAtivo.data.ssl,
        tls: servidorAtivo.data.tls,
        nome_remetente: servidorAtivo.data.nome_remetente,
        email_remetente: servidorAtivo.data.email_remetente,
        timeout: servidorAtivo.data.timeout,
        tentativas: servidorAtivo.data.tentativas,
        intervalo_tentativas: servidorAtivo.data.intervalo_tentativas
      });
    } else {
      // Se não houver servidor ativo, limpar o formulário
      setFormData(initialFormData);
    }
  }, [servidorAtivo]);

  // Forçar carregamento quando modal abrir
  useEffect(() => {
    if (show) {
      queryClient.invalidateQueries({ queryKey: ['servidor-email-ativo'] });
    }
  }, [show, queryClient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveServidorMutation.mutateAsync(formData);
  };

  const handleReset = async () => {
    // Se há servidor configurado, deletar do banco
    if (servidorAtivo?.data?.id) {
      try {
        await ServidorEmailService.delete(servidorAtivo.data.id);
        success('Servidor removido com sucesso!');
        queryClient.invalidateQueries({ queryKey: ['servidor-email-ativo'] });
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

  const handleSendTestEmail = async () => {
    if (!emailTeste.trim()) {
      showError('Por favor, digite um e-mail para teste');
      return;
    }

    if (!servidorAtivo?.data?.id) {
      showError('Configure o servidor primeiro antes de enviar e-mail de teste');
      return;
    }

    await sendTestEmailMutation.mutateAsync({
      id: servidorAtivo.data.id,
      email: emailTeste.trim()
    });
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
      size="lg"
      modalId="servidor-email-modal"
      headerActions={
        <div className="d-flex gap-2">
          <button
            type="submit"
            form="servidor-email-form"
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
        <form id="servidor-email-form" onSubmit={handleSubmit}>
          <div className="card">
            <div className="card-header py-1 px-2">
              <small className="fw-bold mb-0">
                {servidorAtivo?.data ? 'Configurações do Servidor' : 'Configurar Servidor de E-Mail'}
              </small>
            </div>
            <div className="card-body p-2">
              <div className="row g-2">
                <div className="col-md-6">
                  <FormField
                    name="host"
                    type="text"
                    label="Host SMTP"
                    placeholder="smtp.gmail.com"
                    required={true}
                    size="sm"
                    value={formData.host}
                    onChange={(e) => setFormData(prev => ({ ...prev, host: e.value }))}
                  />
                </div>
                <div className="col-md-6">
                  <FormField
                    name="porta"
                    type="number"
                    label="Porta"
                    placeholder="587"
                    required={true}
                    size="sm"
                    value={formData.porta.toString()}
                    onChange={(e) => setFormData(prev => ({ ...prev, porta: parseInt(e.value) }))}
                  />
                </div>
              </div>
              
              <div className="row g-2">
                <div className="col-md-6">
                  <FormField
                    name="usuario"
                    type="email"
                    label="Usuário/E-mail"
                    placeholder="usuario@gmail.com"
                    required={true}
                    size="sm"
                    value={formData.usuario}
                    onChange={(e) => setFormData(prev => ({ ...prev, usuario: e.value }))}
                    autoComplete="username"
                  />
                </div>
                <div className="col-md-6">
                  <FormField
                    name="senha"
                    type="password"
                    label={`Senha ${!servidorAtivo?.data ? '*' : ''}`}
                    placeholder={servidorAtivo?.data ? "Deixe em branco para manter a senha atual" : "Digite a senha do e-mail"}
                    required={!servidorAtivo?.data}
                    size="sm"
                    value={formData.senha}
                    onChange={(e) => setFormData(prev => ({ ...prev, senha: e.value }))}
                    autoComplete={servidorAtivo?.data ? "current-password" : "new-password"}
                  />
                  {servidorAtivo?.data && (
                    <small className="form-text text-secondary">
                      Deixe em branco para manter a senha atual
                    </small>
                  )}
                </div>
              </div>

              <div className="row g-2">
                <div className="col-md-6">
                  <FormField
                    name="nome_remetente"
                    type="text"
                    label="Nome do Remetente"
                    placeholder="CTM Telecom"
                    required={true}
                    size="sm"
                    value={formData.nome_remetente}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome_remetente: e.value }))}
                  />
                </div>
                <div className="col-md-6">
                  <FormField
                    name="email_remetente"
                    type="email"
                    label="E-mail do Remetente"
                    placeholder="contato@ctmtelecom.com"
                    required={true}
                    size="sm"
                    value={formData.email_remetente}
                    onChange={(e) => setFormData(prev => ({ ...prev, email_remetente: e.value }))}
                  />
                </div>
              </div>
              
              <div className="row g-2">
                <div className="col-md-4">
                  <Checkbox
                    name="ssl"
                    label="Usar SSL"
                    checked={formData.ssl}
                    onChange={(e) => setFormData(prev => ({ ...prev, ssl: e.value }))}
                  />
                </div>
                <div className="col-md-4">
                  <Checkbox
                    name="tls"
                    label="Usar TLS"
                    checked={formData.tls}
                    onChange={(e) => setFormData(prev => ({ ...prev, tls: e.value }))}
                  />
                </div>
                <div className="col-md-4">
                  <FormField
                    name="timeout"
                    type="number"
                    label="Timeout (ms)"
                    size="sm"
                    value={formData.timeout.toString()}
                    onChange={(e) => setFormData(prev => ({ ...prev, timeout: parseInt(e.value) }))}
                  />
                </div>
              </div>

              {/* Campo de E-mail de Teste */}
              {servidorAtivo?.data && (
                <div className="row mt-3">
                  <div className="col-12">
                    <small className="fw-bold text-primary mb-3">
                      <i className="bi bi-envelope-check me-2"></i>
                      Enviar E-mail de Teste
                    </small>
                    <div className="input-group">
                      <FormField
                        name="email_teste"
                        type="email"
                        placeholder="Digite o e-mail para teste"
                        size="sm"
                        value={emailTeste}
                        onChange={(e) => setEmailTeste(e.value)}
                        className="flex-grow-1"
                      />
                      <button
                        type="button"
                        className="btn btn-outline-success"
                        onClick={handleSendTestEmail}
                        disabled={sendTestEmailMutation.isPending}
                      >
                        {sendTestEmailMutation.isPending ? (
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
                    <small className="form-text text-secondary">
                      Digite um e-mail válido para testar o envio através deste servidor
                    </small>
                  </div>
                </div>
              )}

            </div>
          </div>
        </form>
      </div>
    </DraggableModal>
  );
};

export default ServidorEmailModal;
