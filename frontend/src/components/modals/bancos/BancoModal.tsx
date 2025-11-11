import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { BancoService } from '../../../services/bancoService';
import { useNotificationContext } from '../../../components/notifications/NotificationProvider';
import DraggableModal from '../../common/DraggableModal';
import { useFormReset } from '../../../hooks/useFormReset';
import FormField from '../../ui/FormField';
import { useFormPrefix } from '../../../hooks/useFormId';
import { FormValue } from '../../../types/common';
import { InformacoesBasicasTab, ConfiguracoesApiTab } from './banco';
import { Banco } from '../../../types';

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

interface BancoModalProps {
  show: boolean;
  onClose: () => void;
  bancoId?: number | null;
  onSuccess?: (banco: Banco) => void;
}

const mapBancoToForm = (banco: Banco): BancoForm => ({
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
  percentual_multa: banco.percentual_multa || 2,
  percentual_juros: banco.percentual_juros || 0.03,
  desconto_tipo: banco.desconto_tipo || 'fixo',
  desconto_valor: banco.desconto_valor || 0,
  contra_apresentacao: banco.contra_apresentacao ?? false,
  recalcular_segunda_via: banco.recalcular_segunda_via ?? false,
  maximo_dias_recalcular: banco.maximo_dias_recalcular || 0,
  layout_web: banco.layout_web || 'normal',
  layout_pdf: banco.layout_pdf || 'normal',
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

const BancoModal: React.FC<BancoModalProps> = ({ 
  show, 
  onClose, 
  bancoId,
  onSuccess 
}) => {
  const isEdit = !!bancoId;
  const formPrefix = useFormPrefix(isEdit ? 'BancoEditModal' : 'BancoCreateModal');
  
  const initialFormData: BancoForm = {
    nome: '',
    codigo: '364',
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
  const [activeTab, setActiveTab] = useState('informacoes-basicas');
  const { success, error } = useNotificationContext();
  const queryClient = useQueryClient();

  // Query para buscar dados do banco (apenas em modo edição)
  const { data: banco, isLoading } = useQuery({
    queryKey: ['banco', bancoId],
    queryFn: () => BancoService.getById(bancoId!),
    enabled: isEdit && !!bancoId,
    staleTime: 60 * 1000,
    refetchOnMount: false,
  });

  // Converter banco para formato do formulário
  const bankoFormData: BancoForm | undefined = banco ? mapBancoToForm(banco) : undefined;

  // Usar hook personalizado para reset do formulário
  useFormReset({
    show,
    initialData: initialFormData,
    setFormData,
    setErrors,
    customData: bankoFormData
  });

  // Limpar resultado do teste quando o modal abre
  useEffect(() => {
    if (show) {
      setTestResult('');
      setErrors({});
    }
  }, [show]);

  // Mutation para criar banco
  const createBancoMutation = useMutation({
    mutationFn: (data: BancoForm) => BancoService.create(data),
    onSuccess: (createdBanco) => {
      success('Banco criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['bancos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setFormData(mapBancoToForm(createdBanco));
      onSuccess?.(createdBanco);
    },
    onError: (err) => {
      const axiosError = err as AxiosError<{ message: string }>;
      error(axiosError.response?.data?.message || 'Erro ao criar banco');
    }
  });

  // Mutation para atualizar banco
  const updateBancoMutation = useMutation({
    mutationFn: (data: BancoForm) => BancoService.update(bancoId!, data),
    onSuccess: (updatedBanco) => {
      success('Banco atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['bancos'] });
      queryClient.invalidateQueries({ queryKey: ['banco', bancoId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setFormData(mapBancoToForm(updatedBanco));
      onSuccess?.(updatedBanco);
    },
    onError: (err) => {
      const axiosError = err as AxiosError<{ message: string }>;
      error(axiosError.response?.data?.message || 'Erro ao atualizar banco');
    }
  });

  const isPending = createBancoMutation.isPending || updateBancoMutation.isPending;

  const handleInputChange = (field: keyof BancoForm, value: FormValue) => {
    // Normalizar o valor baseado no tipo esperado do campo
    let normalizedValue: string | boolean | number;
    
    if (value === null || value === undefined) {
      // Para campos string, usar string vazia; para boolean, manter o valor atual; para number, usar 0
      const fieldType = typeof formData[field];
      if (fieldType === 'boolean') {
        normalizedValue = false;
      } else if (fieldType === 'number') {
        normalizedValue = 0;
      } else {
        normalizedValue = '';
      }
    } else if (Array.isArray(value)) {
      // Arrays não são esperados, usar primeiro valor ou string vazia
      normalizedValue = value.length > 0 ? String(value[0]) : '';
    } else {
      normalizedValue = value as string | boolean | number;
    }

    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: normalizedValue
      };
      
      // Atualizar código e url_retorno quando tipo_banco mudar
      if (field === 'tipo_banco' && !isEdit) {
        const codigos: Record<string, string> = {
          'efi': '364',
          'asaas': '461',
          'bancario': '',
          'outros': ''
        };
        newData.codigo = codigos[String(normalizedValue)] || '';
        newData.url_retorno = `${window.location.origin}/webhook/${normalizedValue}`;
      }
      
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (isEdit) {
      // Preparar dados para salvar (não enviar campos de senha vazios)
      const dataToSave = { ...formData };
      
      // Se api_key estiver vazio, não enviar (para não sobrescrever o valor existente)
      if (!dataToSave.api_key || dataToSave.api_key.trim() === '') {
        delete (dataToSave as Partial<BancoForm>).api_key;
      }
      
      // Se client_secret_producao estiver vazio, não enviar (para não sobrescrever o valor existente)
      if (!dataToSave.client_secret_producao || dataToSave.client_secret_producao.trim() === '') {
        delete (dataToSave as Partial<BancoForm>).client_secret_producao;
      }
      
      // Se api_secret estiver vazio, não enviar
      if (!dataToSave.api_secret || dataToSave.api_secret.trim() === '') {
        delete (dataToSave as Partial<BancoForm>).api_secret;
      }
      
      updateBancoMutation.mutate(dataToSave);
    } else {
      createBancoMutation.mutate(formData);
    }
  };

  const handleCancel = () => {
    setErrors({});
    setFormData(initialFormData);
    setTestResult('');
    onClose();
  };

  const handleTestConnection = async () => {
    if (!bancoId) {
      error('Salve o banco antes de testar a conexão');
      return;
    }

    setTestResult('Testando conexão...');
    try {
      // Preparar dados para salvar
      const dataToSave = { ...formData };
      
      // Se api_key estiver vazio, não enviar (para não sobrescrever o valor existente)
      if (!dataToSave.api_key || dataToSave.api_key.trim() === '') {
        delete (dataToSave as Partial<BancoForm>).api_key;
      }
      
      // Se client_secret_producao estiver vazio, não enviar (para não sobrescrever o valor existente)
      if (!dataToSave.client_secret_producao || dataToSave.client_secret_producao.trim() === '') {
        delete (dataToSave as Partial<BancoForm>).client_secret_producao;
      }
      
      // Se api_secret estiver vazio, não enviar
      if (!dataToSave.api_secret || dataToSave.api_secret.trim() === '') {
        delete (dataToSave as Partial<BancoForm>).api_secret;
      }
      
      // Salvar dados primeiro (sem fechar o modal)
      await BancoService.update(bancoId, dataToSave);
      queryClient.invalidateQueries({ queryKey: ['bancos'] });
      queryClient.invalidateQueries({ queryKey: ['banco', bancoId] });
      
      // Testar conexão
      const resultado = await BancoService.testarConexao(bancoId);
      
      if (resultado.success) {
        setTestResult('✅ ' + (resultado.message || 'Conexão testada com sucesso!'));
        success(resultado.message || 'Conexão testada com sucesso!');
      } else {
        let mensagemErro = resultado.message || 'Falha no teste de conexão';
        
        // Melhorar mensagem se for erro de credenciais
        if (mensagemErro.includes('Credenciais do banco não configuradas')) {
          mensagemErro = formData.tipo_banco === 'asaas'
            ? 'Credenciais não configuradas. Informe a API Key do Asaas antes de testar.'
            : 'Credenciais não configuradas. Preencha o Client ID e Client Secret antes de testar.';
        }
        
        setTestResult('❌ ' + mensagemErro);
        error(mensagemErro);
      }
    } catch (err) {
      const axiosError = err as AxiosError<{ message: string }>;
      let errorMessage = axiosError?.response?.data?.message || axiosError?.message || 'Erro ao testar conexão';
      
      // Melhorar mensagem se for erro de credenciais
      if (errorMessage.includes('Credenciais do banco não configuradas')) {
        errorMessage = formData.tipo_banco === 'asaas'
          ? 'Credenciais não configuradas. Informe a API Key do Asaas antes de testar.'
          : 'Credenciais não configuradas. Preencha o Client ID e Client Secret antes de testar.';
      }
      
      setTestResult('❌ ' + errorMessage);
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
                    onChange={(value) => handleInputChange('identificador_conta', value)}
                    disabled={isPending}
                    autoComplete="off"
                  />
                  <small className="text-secondary">Disponível nas configurações da API Efi</small>
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
                    onChange={(value) => handleInputChange('percentual_multa', parseFloat(String(value ?? '')) || 0)}
                    disabled={isPending}
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
                    onChange={(value) => handleInputChange('percentual_juros', parseFloat(String(value ?? '')) || 0)}
                    disabled={isPending}
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
                    onChange={(value) => handleInputChange('local_pagamento', value)}
                    disabled={isPending}
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
                    onChange={(value) => handleInputChange('api_key', value)}
                    disabled={isPending}
                    autoComplete="off"
                  />
                  <small className="text-secondary">Disponível no painel administrativo da Asaas</small>
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
                    onChange={(value) => handleInputChange('taxa_cobranca', parseFloat(String(value ?? '')) || 0)}
                    disabled={isPending}
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
                    onChange={(value) => handleInputChange('incluir_taxa', value)}
                    disabled={isPending}
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

  if (isEdit && isLoading) {
    return (
      <DraggableModal
        show={show}
        onClose={onClose}
        title="Banco"
        modalId="banco-modal-loading"
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
      modalId="banco-modal"
      headerActions={
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleCancel}
            disabled={isPending}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="banco-form"
            className="btn btn-primary btn-sm"
            disabled={isPending}
          >
            Salvar
          </button>
        </div>
      }
    >
      <form id="banco-form" onSubmit={handleSubmit}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Navegação por Abas */}
          <ul className="nav nav-tabs" role="tablist" style={{ flexShrink: 0, marginBottom: 0, marginTop: '1rem', marginLeft: '1rem', marginRight: '1rem' }}>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'informacoes-basicas' ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveTab('informacoes-basicas')}
              >
                Informações Básicas
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'configuracoes-api' ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveTab('configuracoes-api')}
              >
                Configurações da API
              </button>
            </li>
          </ul>

          {/* Conteúdo das Abas */}
          <div 
            className="tab-content" 
            style={{ 
              flex: 1, 
              overflow: 'auto', 
              padding: '16px',
              minHeight: 0
            }}
          >
            {/* Aba Informações Básicas */}
            {activeTab === 'informacoes-basicas' && (
              <InformacoesBasicasTab
                formData={formData}
                errors={errors}
                handleInputChange={handleInputChange}
                isPending={isPending}
                formPrefix={formPrefix}
                renderBancoEspecificoCampos={renderBancoEspecificoCampos}
                handleTestConnection={handleTestConnection}
                testResult={testResult}
              />
            )}

            {/* Aba Configurações da API */}
            {activeTab === 'configuracoes-api' && (
              <ConfiguracoesApiTab
                formData={formData}
                errors={errors}
                handleInputChange={handleInputChange}
                isPending={isPending}
                formPrefix={formPrefix}
                renderBancoEspecificoCampos={renderBancoEspecificoCampos}
                handleTestConnection={handleTestConnection}
                testResult={testResult}
              />
            )}
          </div>
        </div>
      </form>
    </DraggableModal>
  );
};

export default BancoModal;

