import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
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

const BancosEdit: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const bancoId = parseInt(id || '0');

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

  // Query para buscar banco
  const { data: banco, isLoading: bancoLoading } = useQuery({
    queryKey: ['banco', bancoId],
    queryFn: () => BancoService.getById(bancoId),
    enabled: !!bancoId,
  });

  // Mutation para atualizar banco
  const updateBancoMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: BancoForm }) => BancoService.update(id, data),
    onSuccess: () => {
      success('Banco atualizado com sucesso!');
      navigate('/bancos');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Erro ao atualizar banco');
    }
  });

  // Carregar dados do banco quando disponível
  useEffect(() => {
    if (banco) {
      setFormData({
        nome: banco.nome || '',
        codigo: banco.codigo || '',
        descricao: banco.descricao || '',
        ativo: banco.ativo || true,
        tipo_banco: banco.tipo_banco || 'efi',
        api_url: banco.api_url || '',
        api_key: banco.api_key || '',
        api_secret: banco.api_secret || '',
        sandbox: banco.sandbox || true,
        identificador_conta: banco.identificador_conta || '',
        client_id_producao: banco.client_id_producao || '',
        client_secret_producao: banco.client_secret_producao || '',
        url_retorno: banco.url_retorno || '',
        repassar_email_cliente: banco.repassar_email_cliente || false,
        percentual_multa: banco.percentual_multa || 0,
        percentual_juros: banco.percentual_juros || 0,
        desconto_tipo: banco.desconto_tipo || '',
        desconto_valor: banco.desconto_valor || 0,
        contra_apresentacao: banco.contra_apresentacao || false,
        recalcular_segunda_via: banco.recalcular_segunda_via || false,
        maximo_dias_recalcular: banco.maximo_dias_recalcular || 0,
        layout_web: banco.layout_web || '',
        layout_pdf: banco.layout_pdf || '',
        layout_carne: banco.layout_carne || '',
        local_pagamento: banco.local_pagamento || '',
        dados_avalista: banco.dados_avalista || '',
        exibir_mes_referente: banco.exibir_mes_referente || false,
        documento_cpf_cnpj: banco.documento_cpf_cnpj || '',
        taxa_cobranca: banco.taxa_cobranca || 0,
        incluir_taxa: banco.incluir_taxa || false,
        observacao_linha_1: banco.observacao_linha_1 || '',
        observacao_linha_2: banco.observacao_linha_2 || '',
        observacao_linha_3: banco.observacao_linha_3 || '',
        observacao_linha_4: banco.observacao_linha_4 || '',
        instrucao_linha_1: banco.instrucao_linha_1 || '',
        instrucao_linha_2: banco.instrucao_linha_2 || '',
        instrucao_linha_3: banco.instrucao_linha_3 || '',
        instrucao_linha_4: banco.instrucao_linha_4 || '',
        instrucao_linha_5: banco.instrucao_linha_5 || '',
        configuracoes_json: banco.configuracoes_json || {},
      });
    }
  }, [banco]);

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    updateBancoMutation.mutate({ id: bancoId, data: formData });
  };

  const handleCancel = () => {
    navigate('/bancos');
  };

  if (bancoLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">Editar Banco</h1>
      </div>

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="nome" className="form-label">
                    Nome do Banco <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control ${errors.nome ? 'is-invalid' : ''}`}
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => handleInputChange('nome', e.target.value)}
                    placeholder="Ex: Banco do Brasil, EFI, ASAAS"
                  />
                  {errors.nome && <div className="invalid-feedback">{errors.nome}</div>}
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="tipo_banco" className="form-label">
                    Tipo de Banco <span className="text-danger">*</span>
                  </label>
                  <select
                    className={`form-select ${errors.tipo_banco ? 'is-invalid' : ''}`}
                    id="tipo_banco"
                    value={formData.tipo_banco}
                    onChange={(e) => handleInputChange('tipo_banco', e.target.value as BancoForm['tipo_banco'])}
                  >
                    <option value="efi">EFI (Gerencianet)</option>
                    <option value="asaas">ASAAS</option>
                    <option value="bancario">Bancário Tradicional</option>
                    <option value="outros">Outros</option>
                  </select>
                  {errors.tipo_banco && <div className="invalid-feedback">{errors.tipo_banco}</div>}
                </div>
              </div>
            </div>

            <div className="mb-3">
              <label htmlFor="descricao" className="form-label">Descrição</label>
              <textarea
                className={`form-control ${errors.descricao ? 'is-invalid' : ''}`}
                id="descricao"
                rows={3}
                value={formData.descricao}
                onChange={(e) => handleInputChange('descricao', e.target.value)}
                placeholder="Detalhes sobre o banco e suas configurações"
              ></textarea>
              {errors.descricao && <div className="invalid-feedback">{errors.descricao}</div>}
            </div>

            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="api_url" className="form-label">URL da API</label>
                  <input
                    type="url"
                    className={`form-control ${errors.api_url ? 'is-invalid' : ''}`}
                    id="api_url"
                    value={formData.api_url}
                    onChange={(e) => handleInputChange('api_url', e.target.value)}
                    placeholder="https://api.exemplo.com"
                  />
                  {errors.api_url && <div className="invalid-feedback">{errors.api_url}</div>}
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="api_key" className="form-label">Chave da API</label>
                  <input
                    type="text"
                    className={`form-control ${errors.api_key ? 'is-invalid' : ''}`}
                    id="api_key"
                    value={formData.api_key}
                    onChange={(e) => handleInputChange('api_key', e.target.value)}
                    placeholder="Sua chave de API"
                  />
                  {errors.api_key && <div className="invalid-feedback">{errors.api_key}</div>}
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-md-4">
                <div className="mb-3 form-check form-switch">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="ativo"
                    checked={formData.ativo}
                    onChange={(e) => handleInputChange('ativo', e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="ativo">Ativo</label>
                </div>
              </div>
              <div className="col-md-4">
                <div className="mb-3 form-check form-switch">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="sandbox"
                    checked={formData.sandbox}
                    onChange={(e) => handleInputChange('sandbox', e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="sandbox">Modo Sandbox</label>
                </div>
              </div>
              <div className="col-md-4">
                <div className="mb-3 form-check form-switch">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="repassar_email_cliente"
                    checked={formData.repassar_email_cliente}
                    onChange={(e) => handleInputChange('repassar_email_cliente', e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="repassar_email_cliente">Repassar Email Cliente</label>
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2 mt-4">
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
                    <i className="bi bi-check"></i> Salvar Alterações
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

export default BancosEdit;
