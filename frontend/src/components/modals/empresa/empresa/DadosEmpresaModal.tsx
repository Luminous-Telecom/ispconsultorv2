import React, { useState, useMemo, useLayoutEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { DadosEmpresaService, DadosEmpresa as DadosEmpresaType } from '@/services/dadosEmpresaService';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { ApiError } from '@/services/core/ErrorHandler';
import { useFormReset } from '@/hooks/useFormReset';
import { useIsMobile } from '@/hooks/useMediaQuery';
import DraggableModal from '@/components/common/DraggableModal';
import { Button } from '@/components/ui';
import { DadosEmpresaForm, DadosEmpresaModalProps } from './types';
import DadosBasicosTab from './abas/DadosBasicosTab';
import EnderecoTab from './abas/EnderecoTab';
import ContatoTab from './abas/ContatoTab';
import ResponsavelTab from './abas/ResponsavelTab';

const DadosEmpresaModal: React.FC<DadosEmpresaModalProps> = ({
  show,
  onClose,
  skipWrapper = false,
  onHeaderActionsReady
}) => {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'basico' | 'endereco' | 'contato' | 'responsavel'>('basico');
  const { success, error } = useNotificationContext();
  const queryClient = useQueryClient();

  // Query para buscar dados da empresa
  const { data: dadosEmpresa } = useQuery({
    queryKey: ['dados-empresa'],
    queryFn: () => DadosEmpresaService.get(),
    staleTime: 0, // Sempre buscar dados atualizados
    refetchOnMount: true,
  });

  // Mutation para atualizar dados da empresa
  const updateDadosMutation = useMutation({
    mutationFn: (data: DadosEmpresaType) => DadosEmpresaService.update(data),
    onSuccess: () => {
      success('Dados da empresa atualizados com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['dados-empresa'] });
    },
    onError: (err) => {
      const axiosError = err as AxiosError<{ message: string }>;
      error(axiosError.response?.data?.message || 'Erro ao atualizar dados da empresa');
    }
  });

  // Dados iniciais do formulário
  const initialFormData: DadosEmpresaForm = {
    id: 1,
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    inscricao_estadual: '',
    inscricao_municipal: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    telefone: '',
    celular: '',
    email: '',
    site: '',
    responsavel_nome: '',
    responsavel_cpf: '',
    responsavel_cargo: '',
    responsavel_assinatura: undefined,
    logo: undefined,
  };

  const [dados, setDados] = useState<DadosEmpresaForm>(initialFormData);

  // Usar hook personalizado para reset do formulário
  useFormReset({
    show,
    initialData: initialFormData,
    setFormData: setDados,
    customData: dadosEmpresa
  });

  const handleInputChange = (field: keyof DadosEmpresaForm, value: string) => {
    setDados(prev => ({
      ...prev,
      [field]: value || ''
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateDadosMutation.mutate(dados);
  };

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  const onLogoChange = async (file: File | null) => {
    try {
      if (!file) return;
      
      const resp = await DadosEmpresaService.uploadLogo(file);
      setDados(prev => ({ ...prev, logo: resp.logo }));
      success('Logo atualizada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['dados-empresa'] });
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError.message || 'Erro ao enviar a logo';
      error(errorMessage);
    }
  };

  const onAssinaturaChange = async (file: File | null) => {
    try {
      if (!file) return;
      
      const resp = await DadosEmpresaService.uploadAssinatura(file);
      setDados(prev => ({ ...prev, responsavel_assinatura: resp.responsavel_assinatura }));
      success('Assinatura atualizada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['dados-empresa'] });
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError.message || 'Erro ao enviar a assinatura';
      error(errorMessage);
    }
  };

  const headerActionsContent = useMemo(() => (
    <div className="empresa-header-unified">
      {/* Botões à direita */}
      <div className="empresa-header-buttons modal-header-actions">
        <Button
          type="button"
          variant="primary"
          size="sm"
          leftIcon={<i className="bi bi-x-lg"></i>}
          onClick={handleCancel}
          disabled={updateDadosMutation.isPending}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          form="empresa-form"
          variant="primary"
          size="sm"
          leftIcon={<i className="bi bi-check-lg"></i>}
          isLoading={updateDadosMutation.isPending}
        >
          Salvar
        </Button>
      </div>

      {/* Abas na parte inferior do header */}
      <div className="empresa-header-tabs">
        <ul
          className={`nav nav-tabs empresa-tabs-unified ${isMobile ? 'empresa-tabs-mobile' : ''}`}
          id="empresaTab"
          role="tablist"
          style={{
            margin: 0,
            padding: 0,
            borderBottom: 'none',
            backgroundColor: 'transparent'
          }}
        >
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link modal-tab-hover ${activeTab === 'basico' ? 'active' : ''}`}
              type="button"
              onClick={() => setActiveTab('basico')}
            >
              Empresa
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link modal-tab-hover ${activeTab === 'endereco' ? 'active' : ''}`}
              type="button"
              onClick={() => setActiveTab('endereco')}
            >
              Endereço
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link modal-tab-hover ${activeTab === 'contato' ? 'active' : ''}`}
              type="button"
              onClick={() => setActiveTab('contato')}
            >
              Contato
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link modal-tab-hover ${activeTab === 'responsavel' ? 'active' : ''}`}
              type="button"
              onClick={() => setActiveTab('responsavel')}
            >
              Responsável
            </button>
          </li>
        </ul>
      </div>
    </div>
  ), [activeTab, isMobile, updateDadosMutation.isPending, handleCancel]);

  useLayoutEffect(() => {
    if (skipWrapper && onHeaderActionsReady) {
      onHeaderActionsReady(headerActionsContent);
    }
  }, [skipWrapper, onHeaderActionsReady, headerActionsContent]);

  const modalContent = (
    <>
      <div className="empresa-modal-content">
        {/* Conteúdo das Abas */}
        <div
          className={`tab-content empresa-tab-content empresa-tab-content-padded`}
          id="empresaTabContent"
        >
          <form id="empresa-form" onSubmit={handleSubmit}>
            {activeTab === 'basico' && (
              <DadosBasicosTab
                dados={dados}
                onChange={handleInputChange}
                isPending={updateDadosMutation.isPending}
                onLogoChange={onLogoChange}
              />
            )}

            {activeTab === 'endereco' && (
              <EnderecoTab
                dados={dados}
                onChange={handleInputChange}
                isPending={updateDadosMutation.isPending}
              />
            )}

            {activeTab === 'contato' && (
              <ContatoTab
                dados={dados}
                onChange={handleInputChange}
                isPending={updateDadosMutation.isPending}
              />
            )}

            {activeTab === 'responsavel' && (
              <ResponsavelTab
                dados={dados}
                onChange={handleInputChange}
                isPending={updateDadosMutation.isPending}
                onAssinaturaChange={onAssinaturaChange}
              />
            )}
          </form>
        </div>
      </div>
    </>
  );

  if (skipWrapper) {
    return modalContent;
  }

  return (
    <DraggableModal
      show={show}
      onClose={handleCancel}
      title="Empresa"
      size="xl"
      modalId="dados-empresa-modal"
      headerActions={headerActionsContent}
    >
      {modalContent}
    </DraggableModal>
  );
};

export default DadosEmpresaModal;

