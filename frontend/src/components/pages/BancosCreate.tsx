import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateBanco } from '../../hooks/useBancos';

interface BancoForm {
  nome: string;
  codigo?: string;
  descricao?: string;
  ativo: boolean;
  tipo_banco: 'efi' | 'asaas' | 'bancario' | 'outros';
  api_url?: string;
  api_key?: string;
  api_secret?: string;
  sandbox: boolean;
  identificador_conta?: string;
  client_id_producao?: string;
  client_secret_producao?: string;
  url_retorno?: string;
  repassar_email_cliente: boolean;
  percentual_multa?: number;
  percentual_juros?: number;
  desconto_tipo?: string;
  desconto_valor?: number;
  contra_apresentacao: boolean;
  recalcular_segunda_via: boolean;
  maximo_dias_recalcular?: number;
  layout_web?: string;
  layout_pdf?: string;
  layout_carne?: string;
  local_pagamento?: string;
  dados_avalista?: string;
  exibir_mes_referente: boolean;
  documento_cpf_cnpj?: string;
  taxa_cobranca?: number;
  incluir_taxa: boolean;
  observacao_linha_1?: string;
  observacao_linha_2?: string;
  observacao_linha_3?: string;
  observacao_linha_4?: string;
  instrucao_linha_1?: string;
  instrucao_linha_2?: string;
  instrucao_linha_3?: string;
  instrucao_linha_4?: string;
  instrucao_linha_5?: string;
  configuracoes_json?: Record<string, any>;
}

const BancosCreate: React.FC = () => {
  const navigate = useNavigate();

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
    configuracoes_json: {},
  });

  const [errors, setErrors] = useState<Partial<BancoForm>>({});
  const [testResult, setTestResult] = useState<string>('');

  // Mutation para criar banco
  const createBancoMutation = useCreateBanco();

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

    if (!formData.nome) newErrors.nome = 'Nome é obrigatório';
    if (!formData.tipo_banco) newErrors.tipo_banco = 'Tipo de banco é obrigatório' as any;

    // Validações específicas por tipo de banco
    if (formData.tipo_banco === 'efi') {
      if (!formData.identificador_conta) newErrors.identificador_conta = 'Identificador da conta é obrigatório';
      if (!formData.client_id_producao) newErrors.client_id_producao = 'Client ID é obrigatório';
      if (!formData.client_secret_producao) newErrors.client_secret_producao = 'Client Secret é obrigatório';
      if (!formData.url_retorno) newErrors.url_retorno = 'URL de retorno é obrigatória';
    }

    if (formData.tipo_banco === 'asaas') {
      if (!formData.api_key) newErrors.api_key = 'API Key é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    createBancoMutation.mutate(formData, {
      onSuccess: () => {
        navigate('/bancos');
      }
    });
  };

  const handleCancel = () => {
    navigate('/bancos');
  };

  const testarUrl = async () => {
    try {
      setTestResult('Testando URL...');
      const response = await fetch(formData.url_retorno || '', { method: 'HEAD' });
      if (response.ok) {
        setTestResult('✅ URL acessível!');
      } else {
        setTestResult('❌ URL não acessível: ' + response.status);
      }
    } catch (err: any) {
      setTestResult('❌ Erro ao testar URL: ' + err.message);
    }
  };

  return (
    <>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">Novo Banco</h1>
        <div className="btn-group" role="group">
          <button 
            type="button" 
            className="btn btn-outline-secondary"
            onClick={() => navigate('/bancos')}
          >
            <i className="bi bi-arrow-left"></i> Voltar
          </button>
        </div>
      </div>

      <div className="row justify-content-center">
        <div className="col-lg-10">
          <form onSubmit={handleSubmit}>
            {/* Dados da Conta no Sistema */}
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="card-title mb-0">Dados da Conta no Sistema</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label htmlFor="nome" className="form-label">
                    Nome da Conta <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control ${errors.nome ? 'is-invalid' : ''}`}
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => handleInputChange('nome', e.target.value)}
                    required
                  />
                  {errors.nome && <div className="invalid-feedback">{errors.nome}</div>}
                </div>

                <div className="mb-3">
                  <label htmlFor="descricao" className="form-label">Descrição</label>
                  <textarea
                    className={`form-control ${errors.descricao ? 'is-invalid' : ''}`}
                    id="descricao"
                    rows={3}
                    value={formData.descricao}
                    onChange={(e) => handleInputChange('descricao', e.target.value)}
                  />
                  {errors.descricao && <div className="invalid-feedback">{errors.descricao}</div>}
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="ativo"
                          checked={formData.ativo}
                          onChange={(e) => handleInputChange('ativo', e.target.checked)}
                        />
                        <label className="form-check-label" htmlFor="ativo">
                          Banco ativo
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="sandbox"
                          checked={formData.sandbox}
                          onChange={(e) => handleInputChange('sandbox', e.target.checked)}
                        />
                        <label className="form-check-label" htmlFor="sandbox">
                          Modo Sandbox (Teste)
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dados do Banco ou Gateway */}
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="card-title mb-0">Dados do Banco ou Gateway</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label htmlFor="tipo_banco" className="form-label">
                    Escolha <span className="text-danger">*</span>
                  </label>
                  <select
                    className={`form-select ${errors.tipo_banco ? 'is-invalid' : ''}`}
                    id="tipo_banco"
                    value={formData.tipo_banco}
                    onChange={(e) => handleInputChange('tipo_banco', e.target.value as BancoForm['tipo_banco'])}
                    required
                  >
                    <option value="">Selecione o banco</option>
                    <option value="efi">EFI (Gerencianet)</option>
                    <option value="asaas">ASAAS</option>
                    <option value="bancario">Banco Tradicional</option>
                    <option value="outros">Outros</option>
                  </select>
                  {errors.tipo_banco && <div className="invalid-feedback">{errors.tipo_banco}</div>}
                </div>

                {/* Logo Efi */}
                {formData.tipo_banco === 'efi' && (
                  <div className="mb-3 text-center">
                    <div style={{ color: '#FF8000', fontWeight: 'bold', fontSize: '18px' }}>efi</div>
                    <p className="text-muted small">by Gerencianet</p>
                  </div>
                )}

                {/* Logo Asaas */}
                {formData.tipo_banco === 'asaas' && (
                  <div className="mb-3 text-center">
                    <div style={{ color: '#00A651', fontWeight: 'bold', fontSize: '18px' }}>Asaas</div>
                    <p className="text-muted small">Gateway de Pagamentos</p>
                  </div>
                )}

                {/* Campos específicos da Efi */}
                {formData.tipo_banco === 'efi' && (
                  <div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label htmlFor="identificador_conta" className="form-label">
                            Identificador da Conta <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            className={`form-control ${errors.identificador_conta ? 'is-invalid' : ''}`}
                            id="identificador_conta"
                            value={formData.identificador_conta}
                            onChange={(e) => handleInputChange('identificador_conta', e.target.value)}
                          />
                          {errors.identificador_conta && <div className="invalid-feedback">{errors.identificador_conta}</div>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label htmlFor="client_id_producao" className="form-label">
                            Client ID Produção <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            className={`form-control ${errors.client_id_producao ? 'is-invalid' : ''}`}
                            id="client_id_producao"
                            value={formData.client_id_producao}
                            onChange={(e) => handleInputChange('client_id_producao', e.target.value)}
                          />
                          {errors.client_id_producao && <div className="invalid-feedback">{errors.client_id_producao}</div>}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label htmlFor="client_secret_producao" className="form-label">
                            Client Secret Produção <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            className={`form-control ${errors.client_secret_producao ? 'is-invalid' : ''}`}
                            id="client_secret_producao"
                            value={formData.client_secret_producao}
                            onChange={(e) => handleInputChange('client_secret_producao', e.target.value)}
                          />
                          {errors.client_secret_producao && <div className="invalid-feedback">{errors.client_secret_producao}</div>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <label htmlFor="url_retorno" className="form-label">
                        URL de Retorno (Webhook) <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <input
                          type="url"
                          className={`form-control ${errors.url_retorno ? 'is-invalid' : ''}`}
                          id="url_retorno"
                          value={formData.url_retorno}
                          onChange={(e) => handleInputChange('url_retorno', e.target.value)}
                          placeholder="URL para receber notificações da Efí"
                        />
                        <button 
                          className="btn btn-success" 
                          type="button" 
                          onClick={testarUrl}
                          title="Testar URL do webhook"
                        >
                          <i className="bi bi-cloud-upload"></i>
                        </button>
                      </div>
                      <div className="form-text">
                        <strong>URL do webhook:</strong> Esta URL será usada pela Efí para enviar notificações automáticas sobre pagamentos, cancelamentos e mudanças de status dos boletos.<br />
                        <small className="text-muted">
                          • Deve ser HTTPS e acessível publicamente<br />
                          • Para desenvolvimento local, use ngrok ou similar<br />
                          • URL padrão: <code>{window.location.origin}/webhook/efi</code>
                        </small>
                      </div>
                      {errors.url_retorno && <div className="invalid-feedback">{errors.url_retorno}</div>}
                    </div>
                  </div>
                )}

                {/* Campos específicos da Asaas */}
                {formData.tipo_banco === 'asaas' && (
                  <div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label htmlFor="api_key" className="form-label">
                            API Key <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            className={`form-control ${errors.api_key ? 'is-invalid' : ''}`}
                            id="api_key"
                            value={formData.api_key}
                            onChange={(e) => handleInputChange('api_key', e.target.value)}
                          />
                          {errors.api_key && <div className="invalid-feedback">{errors.api_key}</div>}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label htmlFor="api_secret" className="form-label">API Secret</label>
                          <input
                            type="text"
                            className={`form-control ${errors.api_secret ? 'is-invalid' : ''}`}
                            id="api_secret"
                            value={formData.api_secret}
                            onChange={(e) => handleInputChange('api_secret', e.target.value)}
                          />
                          {errors.api_secret && <div className="invalid-feedback">{errors.api_secret}</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Campos comuns */}
                <div className="row">
                  <div className="col-md-12">
                    <div className="mb-3">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="repassar_email_cliente"
                          checked={formData.repassar_email_cliente}
                          onChange={(e) => handleInputChange('repassar_email_cliente', e.target.checked)}
                        />
                        <label className="form-check-label" htmlFor="repassar_email_cliente">
                          Repassar email para o cliente
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Informações de Multa, Mora e Desconto */}
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="card-title mb-0">Informações de Multa, Mora e Desconto</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label htmlFor="percentual_multa" className="form-label">Percentual de Multa (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        className={`form-control ${errors.percentual_multa ? 'is-invalid' : ''}`}
                        id="percentual_multa"
                        value={formData.percentual_multa}
                        onChange={(e) => handleInputChange('percentual_multa', parseFloat(e.target.value) || 0)}
                      />
                      {errors.percentual_multa && <div className="invalid-feedback">{errors.percentual_multa}</div>}
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label htmlFor="percentual_juros" className="form-label">Percentual de Juros (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        className={`form-control ${errors.percentual_juros ? 'is-invalid' : ''}`}
                        id="percentual_juros"
                        value={formData.percentual_juros}
                        onChange={(e) => handleInputChange('percentual_juros', parseFloat(e.target.value) || 0)}
                      />
                      {errors.percentual_juros && <div className="invalid-feedback">{errors.percentual_juros}</div>}
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label htmlFor="desconto_valor" className="form-label">Valor do Desconto (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className={`form-control ${errors.desconto_valor ? 'is-invalid' : ''}`}
                        id="desconto_valor"
                        value={formData.desconto_valor}
                        onChange={(e) => handleInputChange('desconto_valor', parseFloat(e.target.value) || 0)}
                      />
                      {errors.desconto_valor && <div className="invalid-feedback">{errors.desconto_valor}</div>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Instruções do Boleto */}
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="card-title mb-0">Instruções do Boleto</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="instrucao_linha_1" className="form-label">Instrução Linha 1</label>
                      <input
                        type="text"
                        className="form-control"
                        id="instrucao_linha_1"
                        value={formData.instrucao_linha_1}
                        onChange={(e) => handleInputChange('instrucao_linha_1', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="instrucao_linha_2" className="form-label">Instrução Linha 2</label>
                      <input
                        type="text"
                        className="form-control"
                        id="instrucao_linha_2"
                        value={formData.instrucao_linha_2}
                        onChange={(e) => handleInputChange('instrucao_linha_2', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="instrucao_linha_3" className="form-label">Instrução Linha 3</label>
                      <input
                        type="text"
                        className="form-control"
                        id="instrucao_linha_3"
                        value={formData.instrucao_linha_3}
                        onChange={(e) => handleInputChange('instrucao_linha_3', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="instrucao_linha_4" className="form-label">Instrução Linha 4</label>
                      <input
                        type="text"
                        className="form-control"
                        id="instrucao_linha_4"
                        value={formData.instrucao_linha_4}
                        onChange={(e) => handleInputChange('instrucao_linha_4', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label htmlFor="instrucao_linha_5" className="form-label">Instrução Linha 5</label>
                      <input
                        type="text"
                        className="form-control"
                        id="instrucao_linha_5"
                        value={formData.instrucao_linha_5}
                        onChange={(e) => handleInputChange('instrucao_linha_5', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Resultado do teste */}
            {testResult && (
              <div className="mb-4">
                <div className={`alert ${testResult.includes('✅') ? 'alert-success' : 'alert-danger'}`}>
                  {testResult}
                </div>
              </div>
            )}

            {/* Botões de Ação */}
            <div className="d-flex justify-content-end gap-2 mb-4">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancel}
                disabled={createBancoMutation.isPending}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={createBancoMutation.isPending}
              >
                {createBancoMutation.isPending ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Criando...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check"></i> Criar Banco
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default BancosCreate;