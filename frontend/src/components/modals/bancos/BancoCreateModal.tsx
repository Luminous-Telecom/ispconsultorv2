import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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

interface BancoCreateModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const BancoCreateModal: React.FC<BancoCreateModalProps> = ({ 
  show, 
  onClose, 
  onSuccess 
}) => {
  const initialFormData: BancoForm = {
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
    percentual_multa: 2,
    percentual_juros: 0.03,
    desconto_tipo: 'fixo',
    desconto_valor: 0,
    contra_apresentacao: false,
    recalcular_segunda_via: false,
    maximo_dias_recalcular: 0,
    layout_web: 'normal',
    layout_pdf: 'normal',
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
  };

  const [formData, setFormData] = useState<BancoForm>(initialFormData);

  const [errors, setErrors] = useState<Partial<BancoForm>>({});
  const [testResult, setTestResult] = useState<string>('');
  const { success, error } = useNotificationContext();
  const queryClient = useQueryClient();

  // Mutation para criar banco
  const createBancoMutation = useMutation({
    mutationFn: (data: BancoForm) => BancoService.create(data),
    onSuccess: () => {
      success('Banco criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['bancos'] });
      onClose();
      onSuccess?.();
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Erro ao criar banco');
    }
  });

  // Limpar formulário quando modal fechar
  React.useEffect(() => {
    if (!show) {
      setFormData(initialFormData);
      setErrors({});
      setTestResult('');
    }
  }, [show]);

  // Atualizar url_retorno quando tipo_banco mudar
  React.useEffect(() => {
    if (formData.tipo_banco) {
      setFormData(prev => ({
        ...prev,
        url_retorno: `${window.location.origin}/webhook/${formData.tipo_banco}`
      }));
    }
  }, [formData.tipo_banco]);

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
    const newErrors: any = {};

    if (!formData.nome.trim()) newErrors.nome = 'Nome é obrigatório';
    if (!formData.codigo.trim()) newErrors.codigo = 'Código é obrigatório';
    if (!formData.tipo_banco) newErrors.tipo_banco = 'Tipo de banco é obrigatório';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    createBancoMutation.mutate(formData);
  };

  const handleCancel = () => {
    onClose();
  };

  const handleTestConnection = async () => {
    // Validar campos obrigatórios antes de testar
    if (!formData.nome.trim()) {
      error('Nome é obrigatório para testar conexão');
      return;
    }

    if (formData.tipo_banco === 'efi' || formData.tipo_banco === 'asaas') {
      if (!formData.client_id_producao || !formData.client_secret_producao) {
        error('Client ID e Client Secret são obrigatórios para testar conexão');
        return;
      }
    }

    setTestResult('Testando conexão...');
    try {
      // Criar banco temporário para testar
      const tempBanco = await BancoService.create({
        ...formData,
        nome: `[TESTE] ${formData.nome}`,
      });

      // Testar conexão
      const resultado = await BancoService.testarConexao(tempBanco.id);
      
      // Deletar banco temporário
      await BancoService.delete(tempBanco.id);

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
                    className="form-control form-control-sm"
                    id="identificador_conta"
                    value={formData.identificador_conta}
                    onChange={(e) => handleInputChange('identificador_conta', e.target.value)}
                    disabled={createBancoMutation.isPending}
                    placeholder="Disponibilizado no menu configurações da API"
                  />
                  <small className="form-text text-muted">Disponível nas configurações da API Efi</small>
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
                    className="form-control form-control-sm"
                    id="percentual_multa"
                    value={formData.percentual_multa}
                    onChange={(e) => handleInputChange('percentual_multa', parseFloat(e.target.value) || 0)}
                    disabled={createBancoMutation.isPending}
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
                    className="form-control form-control-sm"
                    id="percentual_juros"
                    value={formData.percentual_juros}
                    onChange={(e) => handleInputChange('percentual_juros', parseFloat(e.target.value) || 0)}
                    disabled={createBancoMutation.isPending}
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
                    className="form-control form-control-sm"
                    id="local_pagamento"
                    value={formData.local_pagamento}
                    onChange={(e) => handleInputChange('local_pagamento', e.target.value)}
                    disabled={createBancoMutation.isPending}
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
                    className="form-control form-control-sm"
                    id="api_key"
                    value={formData.api_key}
                    onChange={(e) => handleInputChange('api_key', e.target.value)}
                    disabled={createBancoMutation.isPending}
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
                    className="form-control form-control-sm"
                    id="taxa_cobranca"
                    value={formData.taxa_cobranca}
                    onChange={(e) => handleInputChange('taxa_cobranca', parseFloat(e.target.value) || 0)}
                    disabled={createBancoMutation.isPending}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="col-md-6">
                <div className="form-check mt-4">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="incluir_taxa"
                    checked={formData.incluir_taxa}
                    onChange={(e) => handleInputChange('incluir_taxa', e.target.checked)}
                    disabled={createBancoMutation.isPending}
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
                    className="form-control form-control-sm"
                    id="codigo_banco"
                    value={formData.codigo}
                    onChange={(e) => handleInputChange('codigo', e.target.value)}
                    disabled={createBancoMutation.isPending}
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
                    className="form-select form-select-sm"
                    id="layout_carne"
                    value={formData.layout_carne}
                    onChange={(e) => handleInputChange('layout_carne', e.target.value)}
                    disabled={createBancoMutation.isPending}
                  >
                    <option value="">Selecione...</option>
                    <option value="padrao">Padrão</option>
                    <option value="personalizado">Personalizado</option>
                  </select>
                </div>
              </div>

              <div className="col-md-6">
                <div className="form-check mt-4">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="contra_apresentacao"
                    checked={formData.contra_apresentacao}
                    onChange={(e) => handleInputChange('contra_apresentacao', e.target.checked)}
                    disabled={createBancoMutation.isPending}
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
                    className="form-control form-control-sm"
                    id="observacao_linha_1"
                    rows={3}
                    value={formData.observacao_linha_1}
                    onChange={(e) => handleInputChange('observacao_linha_1', e.target.value)}
                    disabled={createBancoMutation.isPending}
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

  return (
    <DraggableModal
      show={show}
      onClose={handleCancel}
      title="Novo Banco"
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
                  disabled={createBancoMutation.isPending}
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
                  disabled={createBancoMutation.isPending}
                  placeholder="Ex: EFI001"
                />
                {errors.codigo && <div className="invalid-feedback">{errors.codigo}</div>}
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="tipo_banco" className="form-label small">Tipo de Banco *</label>
                <select
                  className={`form-select ${errors.tipo_banco ? 'is-invalid' : ''}`}
                  id="tipo_banco"
                  value={formData.tipo_banco}
                  onChange={(e) => handleInputChange('tipo_banco', e.target.value)}
                  disabled={createBancoMutation.isPending}
                >
                <option value="efi">EFI</option>
                <option value="asaas">Asaas</option>
                <option value="bancario">Bancário</option>
                <option value="outros">Outros</option>
                </select>
                {errors.tipo_banco && <div className="invalid-feedback">{errors.tipo_banco}</div>}
              </div>
            </div>

            <div className="col-md-6">
              <div className="mb-3">
                <div className="form-check mt-4">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="ativo"
                    checked={formData.ativo}
                    onChange={(e) => handleInputChange('ativo', e.target.checked)}
                    disabled={createBancoMutation.isPending}
                  />
                  <label className="form-check-label" htmlFor="ativo">
                    Banco Ativo
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="descricao" className="form-label small">Descrição</label>
            <textarea
              className="form-control form-control-sm"
              id="descricao"
              rows={2}
              value={formData.descricao}
              onChange={(e) => handleInputChange('descricao', e.target.value)}
              disabled={createBancoMutation.isPending}
              placeholder="Descrição do banco"
            ></textarea>
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
                      className="form-control form-control-sm"
                      id="client_id_producao"
                      value={formData.client_id_producao}
                      onChange={(e) => handleInputChange('client_id_producao', e.target.value)}
                      disabled={createBancoMutation.isPending}
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
                      className="form-control form-control-sm"
                      id="client_secret_producao"
                      value={formData.client_secret_producao}
                      onChange={(e) => handleInputChange('client_secret_producao', e.target.value)}
                      disabled={createBancoMutation.isPending}
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
                      className="form-control form-control-sm"
                      id="url_retorno"
                      value={formData.url_retorno}
                      onChange={(e) => handleInputChange('url_retorno', e.target.value)}
                      disabled={createBancoMutation.isPending}
                      placeholder="URL para retorno de webhooks"
                    />
                    <small className="form-text text-muted">URL gerada automaticamente baseada no tipo de banco</small>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-12">
                  <div className="form-check mb-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="sandbox"
                      checked={formData.sandbox}
                      onChange={(e) => handleInputChange('sandbox', e.target.checked)}
                      disabled={createBancoMutation.isPending}
                    />
                    <label className="form-check-label" htmlFor="sandbox">
                      Modo Sandbox (Testes)
                    </label>
                    <small className="form-text text-muted d-block">
                      Ative para usar ambiente de testes. Desative para produção.
                    </small>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Campos específicos de cada tipo de banco */}
          {renderBancoEspecificoCampos()}
        </div>

        {/* Teste de Conexão */}
        <div className="mb-4">
          <h6 className="border-bottom pb-2 mb-3">Teste de Conexão</h6>
          <div className="d-flex align-items-center gap-3">
            <button
              type="button"
              className="btn btn-outline-info"
              onClick={handleTestConnection}
              disabled={createBancoMutation.isPending}
            >
              Testar Conexão
            </button>
            {testResult && (
              <span className={`badge ${testResult.includes('sucesso') ? 'bg-success' : 'bg-danger'}`}>
                {testResult}
              </span>
            )}
          </div>
        </div>

          <div className="d-flex justify-content-end gap-2 mt-2">
          <button
            type="button"
              className="btn btn-secondary btn-sm"
            onClick={handleCancel}
            disabled={createBancoMutation.isPending}
          >
            Cancelar
          </button>
          <button
            type="submit"
              className="btn btn-primary btn-sm"
            disabled={createBancoMutation.isPending}
          >
            {createBancoMutation.isPending ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Criando...
              </>
            ) : (
              <>
                Criar Banco
              </>
            )}
          </button>
        </div>
      </form>
    </DraggableModal>
  );
};

export default BancoCreateModal;
