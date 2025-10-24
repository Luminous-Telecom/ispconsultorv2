import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BancoService } from '../../../services/bancoService';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import DraggableModal from '../../common/DraggableModal';
import { useFormReset } from '../../../hooks/useFormReset';
import { Form, FormConfig } from '../../forms';
import FormField from '../../ui/FormField';

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

  // Usar hook personalizado para reset do formulário
  useFormReset({
    show,
    initialData: initialFormData,
    setFormData,
    setErrors
  });

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

  // Configuração do formulário unificado para campos principais
  const bancoFormConfig: FormConfig = {
    fields: [
      {
        name: 'nome',
        type: 'text',
        label: 'Nome do Banco',
        placeholder: 'Nome do banco',
        required: true,
        size: 'md',
        validation: [
          { type: 'required', message: 'Nome é obrigatório' }
        ]
      },
      {
        name: 'codigo',
        type: 'text',
        label: 'Código',
        placeholder: 'Código do banco',
        required: true,
        size: 'md',
        validation: [
          { type: 'required', message: 'Código é obrigatório' }
        ]
      },
      {
        name: 'descricao',
        type: 'textarea',
        label: 'Descrição',
        placeholder: 'Descrição do banco',
        rows: 3,
        size: 'md'
      },
      {
        name: 'tipo_banco',
        type: 'select',
        label: 'Tipo de Banco',
        options: [
          { value: 'efi', label: 'EFI' },
          { value: 'asaas', label: 'ASAAS' },
          { value: 'bancario', label: 'Bancário' },
          { value: 'outros', label: 'Outros' }
        ],
        size: 'md'
      },
      {
        name: 'ativo',
        type: 'checkbox',
        label: 'Ativo',
        description: 'Banco está ativo no sistema',
        switch: true
      },
      {
        name: 'sandbox',
        type: 'checkbox',
        label: 'Sandbox',
        description: 'Usar ambiente de teste',
        switch: true
      }
    ],
    layout: 'vertical',
    columns: 2,
    spacing: 'md'
  };

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
                  <FormField
                    name="identificador_conta"
                    type="text"
                    label="Identificador da Conta"
                    placeholder="Disponibilizado no menu configurações da API"
                    required={true}
                    size="sm"
                    value={formData.identificador_conta}
                    onChange={(e: any) => handleInputChange('identificador_conta', e.value)}
                    disabled={createBancoMutation.isPending}
                    autoComplete="off"
                  />
                  <small className="text-secondary text-secondary">Disponível nas configurações da API Efi</small>
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <FormField
                    name="percentual_multa"
                    type="number"
                    label="Percentual de Multa (%)"
                    placeholder="2.00"
                    size="sm"
                    value={formData.percentual_multa}
                    onChange={(e: any) => handleInputChange('percentual_multa', parseFloat(e.value) || 0)}
                    disabled={createBancoMutation.isPending}
                    step={0.01}
                  />
                </div>
              </div>

              <div className="col-md-6">
                <div className="mb-3">
                  <FormField
                    name="percentual_juros"
                    type="number"
                    label="Percentual de Juros (% ao dia)"
                    placeholder="0.03"
                    size="sm"
                    value={formData.percentual_juros}
                    onChange={(e: any) => handleInputChange('percentual_juros', parseFloat(e.value) || 0)}
                    disabled={createBancoMutation.isPending}
                    step={0.01}
                  />
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-md-12">
                <div className="mb-3">
                  <FormField
                    name="local_pagamento"
                    type="text"
                    label="Local de Pagamento"
                    placeholder="Pagável em qualquer banco até o vencimento"
                    size="sm"
                    value={formData.local_pagamento}
                    onChange={(e: any) => handleInputChange('local_pagamento', e.value)}
                    disabled={createBancoMutation.isPending}
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
                  <FormField
                    name="api_key"
                    type="password"
                    label="API Key"
                    placeholder="Sua chave da API Asaas"
                    required={true}
                    size="sm"
                    value={formData.api_key}
                    onChange={(e: any) => handleInputChange('api_key', e.value)}
                    disabled={createBancoMutation.isPending}
                    autoComplete="off"
                  />
                  <small className="text-secondary text-secondary">Disponível no painel administrativo da Asaas</small>
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <FormField
                    name="taxa_cobranca"
                    type="number"
                    label="Taxa de Cobrança (R$)"
                    placeholder="0.00"
                    size="sm"
                    value={formData.taxa_cobranca}
                    onChange={(e: any) => handleInputChange('taxa_cobranca', parseFloat(e.value) || 0)}
                    disabled={createBancoMutation.isPending}
                    step={0.01}
                  />
                </div>
              </div>

              <div className="col-md-6">
                <div className="form-check mt-4">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="incluir_taxa"
                    name="incluir_taxa"
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

      default:
        return null;
    }
  };

  return (
    <DraggableModal
      show={show}
      onClose={handleCancel}
      title="Banco"
      modalId="banco-create-modal"
      headerActions={
        <div className="d-flex gap-2">
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
            form="banco-create-form"
            className="btn btn-primary btn-sm"
            disabled={createBancoMutation.isPending}
          >
            Criar Banco
          </button>
        </div>
      }
    >
      {/* Informações Básicas */}
      <div className="mb-4">
        <h6 className="border-bottom pb-2 mb-3">Informações Básicas</h6>
        <Form
          key={`banco-form-${formData.nome}-${formData.codigo}`}
          config={bancoFormConfig}
          initialValues={{
            nome: formData.nome,
            codigo: formData.codigo,
            descricao: formData.descricao,
            tipo_banco: formData.tipo_banco,
            ativo: formData.ativo,
            sandbox: formData.sandbox
          }}
          onSubmit={(data) => {
            // Atualizar apenas os campos principais
            handleInputChange('nome', data.nome);
            handleInputChange('codigo', data.codigo);
            handleInputChange('descricao', data.descricao);
            handleInputChange('tipo_banco', data.tipo_banco);
            handleInputChange('ativo', data.ativo);
            handleInputChange('sandbox', data.sandbox);
          }}
          showSubmitButton={false}
          showResetButton={false}
          className="banco-form"
        />
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
                <FormField
                  name="client_id_producao"
                  type="text"
                  label={formData.tipo_banco === 'efi' ? 'Client ID Produção' : 'Client ID'}
                  placeholder="Client ID para produção"
                  required={formData.tipo_banco === 'efi'}
                  size="sm"
                  value={formData.client_id_producao}
                  onChange={(e: any) => handleInputChange('client_id_producao', e.value)}
                  disabled={createBancoMutation.isPending}
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="col-md-6">
              <div className="mb-3">
                <FormField
                  name="client_secret_producao"
                  type="password"
                  label={formData.tipo_banco === 'efi' ? 'Client Secret Produção' : 'Client Secret'}
                  placeholder="Client Secret para produção"
                  required={formData.tipo_banco === 'efi'}
                  size="sm"
                  value={formData.client_secret_producao}
                  onChange={(e: any) => handleInputChange('client_secret_producao', e.value)}
                  disabled={createBancoMutation.isPending}
                  autoComplete="off"
                />
              </div>
            </div>
          </div>

              <div className="row">
                <div className="col-md-12">
          <div className="mb-3">
            <FormField
              name="url_retorno"
              type="url"
              label="URL de Retorno (Webhook)"
              placeholder="URL para retorno de webhooks"
              size="sm"
              value={formData.url_retorno}
              onChange={(e: any) => handleInputChange('url_retorno', e.value)}
              disabled={createBancoMutation.isPending}
              autoComplete="url"
            />
            <small className="text-secondary text-secondary">URL gerada automaticamente baseada no tipo de banco</small>
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
                  name="sandbox"
                  checked={formData.sandbox}
                  onChange={(e) => handleInputChange('sandbox', e.target.checked)}
                  disabled={createBancoMutation.isPending}
                />
                <label className="form-check-label" htmlFor="sandbox">
                      Modo Sandbox (Testes)
                </label>
                    <small className="text-secondary text-secondary d-block">
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

    </DraggableModal>
  );
};

export default BancoCreateModal;
