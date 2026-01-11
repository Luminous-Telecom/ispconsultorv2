import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { BancoService } from '@/services/bancoService';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { useFormPrefix } from '@/hooks/useFormId';
import { useBancoForm } from '@/hooks/useBancoForm';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { Banco } from '@/types';
import DraggableModal from '@/components/common/DraggableModal';
import { Button, Spinner } from '@/components/ui';
import { InformacoesBasicasTab, ConfiguracoesApiTab } from './banco';
import { BancoForm } from './banco/types';
import AsaasForm from './banco/especificos/AsaasForm';
import EfiForm from './banco/especificos/EfiForm';

interface BancoModalProps {
  show: boolean;
  onClose: () => void;
  bancoId?: number | null;
  onSuccess?: (banco: Banco) => void;
}

const BancoModal: React.FC<BancoModalProps> = ({ 
  show, 
  onClose, 
  bancoId,
  onSuccess 
}) => {
  const isMobile = useIsMobile();
  const isEdit = !!bancoId;
  const formPrefix = useFormPrefix(isEdit ? 'BancoEditModal' : 'BancoCreateModal');
  
  // Hook de formulário com React Hook Form + Zod
  const formHook = useBancoForm({
    bancoId: bancoId || null,
    show,
    onSuccess
  });

  // Usar dados do hook
  const formData = formHook.formData;
  const errors = formHook.errors;
  const isLoading = formHook.isLoadingBanco;

  // Estados locais para funcionalidades específicas do modal
  const [testResult, setTestResult] = useState<string>('');
  const [activeTab, setActiveTab] = useState('informacoes-basicas');
  const [isGeneratingSecret, setIsGeneratingSecret] = useState(false);
  const { success, error, warning } = useNotificationContext();
  const queryClient = useQueryClient();

  // Limpar resultado do teste quando o modal abre
  useEffect(() => {
    if (show) {
      setTestResult('');
    }
  }, [show]);

  const handleCancel = () => {
    setTestResult('');
    setIsGeneratingSecret(false);
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
      const dataToSave: BancoForm = { ...formData };
      
      // Se api_key estiver vazio, não enviar (para não sobrescrever o valor existente)
      if (!dataToSave.api_key || dataToSave.api_key.trim() === '') {
        delete (dataToSave as Partial<BancoForm>).api_key;
      }
      
      // Se client_id_producao estiver vazio, não enviar (para não sobrescrever o valor existente)
      if (!dataToSave.client_id_producao || dataToSave.client_id_producao.trim() === '') {
        delete (dataToSave as Partial<BancoForm>).client_id_producao;
      }
      
      // Se client_secret_producao estiver vazio, não enviar (para não sobrescrever o valor existente)
      if (!dataToSave.client_secret_producao || dataToSave.client_secret_producao.trim() === '') {
        delete (dataToSave as Partial<BancoForm>).client_secret_producao;
      }
      
      if (!dataToSave.api_secret || dataToSave.api_secret.trim() === '') {
        delete (dataToSave as Partial<BancoForm>).api_secret;
      }
      delete (dataToSave as Partial<BancoForm>).has_api_key;
      
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

  const handleGenerateWebhookSecret = async () => {
    if (!bancoId) {
      error('Salve o banco antes de gerar o token do webhook');
      return;
    }

    try {
      setIsGeneratingSecret(true);
      const novoSecret = await BancoService.gerarWebhookSecret(bancoId);

      if (novoSecret) {
        formHook.handleInputChange('webhook_secret', novoSecret);
        queryClient.invalidateQueries({ queryKey: ['banco', bancoId] });
        queryClient.invalidateQueries({ queryKey: ['bancos'] });
        success('Token do webhook gerado com sucesso!');
      } else {
        warning('Token não retornado pelo servidor. Tente novamente.');
      }
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      error(axiosError.response?.data?.message || axiosError.message || 'Erro ao gerar token do webhook');
    } finally {
      setIsGeneratingSecret(false);
    }
  };

  const handleCopyWebhookSecret = async () => {
    if (!formData.webhook_secret) {
      warning('Nenhum token disponível para copiar.');
      return;
    }

    try {
      await navigator.clipboard.writeText(formData.webhook_secret);
      success('Token do webhook copiado para a área de transferência!');
    } catch {
      warning('Não foi possível copiar automaticamente. Copie manualmente.');
    }
  };

  // Renderizar campos específicos de cada tipo de banco
  const renderBancoEspecificoCampos = () => {
    switch (formData.tipo_banco) {
      case 'efi':
        return (
          <EfiForm
            formData={formData}
            isPending={formHook.isSubmitting}
            handleInputChange={formHook.handleInputChange}
          />
        );
      case 'asaas':
        return (
          <AsaasForm
            formData={formData}
            isPending={formHook.isSubmitting}
            formPrefix={formPrefix}
            handleInputChange={formHook.handleInputChange}
            onGenerateWebhookSecret={handleGenerateWebhookSecret}
            onCopyWebhookSecret={handleCopyWebhookSecret}
            isGeneratingSecret={isGeneratingSecret}
            isBancoPersisted={!!bancoId}
          />
        );
      default:
        return null;
    }
  };

  // Renderizar conteúdo baseado no estado
  const renderContent = () => {
    // Estado de loading
    if (isEdit && isLoading) {
      return (
        <div className="text-center p-4">
          <Spinner size="md" variant="primary" aria-label="Carregando..." />
          <p className="mt-2">Carregando dados do banco...</p>
        </div>
      );
    }

    // Conteúdo normal do formulário
    return (
      <form id="banco-form" onSubmit={formHook.handleSubmit}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Navegação por Abas */}
          <ul className="nav nav-tabs" role="tablist" style={{ 
            flexShrink: 0, 
            marginBottom: isMobile ? '1rem' : 0, 
            marginTop: isMobile ? '0' : '1rem', 
            marginLeft: isMobile ? '0' : '1rem', 
            marginRight: isMobile ? '0' : '1rem',
            ...(isMobile && {
              display: 'flex',
              flexWrap: 'nowrap',
              overflowX: 'auto',
              overflowY: 'hidden',
              WebkitOverflowScrolling: 'touch'
            })
          }}>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'informacoes-basicas' ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveTab('informacoes-basicas')}
              >
                Banco
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
              // No mobile, ResponsiveDialog já aplica padding, então não aplicar aqui
              padding: isMobile ? '0' : '16px',
              minHeight: 0
            }}
          >
            {/* Aba Banco */}
            {activeTab === 'informacoes-basicas' && (
              <InformacoesBasicasTab
                formData={formData}
                errors={errors}
                handleInputChange={formHook.handleInputChange}
                isPending={formHook.isSubmitting}
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
                handleInputChange={formHook.handleInputChange}
                isPending={formHook.isSubmitting}
                formPrefix={formPrefix}
                renderBancoEspecificoCampos={renderBancoEspecificoCampos}
                handleTestConnection={handleTestConnection}
                testResult={testResult}
              />
            )}
          </div>
        </div>
      </form>
    );
  };

  return (
    <DraggableModal
      show={show}
      onClose={handleCancel}
      title="Banco"
      size="xl"
      modalId="banco-modal"
      headerActions={
        // Mostrar headerActions apenas quando não estiver carregando
        !(isEdit && isLoading) ? (
          <div className="d-flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<i className="bi bi-x-lg"></i>}
              onClick={handleCancel}
              disabled={formHook.isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="banco-form"
              variant="primary"
              size="sm"
              leftIcon={<i className="bi bi-check-lg"></i>}
              isLoading={formHook.isSubmitting}
            >
              Salvar
            </Button>
          </div>
        ) : undefined
      }
    >
      {renderContent()}
    </DraggableModal>
  );
};

export default BancoModal;

