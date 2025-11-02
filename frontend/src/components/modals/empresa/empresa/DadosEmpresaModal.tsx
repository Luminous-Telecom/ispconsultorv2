import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { DadosEmpresaService, DadosEmpresa as DadosEmpresaType } from '../../../../services/dadosEmpresaService';
import { useNotificationContext } from '../../../../components/notifications/NotificationProvider';
import DraggableModal from '../../../common/DraggableModal';
import { useFormReset } from '../../../../hooks/useFormReset';
import { DadosEmpresaForm, DadosEmpresaModalProps } from './types';
import DadosBasicosTab from './abas/DadosBasicosTab';
import EnderecoTab from './abas/EnderecoTab';
import ContatoTab from './abas/ContatoTab';
import ResponsavelTab from './abas/ResponsavelTab';

const DadosEmpresaModal: React.FC<DadosEmpresaModalProps> = ({
  show,
  onClose
}) => {
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
      if (resp?.success && resp.logo) {
        setDados(prev => ({ ...prev, logo: resp.logo }));
        success('Logo atualizada com sucesso!');
        queryClient.invalidateQueries({ queryKey: ['dados-empresa'] });
      } else {
        error('Não foi possível atualizar a logo');
      }
    } catch (err) {
      error('Erro ao enviar a logo');
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
      <form id="empresa-form" onSubmit={handleSubmit} style={{ padding: '1rem' }}>
        {/* Navegação de Abas */}
        <ul className="nav nav-tabs mb-3">
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link ${activeTab === 'basico' ? 'active' : ''}`}
              onClick={() => setActiveTab('basico')}
            >
              <i className="bi bi-building me-2"></i>
              Dados Básicos
            </button>
          </li>
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link ${activeTab === 'endereco' ? 'active' : ''}`}
              onClick={() => setActiveTab('endereco')}
            >
              <i className="bi bi-geo-alt me-2"></i>
              Endereço
            </button>
          </li>
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link ${activeTab === 'contato' ? 'active' : ''}`}
              onClick={() => setActiveTab('contato')}
            >
              <i className="bi bi-telephone me-2"></i>
              Contato
            </button>
          </li>
          <li className="nav-item">
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
    </DraggableModal>
  );
};

export default DadosEmpresaModal;

