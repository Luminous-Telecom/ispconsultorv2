import React, { useState, useEffect } from 'react';
import DraggableModal from '../../common/DraggableModal';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import { ServidorWhatsAppService } from '../../../services/servidorWhatsAppService';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormField } from '../../ui';
import axios from 'axios';

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
    evolution_api_url: 'https://evo-api.example.com',
    evolution_api_key: '',
    instance_name: ''
  };

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
      } catch (error: unknown) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'response' in error &&
          (error as any).response?.status === 404
        ) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!mensagemType
  });

  // Buscar variáveis disponíveis da API
  const { data: variaveisData } = useQuery({
    queryKey: ['variaveis-documento'],
    queryFn: async () => {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/modelos-contrato/variaveis`);
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
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
      // Limpar campos se não houver mensagem
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

  // Mutation para salvar mensagem
  const saveMensagemMutation = useMutation({
    mutationFn: (data: any) => {
      return ServidorWhatsAppService.saveMensagem(data);
    },
    onSuccess: () => {
      success('Mensagem salva com sucesso!');
    },
    onError: (error: any) => {
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

        {/* Conteúdo da Aba Servidor */}
        {activeTab === 'servidor' && (
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
                    placeholder="https://evo-api.example.com"
                    required={true}
                    size="sm"
                    value={formData.evolution_api_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, evolution_api_url: e }))}
                  />
                </div>
              </div>

              <div className="row g-2">
                <div className="col-12">
                  <FormField
                    name="instance_name"
                    type="text"
                    label="Nome da Instância"
                    placeholder="example"
                    required={true}
                    size="sm"
                    value={formData.instance_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, instance_name: e }))}
                    autoComplete="username"
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
                    onChange={(e) => setFormData(prev => ({ ...prev, evolution_api_key: e }))}
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
                    onChange={(e) => setTestPhone(e)}
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
                    onChange={(e) => setTestMessage(e)}
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
          </form>
        )}

        {/* Conteúdo da Aba Mensagens */}
        {activeTab === 'mensagens' && (
          <div>
            <div className="card">
              <div className="card-header py-1 px-2">
                <small className="fw-bold mb-0">
                  Configuração de Mensagens
                </small>
              </div>
              <div className="card-body p-2">
                <div className="row g-2">
                  <div className="col-12">
                    <FormField
                      name="mensagemType"
                      type="select"
                      label="Mensagem"
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
                </div>

                {mensagemType && (
                  <>
                    {/* Tipo de Envio */}
                    <div className="row g-2 mt-2">
                      <div className="col-12">
                        <div className="form-label small">Tipo de Envio</div>
                        <div className="btn-group w-100" role="group">
                          <input
                            type="radio"
                            className="btn-check"
                            name="tipoEnvio"
                            id="envio-desativado"
                            value="desativado"
                            checked={tipoEnvio === 'desativado'}
                            onChange={(e) => setTipoEnvio(e.target.value as any)}
                          />
                          <label className="btn btn-outline-secondary" htmlFor="envio-desativado">
                            Desativar
                          </label>

                          <input
                            type="radio"
                            className="btn-check"
                            name="tipoEnvio"
                            id="envio-pdf"
                            value="pdf"
                            checked={tipoEnvio === 'pdf'}
                            onChange={(e) => setTipoEnvio(e.target.value as any)}
                          />
                          <label className="btn btn-outline-secondary" htmlFor="envio-pdf">
                            Anexa PDF
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Mensagem Padrão */}
                    <div className="row g-2 mt-2">
                      <div className="col-12">
                        <FormField
                          name="mensagemPadrao"
                          type="textarea"
                          label="Mensagem Padrão"
                          placeholder="Digite a mensagem padrão"
                          rows={10}
                          size="sm"
                          value={mensagemPadrao}
                            onChange={(value) => setMensagemPadrao(value)}
                        />
                      </div>
                    </div>

                    {/* Container de Variáveis */}
                    <div className="row g-2 mt-2">
                      <div className="col-12">
                        <div className="card">
                          <div className="card-header py-1 px-2">
                            <small className="fw-bold mb-0">Variáveis Disponíveis para Mensagens</small>
                          </div>
                          <div className="card-body p-2" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {variaveisData ? (
                              <div className="row g-2">
                                {Object.entries(variaveisData).map(([chave, grupo]: [string, any]) => (
                                  <div className="col-md-6" key={chave}>
                                    <div className="mb-2">
                                      <small className="fw-bold d-block mb-1">{grupo.titulo}</small>
                                      <div className="d-flex flex-wrap gap-1 align-items-center">
                                        {grupo.variaveis.map((variavel: any) => (
                                          <div key={variavel.variavel} className="d-flex align-items-center gap-1">
                                            <span
                                              className="badge bg-secondary"
                                              style={{ cursor: 'pointer', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                              onClick={() => setMensagemPadrao(prev => prev + variavel.variavel)}
                                              title={`${variavel.descricao}. Clique para inserir.`}
                                            >
                                              {variavel.variavel}
                                            </span>
                                            <button
                                              type="button"
                                              className="btn btn-sm btn-link p-0"
                                              onClick={() => {
                                                navigator.clipboard.writeText(variavel.variavel);
                                                success('Variável copiada!');
                                              }}
                                              title="Copiar variável"
                                            >
                                              <i className="bi bi-clipboard" style={{ fontSize: '0.75rem' }}></i>
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center p-3">
                                <div className="spinner-border spinner-border-sm" role="status">
                                  <span className="visually-hidden">Carregando variáveis...</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Interações (opcionais) */}
                    <div className="row g-2 mt-2">
                      <div className="col-12">
                        <FormField
                          name="interacao1"
                          type="textarea"
                          label="Interação 01"
                          placeholder="Digite a primeira mensagem"
                          rows={3}
                          size="sm"
                          value={interacao1}
                          onChange={(value) => setInteracao1(value)}
                        />
                      </div>
                    </div>

                    <div className="row g-2">
                      <div className="col-12">
                        <FormField
                          name="interacao2"
                          type="textarea"
                          label="Interação 02"
                          placeholder="Digite a segunda mensagem"
                          rows={3}
                          size="sm"
                          value={interacao2}
                          onChange={(value) => setInteracao2(value)}
                        />
                      </div>
                    </div>

                    <div className="row g-2">
                      <div className="col-12">
                        <FormField
                          name="interacao3"
                          type="textarea"
                          label="Interação 03"
                          placeholder="Digite a terceira mensagem"
                          rows={3}
                          size="sm"
                          value={interacao3}
                          onChange={(value) => setInteracao3(value)}
                        />
                      </div>
                    </div>

                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DraggableModal>
  );
};

export default ServidorWhatsappModal;