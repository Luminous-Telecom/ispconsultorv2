import React, { useState, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { BancoService } from '../../../services/bancoService';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import DraggableModal from '../../common/DraggableModal';
import { useFormReset } from '../../../hooks/useFormReset';
import FormField from '../../ui/FormField';
import { useFormPrefix } from '../../../hooks/useFormId';

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
  const formPrefix = useFormPrefix('BancoEditModal');
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
    enabled: !!bancoId,
    staleTime: 60 * 1000,
    refetchOnMount: false,
  });

  // Dados iniciais do formulário
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
  };

  // Dados customizados do banco (quando editando)
  const customFormData = useMemo(() => banco ? {
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
  } : undefined, [banco]);

  // Usar hook personalizado para reset do formulário
  useFormReset({
    show,
    initialData: initialFormData,
    setFormData,
    setErrors,
    customData: banco ? customFormData : undefined
  });

  // Limpar resultado do teste quando o modal abre
  useEffect(() => {
    if (show) {
      setTestResult('');
    }
  }, [show]);

  // Atualizar formData quando banco for carregado
  useEffect(() => {
    console.log('🔄 useEffect banco:', { banco: !!banco, show, customFormData: !!customFormData });
    if (banco && show && customFormData) {
      console.log('📝 Atualizando formData com customFormData:', customFormData);
      setFormData(customFormData);
    }
  }, [banco, show, customFormData]);

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
    console.log('🔄 handleInputChange:', { field, value, currentFormData: formData });
    
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      console.log('📝 setFormData:', { field, value, prev, newData });
      return newData;
    });

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
                  <FormField
                    name="identificador_conta"
                    type="text"
                    label="Identificador da Conta"
                    placeholder="Disponibilizado no menu configurações da API"
                    required={true}
                    size="md"
                    value={formData.identificador_conta}
                    onChange={(e: any) => handleInputChange('identificador_conta', e.value)}
                    disabled={updateBancoMutation.isPending}
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
                    size="md"
                    value={formData.percentual_multa}
                    onChange={(e: any) => handleInputChange('percentual_multa', parseFloat(e.value) || 0)}
                    disabled={updateBancoMutation.isPending}
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
                    size="md"
                    value={formData.percentual_juros}
                    onChange={(e: any) => handleInputChange('percentual_juros', parseFloat(e.value) || 0)}
                    disabled={updateBancoMutation.isPending}
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
                    size="md"
                    value={formData.local_pagamento}
                    onChange={(e: any) => handleInputChange('local_pagamento', e.value)}
                    disabled={updateBancoMutation.isPending}
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
                    size="md"
                    value={formData.api_key}
                    onChange={(e: any) => handleInputChange('api_key', e.value)}
                    disabled={updateBancoMutation.isPending}
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
                    size="md"
                    value={formData.taxa_cobranca}
                    onChange={(e: any) => handleInputChange('taxa_cobranca', parseFloat(e.value) || 0)}
                    disabled={updateBancoMutation.isPending}
                    step={0.01}
                  />
                </div>
              </div>

              <div className="col-md-6">
                <div className="mt-4">
                  <FormField
                    name="incluir_taxa"
                    type="checkbox"
                    label="Incluir Taxa no Boleto"
                    value={formData.incluir_taxa}
                    onChange={(e: any) => handleInputChange('incluir_taxa', e.value)}
                    disabled={updateBancoMutation.isPending}
                    formPrefix={formPrefix}
                    switch={true}
                  />
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
        modalId="banco-edit-modal-loading"
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
      modalId="banco-edit-modal"
      headerActions={
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleCancel}
            disabled={updateBancoMutation.isPending}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="banco-edit-form"
            className="btn btn-primary btn-sm"
            disabled={updateBancoMutation.isPending}
          >
            Salvar
          </button>
        </div>
      }
    >
      <form id="banco-edit-form" onSubmit={handleSubmit}>
        {/* Informações Básicas */}
        <div className="mb-4">
          <h6 className="border-bottom pb-2 mb-3">Informações Básicas</h6>
          <div className="row">
            <div className="col-md-12">
              <div className="mb-3">
                <FormField
                  name="nome"
                  type="text"
                  label="Nome do Banco"
                  placeholder="Ex: EFI - Conta Principal"
                  required={true}
                  size="md"
                  value={formData.nome}
                  onChange={(e: any) => handleInputChange('nome', e.value)}
                  error={errors.nome}
                  isInvalid={!!errors.nome}
                  disabled={updateBancoMutation.isPending}
                  autoComplete="organization"
                />
                <small className="text-secondary text-secondary">Nome para identificar esta conta do banco</small>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <FormField
                  name="tipo_banco"
                  type="select"
                  label="Tipo de Banco"
                  size="sm"
                  value={formData.tipo_banco}
                  onChange={(e: any) => handleInputChange('tipo_banco', e.value)}
                  disabled={updateBancoMutation.isPending}
                  formPrefix={formPrefix}
                  options={[
                    { value: 'efi', label: 'EFI (Código: 364)' },
                    { value: 'asaas', label: 'Asaas (Código: 461)' }
                  ]}
                />
                <small className="text-secondary text-secondary">Código do banco é definido automaticamente</small>
              </div>
            </div>

            <div className="col-md-6">
              <div className="mb-3">
                <FormField
                  name="ativo"
                  type="checkbox"
                  label={formData.ativo ? 'Ativo' : 'Inativo'}
                  value={formData.ativo}
                  onChange={(e: any) => handleInputChange('ativo', e.value)}
                  disabled={updateBancoMutation.isPending}
                  formPrefix={formPrefix}
                  switch={true}
                />
              </div>
            </div>
          </div>

          <div className="mb-3">
            <FormField
              name="descricao"
              type="textarea"
              label="Descrição"
              placeholder="Descrição do banco..."
              size="md"
              value={formData.descricao}
              onChange={(e: any) => handleInputChange('descricao', e.value)}
              disabled={updateBancoMutation.isPending}
              rows={3}
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
                      <FormField
                        name="client_id_producao"
                        type="text"
                        label={formData.tipo_banco === 'efi' ? 'Client ID Produção' : 'Client ID'}
                        placeholder="Client ID para produção"
                        required={formData.tipo_banco === 'efi'}
                        size="md"
                        value={formData.client_id_producao}
                        onChange={(e: any) => handleInputChange('client_id_producao', e.value)}
                        disabled={updateBancoMutation.isPending}
                        autoComplete="off"
                        formPrefix={formPrefix}
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
                        size="md"
                        value={formData.client_secret_producao}
                        onChange={(e: any) => handleInputChange('client_secret_producao', e.value)}
                        disabled={updateBancoMutation.isPending}
                        autoComplete="off"
                        formPrefix={formPrefix}
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
                        size="md"
                        value={formData.url_retorno}
                        onChange={(e: any) => handleInputChange('url_retorno', e.value)}
                        disabled={updateBancoMutation.isPending}
                        autoComplete="url"
                        formPrefix={formPrefix}
                      />
                    <small className="text-secondary text-secondary">URL para receber notificações de pagamento</small>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-12">
                  <div className="mb-3">
                    <FormField
                      name="sandbox"
                      type="checkbox"
                      label="Modo Sandbox (Testes)"
                      value={formData.sandbox}
                      onChange={(e: any) => handleInputChange('sandbox', e.value)}
                      disabled={updateBancoMutation.isPending}
                      formPrefix={formPrefix}
                      switch={true}
                    />
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

      </form>
    </DraggableModal>
  );
};

export default BancoEditModal;
