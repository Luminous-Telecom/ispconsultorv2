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
      setErrors({});
      setTestResult('');
    }
  }, [show]);

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
    setTestResult('Testando conexão...');
    try {
      // Simular teste de conexão
      await new Promise(resolve => setTimeout(resolve, 2000));
      setTestResult('Conexão testada com sucesso!');
    } catch (error) {
      setTestResult('Erro ao testar conexão');
    }
  };

  return (
    <DraggableModal
      show={show}
      onClose={handleCancel}
      title="Novo Banco"
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
          <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="client_id_producao" className="form-label small">Client ID Produção</label>
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
                <label htmlFor="client_secret_producao" className="form-label small">Client Secret Produção</label>
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

          <div className="mb-3">
            <label htmlFor="url_retorno" className="form-label small">URL de Retorno</label>
            <input
              type="url"
              className="form-control form-control-sm"
              id="url_retorno"
              value={formData.url_retorno}
              onChange={(e) => handleInputChange('url_retorno', e.target.value)}
              disabled={createBancoMutation.isPending}
              placeholder="URL para retorno de webhooks"
            />
          </div>

          <div className="row">
            <div className="col-md-6">
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
                  Modo Sandbox
                </label>
              </div>
            </div>

            <div className="col-md-6">
              <div className="form-check mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="repassar_email_cliente"
                  checked={formData.repassar_email_cliente}
                  onChange={(e) => handleInputChange('repassar_email_cliente', e.target.checked)}
                  disabled={createBancoMutation.isPending}
                />
                <label className="form-check-label" htmlFor="repassar_email_cliente">
                  Repassar Email do Cliente
                </label>
              </div>
            </div>
          </div>
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
              <i className="bi bi-wifi"></i> Testar Conexão
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
                <i className="bi bi-check"></i> Criar Banco
              </>
            )}
          </button>
        </div>
      </form>
    </DraggableModal>
  );
};

export default BancoCreateModal;
