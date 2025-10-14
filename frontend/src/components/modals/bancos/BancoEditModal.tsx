import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { BancoService } from '../../../services/bancoService';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import DraggableModal from '../../common/DraggableModal';

interface BancoForm {
  nome: string;
  codigo: string;
  descricao: string;
  ativo: boolean;
  tipo_banco: 'efi' | 'asaas' | 'bancario' | 'outros';
  api_url: string;
  api_key: string;
  api_secret: string;
  sandbox: boolean;
  identificador_conta: string;
  client_id_producao: string;
  client_secret_producao: string;
  url_retorno: string;
  repassar_email_cliente: boolean;
  percentual_multa: number;
  percentual_juros: number;
  desconto_tipo: string;
  desconto_valor: number;
  contra_apresentacao: boolean;
  recalcular_segunda_via: boolean;
  maximo_dias_recalcular: number;
  layout_web: string;
  layout_pdf: string;
  layout_carne: string;
  local_pagamento: string;
  dados_avalista: string;
  exibir_mes_referente: boolean;
  taxa_cobranca: number;
  incluir_taxa: boolean;
  observacao_linha_1: string;
  observacao_linha_2: string;
  observacao_linha_3: string;
  observacao_linha_4: string;
  instrucao_linha_1: string;
  instrucao_linha_2: string;
  instrucao_linha_3: string;
  instrucao_linha_4: string;
  instrucao_linha_5: string;
}

interface BancoEditModalProps {
  show: boolean;
  onClose: () => void;
  bancoId: number | null;
  onSuccess?: () => void;
}

const BancoEditModal: React.FC<BancoEditModalProps> = ({ 
  show, 
  onClose, 
  bancoId,
  onSuccess 
}) => {
  const [formData, setFormData] = useState<BancoForm>({
    nome: '',
    codigo: '',
    descricao: '',
    ativo: true,
    tipo_banco: 'efi',
    api_url: '',
    api_key: '',
    api_secret: '',
    sandbox: true,
    identificador_conta: '',
    client_id_producao: '',
    client_secret_producao: '',
    url_retorno: `${window.location.origin}/webhook/efi`,
    repassar_email_cliente: false,
    percentual_multa: 0,
    percentual_juros: 0,
    desconto_tipo: '',
    desconto_valor: 0,
    contra_apresentacao: false,
    recalcular_segunda_via: false,
    maximo_dias_recalcular: 0,
    layout_web: '',
    layout_pdf: '',
    layout_carne: '',
    local_pagamento: '',
    dados_avalista: '',
    exibir_mes_referente: false,
    taxa_cobranca: 0,
    incluir_taxa: false,
    observacao_linha_1: '',
    observacao_linha_2: '',
    observacao_linha_3: '',
    observacao_linha_4: '',
    instrucao_linha_1: '',
    instrucao_linha_2: '',
    instrucao_linha_3: '',
    instrucao_linha_4: '',
    instrucao_linha_5: '',
  });

  const [errors, setErrors] = useState<Partial<BancoForm>>({});
  const [testResult, setTestResult] = useState<string>('');
  const { success, error } = useNotificationContext();
  const queryClient = useQueryClient();

  // Query para buscar dados do banco
  const { data: banco, isLoading } = useQuery({
    queryKey: ['banco', bancoId],
    queryFn: () => BancoService.getById(bancoId!),
    enabled: !!bancoId && show,
  });

  // Limpar resultado do teste quando o modal abre
  useEffect(() => {
    if (show) {
      setTestResult('');
      setErrors({});
    }
  }, [show]);

  // Carregar dados do banco no formulário
  useEffect(() => {
    if (banco) {
      setFormData({
        nome: banco.nome || '',
        codigo: banco.codigo || '',
        descricao: banco.descricao || '',
        ativo: banco.ativo ?? true,
        tipo_banco: banco.tipo_banco || 'efi',
        api_url: banco.api_url || '',
        api_key: banco.api_key || '',
        api_secret: banco.api_secret || '',
        sandbox: banco.sandbox ?? true,
        identificador_conta: banco.identificador_conta || '',
        client_id_producao: banco.client_id_producao || '',
        client_secret_producao: banco.client_secret_producao || '',
        url_retorno: banco.url_retorno || `${window.location.origin}/webhook/efi`,
        repassar_email_cliente: banco.repassar_email_cliente ?? false,
        percentual_multa: banco.percentual_multa || 0,
        percentual_juros: banco.percentual_juros || 0,
        desconto_tipo: banco.desconto_tipo || '',
        desconto_valor: banco.desconto_valor || 0,
        contra_apresentacao: banco.contra_apresentacao ?? false,
        recalcular_segunda_via: banco.recalcular_segunda_via ?? false,
        maximo_dias_recalcular: banco.maximo_dias_recalcular || 0,
        layout_web: banco.layout_web || '',
        layout_pdf: banco.layout_pdf || '',
        layout_carne: banco.layout_carne || '',
        local_pagamento: banco.local_pagamento || '',
        dados_avalista: banco.dados_avalista || '',
        exibir_mes_referente: banco.exibir_mes_referente ?? false,
        taxa_cobranca: banco.taxa_cobranca || 0,
        incluir_taxa: banco.incluir_taxa ?? false,
        observacao_linha_1: banco.observacao_linha_1 || '',
        observacao_linha_2: banco.observacao_linha_2 || '',
        observacao_linha_3: banco.observacao_linha_3 || '',
        observacao_linha_4: banco.observacao_linha_4 || '',
        instrucao_linha_1: banco.instrucao_linha_1 || '',
        instrucao_linha_2: banco.instrucao_linha_2 || '',
        instrucao_linha_3: banco.instrucao_linha_3 || '',
        instrucao_linha_4: banco.instrucao_linha_4 || '',
        instrucao_linha_5: banco.instrucao_linha_5 || '',
      });
    }
  }, [banco]);

  // Mutation para atualizar banco
  const updateBancoMutation = useMutation({
    mutationFn: (data: BancoForm) => BancoService.update(bancoId!, data),
    onSuccess: () => {
      success('Banco atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['bancos'] });
      queryClient.invalidateQueries({ queryKey: ['banco', bancoId] });
      onClose();
      onSuccess?.();
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Erro ao atualizar banco');
    }
  });

  const handleInputChange = (field: keyof BancoForm, value: string | boolean | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<BancoForm> = {};

    if (!formData.nome.trim()) newErrors.nome = 'Nome é obrigatório';
    if (!formData.codigo.trim()) newErrors.codigo = 'Código é obrigatório';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    updateBancoMutation.mutate(formData);
  };

  const handleCancel = () => {
    setErrors({});
    setFormData({
      nome: '',
      codigo: '',
      descricao: '',
      ativo: true,
      tipo_banco: 'efi',
      api_url: '',
      api_key: '',
      api_secret: '',
      sandbox: true,
      identificador_conta: '',
      client_id_producao: '',
      client_secret_producao: '',
      url_retorno: `${window.location.origin}/webhook/efi`,
      repassar_email_cliente: false,
      percentual_multa: 0,
      percentual_juros: 0,
      desconto_tipo: '',
      desconto_valor: 0,
      contra_apresentacao: false,
      recalcular_segunda_via: false,
      maximo_dias_recalcular: 0,
      layout_web: '',
      layout_pdf: '',
      layout_carne: '',
      local_pagamento: '',
      dados_avalista: '',
      exibir_mes_referente: false,
      taxa_cobranca: 0,
      incluir_taxa: false,
      observacao_linha_1: '',
      observacao_linha_2: '',
      observacao_linha_3: '',
      observacao_linha_4: '',
      instrucao_linha_1: '',
      instrucao_linha_2: '',
      instrucao_linha_3: '',
      instrucao_linha_4: '',
      instrucao_linha_5: '',
    });
    onClose();
  };

  const handleTestConnection = async () => {
    if (!bancoId) {
      error('ID do banco não encontrado');
      return;
    }

    // Validar campos obrigatórios
    if (formData.tipo_banco === 'efi' || formData.tipo_banco === 'asaas') {
      if (!formData.client_id_producao || !formData.client_secret_producao) {
        error('Client ID e Client Secret são obrigatórios para testar conexão');
        return;
      }
    }

    setTestResult('Testando conexão...');
    try {
      // Salvar dados primeiro (sem fechar o modal)
      await BancoService.update(bancoId, formData);
      queryClient.invalidateQueries({ queryKey: ['bancos'] });
      queryClient.invalidateQueries({ queryKey: ['banco', bancoId] });
      
      // Testar conexão
      const resultado = await BancoService.testarConexao(bancoId);
      
      if (resultado.success) {
        setTestResult('✅ ' + (resultado.message || 'Conexão testada com sucesso!'));
      } else {
        setTestResult('❌ ' + (resultado.message || 'Falha no teste de conexão'));
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Erro ao testar conexão';
      setTestResult(errorMessage);
      error(errorMessage);
    }
  };

  // Renderizar campos específicos de cada tipo de banco
  const renderBancoEspecificoCampos = () => {
    switch (formData.tipo_banco) {
      case 'efi':
        return (
          <>
            <div className="row">
              <div className="col-md-12">
                <div className="mb-3">
                  <label htmlFor="identificador_conta" className="form-label small">Identificador da Conta *</label>
                  <input
                    type="text"
                    className="form-control"
                    id="identificador_conta"
                    value={formData.identificador_conta}
                    onChange={(e) => handleInputChange('identificador_conta', e.target.value)}
                    disabled={updateBancoMutation.isPending}
                    placeholder="Disponibilizado no menu configurações da API"
                  />
                  <small className="text-secondary text-secondary">Disponível nas configurações da API Efi</small>
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="percentual_multa" className="form-label small">Percentual de Multa (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    id="percentual_multa"
                    value={formData.percentual_multa}
                    onChange={(e) => handleInputChange('percentual_multa', parseFloat(e.target.value) || 0)}
                    disabled={updateBancoMutation.isPending}
                    placeholder="2.00"
                  />
                </div>
              </div>

              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="percentual_juros" className="form-label small">Percentual de Juros (% ao dia)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    id="percentual_juros"
                    value={formData.percentual_juros}
                    onChange={(e) => handleInputChange('percentual_juros', parseFloat(e.target.value) || 0)}
                    disabled={updateBancoMutation.isPending}
                    placeholder="0.03"
                  />
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-md-12">
                <div className="mb-3">
                  <label htmlFor="local_pagamento" className="form-label small">Local de Pagamento</label>
                  <input
                    type="text"
                    className="form-control"
                    id="local_pagamento"
                    value={formData.local_pagamento}
                    onChange={(e) => handleInputChange('local_pagamento', e.target.value)}
                    disabled={updateBancoMutation.isPending}
                    placeholder="Pagável em qualquer banco até o vencimento"
                  />
                </div>
              </div>
            </div>
          </>
        );

      case 'asaas':
        return (
          <>
            <div className="row">
              <div className="col-md-12">
                <div className="mb-3">
                  <label htmlFor="api_key" className="form-label small">API Key *</label>
                  <input
                    type="password"
                    className="form-control"
                    id="api_key"
                    value={formData.api_key}
                    onChange={(e) => handleInputChange('api_key', e.target.value)}
                    disabled={updateBancoMutation.isPending}
                    placeholder="Sua chave da API Asaas"
                  />
                  <small className="text-secondary text-secondary">Disponível no painel administrativo da Asaas</small>
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="taxa_cobranca" className="form-label small">Taxa de Cobrança (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    id="taxa_cobranca"
                    value={formData.taxa_cobranca}
                    onChange={(e) => handleInputChange('taxa_cobranca', parseFloat(e.target.value) || 0)}
                    disabled={updateBancoMutation.isPending}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="col-md-6">
                <div className="form-check form-switch mt-4">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="incluir_taxa"
                    checked={formData.incluir_taxa}
                    onChange={(e) => handleInputChange('incluir_taxa', e.target.checked)}
                    disabled={updateBancoMutation.isPending}
                  />
                  <label className="form-check-label" htmlFor="incluir_taxa">
                    Incluir Taxa no Boleto
                  </label>
                </div>
              </div>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <DraggableModal
        show={show}
        onClose={onClose}
        title="Banco"
      >
        <div className="text-center p-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
          <p className="mt-2">Carregando dados do banco...</p>
        </div>
      </DraggableModal>
    );
  }

  return (
    <DraggableModal
      show={show}
      onClose={handleCancel}
      title="Banco"
      size="xl"
    >
      <form onSubmit={handleSubmit}>
        {/* Informações Básicas */}
        <div className="mb-4">
          <h6 className="border-bottom pb-2 mb-3">Informações Básicas</h6>
          <div className="row">
            <div className="col-md-12">
              <div className="mb-3">
                <label htmlFor="nome" className="form-label small">Nome *</label>
                <input
                  type="text"
                  className={`form-control ${errors.nome ? 'is-invalid' : ''}`}
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  disabled={updateBancoMutation.isPending}
                  placeholder="Ex: EFI - Conta Principal"
                />
                {errors.nome && <div className="invalid-feedback">{errors.nome}</div>}
                <small className="text-secondary text-secondary">Nome para identificar esta conta do banco</small>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="tipo_banco" className="form-label small">Tipo de Banco</label>
                <select
                  className="form-select"
                  id="tipo_banco"
                  value={formData.tipo_banco}
                  onChange={(e) => handleInputChange('tipo_banco', e.target.value as any)}
                  disabled={updateBancoMutation.isPending}
                >
                  <option value="efi">EFI (Código: 364)</option>
                  <option value="asaas">Asaas (Código: 461)</option>
                </select>
                <small className="text-secondary text-secondary">Código do banco é definido automaticamente</small>
              </div>
            </div>

            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label small">Status</label>
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="ativo"
                    checked={formData.ativo}
                    onChange={(e) => handleInputChange('ativo', e.target.checked)}
                    disabled={updateBancoMutation.isPending}
                  />
                  <label className="form-check-label" htmlFor="ativo">
                    {formData.ativo ? 'Ativo' : 'Inativo'}
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="descricao" className="form-label small">Descrição</label>
            <textarea
              className="form-control"
              id="descricao"
              rows={3}
              value={formData.descricao}
              onChange={(e) => handleInputChange('descricao', e.target.value)}
              disabled={updateBancoMutation.isPending}
              placeholder="Descrição do banco..."
            />
          </div>
        </div>

        {/* Configurações da API */}
        <div className="mb-4">
          <h6 className="border-bottom pb-2 mb-3">Configurações da API</h6>
          
          {/* Campos comuns para EFI e ASAAS */}
          {(formData.tipo_banco === 'efi' || formData.tipo_banco === 'asaas') && (
            <>
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label htmlFor="client_id_producao" className="form-label small">
                      {formData.tipo_banco === 'efi' ? 'Client ID Produção *' : 'Client ID'}
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="client_id_producao"
                      value={formData.client_id_producao}
                      onChange={(e) => handleInputChange('client_id_producao', e.target.value)}
                      disabled={updateBancoMutation.isPending}
                      placeholder="Client ID para produção"
                    />
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="mb-3">
                    <label htmlFor="client_secret_producao" className="form-label small">
                      {formData.tipo_banco === 'efi' ? 'Client Secret Produção *' : 'Client Secret'}
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      id="client_secret_producao"
                      value={formData.client_secret_producao}
                      onChange={(e) => handleInputChange('client_secret_producao', e.target.value)}
                      disabled={updateBancoMutation.isPending}
                      placeholder="Client Secret para produção"
                    />
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-12">
                  <div className="mb-3">
                    <label htmlFor="url_retorno" className="form-label small">URL de Retorno (Webhook)</label>
                    <input
                      type="url"
                      className="form-control"
                      id="url_retorno"
                      value={formData.url_retorno}
                      onChange={(e) => handleInputChange('url_retorno', e.target.value)}
                      disabled={updateBancoMutation.isPending}
                      placeholder="URL para retorno de webhooks"
                    />
                    <small className="text-secondary text-secondary">URL para receber notificações de pagamento</small>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-12">
                  <div className="mb-3">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="sandbox"
                        checked={formData.sandbox}
                        onChange={(e) => handleInputChange('sandbox', e.target.checked)}
                        disabled={updateBancoMutation.isPending}
                      />
                      <label className="form-check-label" htmlFor="sandbox">
                        Modo Sandbox (Testes)
                      </label>
                    </div>
                    <small className="text-secondary text-secondary">
                      Ative para usar ambiente de testes. Desative para produção.
                    </small>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Campos específicos de cada tipo de banco */}
          {renderBancoEspecificoCampos()}

          <div className="mt-3">
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={handleTestConnection}
              disabled={updateBancoMutation.isPending}
            >
              <i className="bi bi-wifi"></i> Testar Conexão
            </button>
            {testResult && (
              <span className={`ms-2 badge ${testResult.includes('sucesso') ? 'bg-success' : 'bg-danger'}`}>
                {testResult}
              </span>
            )}
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="d-flex justify-content-end gap-2">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCancel}
            disabled={updateBancoMutation.isPending}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={updateBancoMutation.isPending}
          >
            Salvar
          </button>
        </div>
      </form>
    </DraggableModal>
  );
};

export default BancoEditModal;
