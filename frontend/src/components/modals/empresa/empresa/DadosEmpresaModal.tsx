import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { DadosEmpresaService, DadosEmpresa as DadosEmpresaType } from '@/services/dadosEmpresaService';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { ApiError } from '@/services/core/ErrorHandler';
import { useFormReset } from '@/hooks/useFormReset';
import { useIsMobile } from '@/hooks/useMediaQuery';
import DraggableModal from '@/components/common/DraggableModal';
import { DadosEmpresaForm, DadosEmpresaModalProps } from './types';
import DadosBasicosTab from './abas/DadosBasicosTab';
import EnderecoTab from './abas/EnderecoTab';
import ContatoTab from './abas/ContatoTab';
import ResponsavelTab from './abas/ResponsavelTab';

const DadosEmpresaModal: React.FC<DadosEmpresaModalProps> = ({
  show,
  onClose
}) => {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'basico' | 'endereco' | 'contato' | 'responsavel'>('basico');
  const { success, error } = useNotificationContext();
  const queryClient = useQueryClient();

  // Query para buscar dados da empresa
  const { data: dadosEmpresa } = useQuery({
    queryKey: ['dados-empresa'],
    queryFn: () => DadosEmpresaService.get(),
    staleTime: 60 * 1000,
    refetchOnMount: false,
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

  const handleCancel = () => {
    onClose();
  };

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

  return (
    <DraggableModal
      show={show}
      onClose={handleCancel}
      title="Empresa"
      size="xl"
      modalId="dados-empresa-modal"
      headerActions={
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleCancel}
            disabled={updateDadosMutation.isPending}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="empresa-form"
            className="btn btn-primary btn-sm"
            disabled={updateDadosMutation.isPending}
          >
            Salvar
          </button>
        </div>
      }
    >
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Navegação de Abas */}
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
              type="button"
              className={`nav-link ${activeTab === 'basico' ? 'active' : ''}`}
              onClick={() => setActiveTab('basico')}
            >
              <i className="bi bi-building me-2"></i>
              Dados Básicos
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              type="button"
              className={`nav-link ${activeTab === 'endereco' ? 'active' : ''}`}
              onClick={() => setActiveTab('endereco')}
            >
              <i className="bi bi-geo-alt me-2"></i>
              Endereço
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              type="button"
              className={`nav-link ${activeTab === 'contato' ? 'active' : ''}`}
              onClick={() => setActiveTab('contato')}
            >
              <i className="bi bi-telephone me-2"></i>
              Contato
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              type="button"
              className={`nav-link ${activeTab === 'responsavel' ? 'active' : ''}`}
              onClick={() => setActiveTab('responsavel')}
            >
              <i className="bi bi-person me-2"></i>
              Responsável
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
              />
            )}
          </form>
        </div>
      </div>
    </DraggableModal>
  );
};

export default DadosEmpresaModal;

