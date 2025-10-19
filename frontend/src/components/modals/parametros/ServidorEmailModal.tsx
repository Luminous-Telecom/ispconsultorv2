import React, { useState, useEffect } from 'react';
import DraggableModal from '../../common/DraggableModal';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import { ServidorEmailService, ServidorEmail } from '../../../services/servidorEmailService';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
      <div className="modal-body">
        {/* Formulário de configuração */}
        <form id="servidor-email-form" onSubmit={handleSubmit}>
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">
                {servidorAtivo?.data ? 'Configurações do Servidor' : 'Configurar Servidor de E-Mail'}
              </h6>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label htmlFor="host" className="form-label">Host SMTP</label>
                    <input
                      type="text"
                      className="form-control"
                      id="host"
                      value={formData.host}
                      onChange={(e) => setFormData(prev => ({ ...prev, host: e.target.value }))}
                      placeholder="smtp.gmail.com"
                      required
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label htmlFor="porta" className="form-label">Porta</label>
                    <input
                      type="number"
                      className="form-control"
                      id="porta"
                      value={formData.porta}
                      onChange={(e) => setFormData(prev => ({ ...prev, porta: parseInt(e.target.value) }))}
                      placeholder="587"
                      required
                    />
                  </div>
                </div>
              </div>
              
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label htmlFor="usuario" className="form-label">Usuário/E-mail</label>
                    <input
                      type="email"
                      className="form-control"
                      id="usuario"
                      value={formData.usuario}
                      onChange={(e) => setFormData(prev => ({ ...prev, usuario: e.target.value }))}
                      placeholder="usuario@gmail.com"
                      required
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label htmlFor="senha" className="form-label">
                      Senha {!servidorAtivo?.data && <span className="text-danger">*</span>}
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      id="senha"
                      value={formData.senha}
                      onChange={(e) => setFormData(prev => ({ ...prev, senha: e.target.value }))}
                      placeholder={servidorAtivo?.data ? "Deixe em branco para manter a senha atual" : "Digite a senha do e-mail"}
                      required={!servidorAtivo?.data}
                    />
                    {servidorAtivo?.data && (
                      <small className="form-text text-muted">
                        Deixe em branco para manter a senha atual
                      </small>
                    )}
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label htmlFor="nome_remetente" className="form-label">Nome do Remetente</label>
                    <input
                      type="text"
                      className="form-control"
                      id="nome_remetente"
                      value={formData.nome_remetente}
                      onChange={(e) => setFormData(prev => ({ ...prev, nome_remetente: e.target.value }))}
                      placeholder="CTM Telecom"
                      required
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label htmlFor="email_remetente" className="form-label">E-mail do Remetente</label>
                    <input
                      type="email"
                      className="form-control"
                      id="email_remetente"
                      value={formData.email_remetente}
                      onChange={(e) => setFormData(prev => ({ ...prev, email_remetente: e.target.value }))}
                      placeholder="contato@ctmtelecom.com"
                      required
                    />
                  </div>
                </div>
              </div>
              
              <div className="row">
                <div className="col-md-4">
                  <div className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="ssl"
                      checked={formData.ssl}
                      onChange={(e) => setFormData(prev => ({ ...prev, ssl: e.target.checked }))}
                    />
                    <label className="form-check-label" htmlFor="ssl">
                      Usar SSL
                    </label>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="tls"
                      checked={formData.tls}
                      onChange={(e) => setFormData(prev => ({ ...prev, tls: e.target.checked }))}
                    />
                    <label className="form-check-label" htmlFor="tls">
                      Usar TLS
                    </label>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="mb-3">
                    <label htmlFor="timeout" className="form-label">Timeout (ms)</label>
                    <input
                      type="number"
                      className="form-control"
                      id="timeout"
                      value={formData.timeout}
                      onChange={(e) => setFormData(prev => ({ ...prev, timeout: parseInt(e.target.value) }))}
                    />
                  </div>
                </div>
              </div>

              {/* Campo de E-mail de Teste */}
              {servidorAtivo?.data && (
                <div className="row mt-3">
                  <div className="col-12">
                    <h6 className="text-primary mb-3">
                      <i className="bi bi-envelope-check me-2"></i>
                      Enviar E-mail de Teste
                    </h6>
                    <div className="input-group">
                      <input
                        type="email"
                        className="form-control"
                        placeholder="Digite o e-mail para teste"
                        value={emailTeste}
                        onChange={(e) => setEmailTeste(e.target.value)}
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
                    <small className="form-text text-muted">
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
