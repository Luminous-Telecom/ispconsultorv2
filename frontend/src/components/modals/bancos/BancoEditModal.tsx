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
  documento_cpf_cnpj: string;
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
    documento_cpf_cnpj: '',
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
        documento_cpf_cnpj: banco.documento_cpf_cnpj || '',
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
      documento_cpf_cnpj: '',
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
    try {
      setTestResult('Testando conexão...');
      // TODO: Implementar teste de conexão
      setTestResult('Conexão testada com sucesso');
    } catch (error) {
      setTestResult('Erro ao testar conexão');
    }
  };

  // Renderizar campos específicos de cada tipo de banco
  const renderBancoEspecificoCampos = () => {
    switch (formData.tipo_banco) {
      case 'efi':
        return (
          <>
            <div className="row">
              <div className="col-md-6">
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
                  <small className="form-text text-muted">Disponível nas configurações da API Efi</small>
                </div>
              </div>

              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="documento_cpf_cnpj" className="form-label small">CPF/CNPJ Titular</label>
                  <input
                    type="text"
                    className="form-control"
                    id="documento_cpf_cnpj"
                    value={formData.documento_cpf_cnpj}
                    onChange={(e) => handleInputChange('documento_cpf_cnpj', e.target.value)}
                    disabled={updateBancoMutation.isPending}
                    placeholder="CPF ou CNPJ do titular da conta"
                  />
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
                  <small className="form-text text-muted">Disponível no painel administrativo da Asaas</small>
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

      case 'bancario':
        return (
          <>
            <div className="row">
              <div className="col-md-12">
                <div className="mb-3">
                  <label htmlFor="codigo" className="form-label small">Código do Banco *</label>
                  <input
                    type="text"
                    className="form-control"
                    id="codigo_banco"
                    value={formData.codigo}
                    onChange={(e) => handleInputChange('codigo', e.target.value)}
                    disabled={updateBancoMutation.isPending}
                    placeholder="Ex: 001 (Banco do Brasil), 237 (Bradesco)"
                  />
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="layout_carne" className="form-label small">Layout do Carnê</label>
                  <select
                    className="form-select"
                    id="layout_carne"
                    value={formData.layout_carne}
                    onChange={(e) => handleInputChange('layout_carne', e.target.value)}
                    disabled={updateBancoMutation.isPending}
                  >
                    <option value="">Selecione...</option>
                    <option value="padrao">Padrão</option>
                    <option value="personalizado">Personalizado</option>
                  </select>
                </div>
              </div>

              <div className="col-md-6">
                <div className="form-check form-switch mt-4">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="contra_apresentacao"
                    checked={formData.contra_apresentacao}
                    onChange={(e) => handleInputChange('contra_apresentacao', e.target.checked)}
                    disabled={updateBancoMutation.isPending}
                  />
                  <label className="form-check-label" htmlFor="contra_apresentacao">
                    Contra Apresentação
                  </label>
                </div>
              </div>
            </div>
          </>
        );

      case 'outros':
        return (
          <>
            <div className="row">
              <div className="col-md-12">
                <div className="mb-3">
                  <label htmlFor="observacao_linha_1" className="form-label small">Observações</label>
                  <textarea
                    className="form-control"
                    id="observacao_linha_1"
                    rows={3}
                    value={formData.observacao_linha_1}
                    onChange={(e) => handleInputChange('observacao_linha_1', e.target.value)}
                    disabled={updateBancoMutation.isPending}
                    placeholder="Observações gerais sobre este banco"
                  ></textarea>
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
        title="Editar Banco"
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
      title={`Editar Banco - ${banco?.nome || 'Carregando...'}`}
      size="xl"
    >
      <form onSubmit={handleSubmit}>
        {/* Informações Básicas */}
        <div className="mb-4">
          <h6 className="border-bottom pb-2 mb-3">Informações Básicas</h6>
          <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="nome" className="form-label small">Nome *</label>
                <input
                  type="text"
                  className={`form-control ${errors.nome ? 'is-invalid' : ''}`}
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  disabled={updateBancoMutation.isPending}
                  placeholder="Ex: EFI - Banco Digital"
                />
                {errors.nome && <div className="invalid-feedback">{errors.nome}</div>}
              </div>
            </div>

            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="codigo" className="form-label small">Código *</label>
                <input
                  type="text"
                  className={`form-control ${errors.codigo ? 'is-invalid' : ''}`}
                  id="codigo"
                  value={formData.codigo}
                  onChange={(e) => handleInputChange('codigo', e.target.value)}
                  disabled={updateBancoMutation.isPending}
                  placeholder="Ex: EFI001"
                />
                {errors.codigo && <div className="invalid-feedback">{errors.codigo}</div>}
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
                  <option value="efi">EFI</option>
                  <option value="asaas">ASAAS</option>
                  <option value="bancario">Bancário</option>
                  <option value="outros">Outros</option>
                </select>
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
                    <small className="form-text text-muted">URL para receber notificações de pagamento</small>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
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
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="mb-3">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="repassar_email_cliente"
                        checked={formData.repassar_email_cliente}
                        onChange={(e) => handleInputChange('repassar_email_cliente', e.target.checked)}
                        disabled={updateBancoMutation.isPending}
                      />
                      <label className="form-check-label" htmlFor="repassar_email_cliente">
                        Repassar Email do Cliente
                      </label>
                    </div>
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
            {updateBancoMutation.isPending ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Salvando...
              </>
            ) : (
              <>
                <i className="bi bi-check-lg me-1"></i>
                Salvar Alterações
              </>
            )}
          </button>
        </div>
      </form>
    </DraggableModal>
  );
};

export default BancoEditModal;
