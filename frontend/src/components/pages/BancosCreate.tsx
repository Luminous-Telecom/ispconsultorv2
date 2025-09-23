import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { BancoService } from '../../services/bancoService';
import { useNotification } from '../../hooks/useNotification';

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
    url_retorno: '',
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
  const { success, error } = useNotification();

  // Mutation para criar banco
  const createBancoMutation = useMutation({
    mutationFn: BancoService.create,
    onSuccess: () => {
      success('Banco criado com sucesso!');
      navigate('/bancos');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Erro ao criar banco');
    }
  });

  const handleInputChange = (field: keyof BancoForm, value: string | boolean | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpar erro do campo quando o usuário começar a digitar
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    createBancoMutation.mutate(formData);
  };

  const handleCancel = () => {
    navigate('/bancos');
  };

  return (
    <>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">Novo Banco</h1>
      </div>

      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="nome" className="form-label">Nome *</label>
                      <input
                        type="text"
                        className={`form-control ${errors.nome ? 'is-invalid' : ''}`}
                        id="nome"
                        value={formData.nome}
                        onChange={(e) => handleInputChange('nome', e.target.value)}
                        placeholder="Nome do banco"
                      />
                      {errors.nome && <div className="invalid-feedback">{errors.nome}</div>}
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="tipo_banco" className="form-label">Tipo de Banco *</label>
                      <select
                        className={`form-select ${errors.tipo_banco ? 'is-invalid' : ''}`}
                        id="tipo_banco"
                        value={formData.tipo_banco}
                        onChange={(e) => handleInputChange('tipo_banco', e.target.value as any)}
                      >
                        <option value="efi">EFI (Gerencianet)</option>
                        <option value="asaas">ASAAS</option>
                        <option value="bancario">Bancário</option>
                        <option value="outros">Outros</option>
                      </select>
                      {errors.tipo_banco && <div className="invalid-feedback">{errors.tipo_banco}</div>}
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="codigo" className="form-label">Código</label>
                      <input
                        type="text"
                        className="form-control"
                        id="codigo"
                        value={formData.codigo}
                        onChange={(e) => handleInputChange('codigo', e.target.value)}
                        placeholder="Código do banco"
                      />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="api_url" className="form-label">URL da API</label>
                      <input
                        type="url"
                        className="form-control"
                        id="api_url"
                        value={formData.api_url}
                        onChange={(e) => handleInputChange('api_url', e.target.value)}
                        placeholder="https://api.exemplo.com"
                      />
                    </div>
                  </div>

                  <div className="col-12">
                    <div className="mb-3">
                      <label htmlFor="descricao" className="form-label">Descrição</label>
                      <textarea
                        className="form-control"
                        id="descricao"
                        rows={3}
                        value={formData.descricao}
                        onChange={(e) => handleInputChange('descricao', e.target.value)}
                        placeholder="Descrição do banco"
                      />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="api_key" className="form-label">API Key</label>
                      <input
                        type="password"
                        className="form-control"
                        id="api_key"
                        value={formData.api_key}
                        onChange={(e) => handleInputChange('api_key', e.target.value)}
                        placeholder="Chave da API"
                      />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="api_secret" className="form-label">API Secret</label>
                      <input
                        type="password"
                        className="form-control"
                        id="api_secret"
                        value={formData.api_secret}
                        onChange={(e) => handleInputChange('api_secret', e.target.value)}
                        placeholder="Secret da API"
                      />
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
                          Ambiente Sandbox
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
                          id="ativo"
                          checked={formData.ativo}
                          onChange={(e) => handleInputChange('ativo', e.target.checked)}
                        />
                        <label className="form-check-label" htmlFor="ativo">
                          Banco Ativo
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="d-flex justify-content-end gap-2 mt-4">
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
                        Salvando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check"></i> Salvar Banco
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BancosCreate;