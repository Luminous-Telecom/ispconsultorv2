import React, { useState, useEffect, useMemo } from 'react';
import DraggableModal from '../../common/DraggableModal';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import { ServidorEmailService } from '../../../services/servidorEmailService';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormField, Checkbox } from '../../ui';
import RichTextEditor from '../../common/RichTextEditor';

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
  }, [servidorAtivo]);

  useEffect(() => {
    if (mensagemData) {
      setTipoEnvio(mensagemData.tipo_envio);
      setMensagemTexto(mensagemData.mensagem_padrao || '<p></p>');
    } else {
      setTipoEnvio('pdf');
      setMensagemTexto('<p></p>');
    }
  }, [mensagemData]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveServidorMutation.mutateAsync(formData);
  };

  const handleSaveMensagem = () => {
    if (!mensagemType) return showError('Selecione um tipo');
    saveMensagemMutation.mutate({ tipo: mensagemType, tipo_envio: tipoEnvio, mensagem_padrao: mensagemTexto, ativo: true });
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
                      onChange={(value) => setFormData(prev => ({ ...prev, host: value }))}
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
                      onChange={(value) => setFormData(prev => ({ ...prev, porta: parseInt(value as string) || 587 }))}
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
                      onChange={(value) => setFormData(prev => ({ ...prev, usuario: value }))}
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
                      onChange={(value) => setFormData(prev => ({ ...prev, senha: value }))}
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
                      onChange={(value) => setFormData(prev => ({ ...prev, nome_remetente: value }))}
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
                      onChange={(value) => setFormData(prev => ({ ...prev, email_remetente: value }))}
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
                      onChange={(value) => setFormData(prev => ({ ...prev, timeout: parseInt(value as string) || 30000 }))}
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
                          onChange={(value) => setEmailTeste(value as string)}
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
          )}

          {/* Conteúdo da Aba Mensagens */}
          {activeTab === 'mensagens' && (
            <div>
              <div className="row g-2 mb-3">
                <div className="col-md-6">
                  <FormField
                    name="mensagemType"
                    type="select"
                    label="Tipo de Mensagem"
                    required={true}
                    size="sm"
                    value={mensagemType}
                    onChange={(value) => setMensagemType(value)}
                    options={[
                      { value: '10_dias_antes_vencimento', label: '10 dias antes do vencimento' },
                      { value: '05_dias_antes_vencimento', label: '05 dias antes do vencimento' },
                      { value: 'mesmo_dia_vencimento', label: 'Mesmo dia do vencimento' },
                      { value: '05_dias_depois_vencimento', label: '05 dias depois do vencimento' },
                      { value: '10_dias_depois_vencimento', label: '10 dias depois do vencimento' },
                      { value: '15_dias_depois_vencimento', label: '15 dias depois do vencimento' },
                      { value: 'corte_cliente', label: 'Corte do cliente' }
                    ]}
                  />
                </div>
                <div className="col-md-6">
                  {mensagemType && (
                    <div>
                      <div className="form-label small">Tipo de Envio</div>
                      <div className="btn-group w-100" role="group">
                        <input
                          type="radio"
                          className="btn-check"
                          name="tipoEnvio"
                          id="envio-desativado-email"
                          value="desativado"
                          checked={tipoEnvio === 'desativado'}
                          onChange={(e) => setTipoEnvio(e.target.value as 'desativado' | 'pdf')}
                        />
                        <label className="btn btn-outline-secondary" htmlFor="envio-desativado-email">
                          Desativar
                        </label>

                        <input
                          type="radio"
                          className="btn-check"
                          name="tipoEnvio"
                          id="envio-pdf-email"
                          value="pdf"
                          checked={tipoEnvio === 'pdf'}
                          onChange={(e) => setTipoEnvio(e.target.value as 'desativado' | 'pdf')}
                        />
                        <label className="btn btn-outline-secondary" htmlFor="envio-pdf-email">
                          Anexa PDF
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Editor de Texto */}
              {mensagemType && tipoEnvio === 'pdf' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 300px)', minHeight: '400px' }}>
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span id="mensagem-label" className="form-label small mb-0">Mensagem do E-mail <span className="text-danger">*</span></span>
                  </div>
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <RichTextEditor
                      key={`mensagem-email-${mensagemType || 'none'}`}
                      id="mensagem_texto_email"
                      name="mensagem_texto_email"
                      ariaLabelledBy="mensagem-label"
                      value={mensagemTexto || '<p></p>'}
                      onChange={setMensagemTexto}
                      placeholder="Digite a mensagem padrão do e-mail..."
                      height="100%"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </form>
      </div>
    </DraggableModal>
  );
};

export default ServidorEmailModal;
