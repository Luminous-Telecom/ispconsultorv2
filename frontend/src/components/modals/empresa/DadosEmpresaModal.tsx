import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DadosEmpresaService, DadosEmpresa as DadosEmpresaType } from '../../../services/dadosEmpresaService';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import DraggableModal from '../../common/DraggableModal';
import { useFormReset } from '../../../hooks/useFormReset';
import { FormField } from '../../ui';
import { AddressFields } from '../../forms';
import { formatCNPJ, formatCPF, formatPhone, formatCEP } from '../../../utils/formatters';

interface DadosEmpresaModalProps {
  show: boolean;
  onClose: () => void;
}

const DadosEmpresaModal: React.FC<DadosEmpresaModalProps> = ({
  show,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState('basico');
  const { success, error } = useNotificationContext();
  const queryClient = useQueryClient();

  // Query para buscar dados da empresa
  const { data: dadosEmpresa, isLoading } = useQuery({
    queryKey: ['dados-empresa'],
    queryFn: () => DadosEmpresaService.get(),
    staleTime: 60 * 1000, // 60 segundos
    refetchOnMount: false,
  });

  // Mutation para atualizar dados da empresa
  const updateDadosMutation = useMutation({
    mutationFn: (data: DadosEmpresaType) => DadosEmpresaService.update(data),
    onSuccess: () => {
      success('Dados da empresa atualizados com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['dados-empresa'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Erro ao atualizar dados da empresa');
    }
  });

  // Dados iniciais do formulário
  const initialFormData: DadosEmpresaType = {
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

  const [dados, setDados] = useState<DadosEmpresaType>(initialFormData);

  // Dados customizados da empresa (quando editando)
  const customFormData = dadosEmpresa ? {
    id: dadosEmpresa.id || 1,
    razao_social: dadosEmpresa.razao_social || '',
    nome_fantasia: dadosEmpresa.nome_fantasia || '',
    cnpj: dadosEmpresa.cnpj || '',
    inscricao_estadual: dadosEmpresa.inscricao_estadual || '',
    inscricao_municipal: dadosEmpresa.inscricao_municipal || '',
    cep: dadosEmpresa.cep || '',
    endereco: dadosEmpresa.endereco || '',
    numero: dadosEmpresa.numero || '',
    complemento: dadosEmpresa.complemento || '',
    bairro: dadosEmpresa.bairro || '',
    cidade: dadosEmpresa.cidade || '',
    estado: dadosEmpresa.estado || '',
    telefone: dadosEmpresa.telefone || '',
    celular: dadosEmpresa.celular || '',
    email: dadosEmpresa.email || '',
    site: dadosEmpresa.site || '',
    responsavel_nome: dadosEmpresa.responsavel_nome || '',
    responsavel_cpf: dadosEmpresa.responsavel_cpf || '',
    responsavel_cargo: dadosEmpresa.responsavel_cargo || '',
    logo: dadosEmpresa.logo || undefined,
  } : undefined;

  // Usar hook personalizado para reset do formulário
  useFormReset({
    show,
    initialData: initialFormData,
    setFormData: setDados,
    customData: customFormData
  });

  const handleInputChange = (field: keyof DadosEmpresaType, value: string) => {
    // Aplicar formatação baseada no campo
    let formattedValue = value;
    if (field === 'cnpj' && typeof value === 'string') {
      formattedValue = formatCNPJ(value);
    } else if ((field === 'telefone' || field === 'celular') && typeof value === 'string') {
      formattedValue = formatPhone(value);
    } else if (field === 'cep' && typeof value === 'string') {
      formattedValue = formatCEP(value);
    } else if (field === 'responsavel_cpf' && typeof value === 'string') {
      formattedValue = formatCPF(value);
    }

    setDados(prev => ({
      ...prev,
      [field]: formattedValue || '' // Garantir que nunca seja null
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateDadosMutation.mutate(dados);
  };

  const handleCancel = () => {
    if (dadosEmpresa) {
      setDados(dadosEmpresa as DadosEmpresaType);
    }
    onClose();
  };

  const onLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
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

  if (isLoading) {
    return (
      <DraggableModal
        show={show}
        onClose={onClose}
        title="Empresa"
        size="xl"
        modalId="dados-empresa-modal-loading"
      >
        <div className="text-center p-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      </DraggableModal>
    );
  }

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
        <div className="mb-4">
          <div className="row">
            <div className="col-md-6">
              <FormField
                name="razao_social"
                type="text"
                label="Razão Social"
                placeholder="Nome da empresa"
                required={true}
                size="md"
                value={dados.razao_social}
                onChange={(value) => handleInputChange('razao_social', value)}
                disabled={updateDadosMutation.isPending}
              />
            </div>
            <div className="col-md-6">
              <FormField
                name="nome_fantasia"
                type="text"
                label="Nome Fantasia"
                placeholder="Nome fantasia da empresa"
                size="md"
                value={dados.nome_fantasia}
                onChange={(value) => handleInputChange('nome_fantasia', value)}
                disabled={updateDadosMutation.isPending}
              />
            </div>
          </div>

          <div className="row">
            <div className="col-md-4">
              <FormField
                name="cnpj"
                type="text"
                label="CNPJ"
                placeholder="00.000.000/0000-00"
                required={true}
                size="md"
                value={dados.cnpj}
                onChange={(value) => handleInputChange('cnpj', value)}
                disabled={updateDadosMutation.isPending}
              />
            </div>
            <div className="col-md-4">
              <FormField
                name="inscricao_estadual"
                type="text"
                label="Inscrição Estadual"
                placeholder="Inscrição estadual"
                size="md"
                value={dados.inscricao_estadual}
                onChange={(value) => handleInputChange('inscricao_estadual', value)}
                disabled={updateDadosMutation.isPending}
              />
            </div>
            <div className="col-md-4">
              <FormField
                name="inscricao_municipal"
                type="text"
                label="Inscrição Municipal"
                placeholder="Inscrição municipal"
                size="md"
                value={dados.inscricao_municipal}
                onChange={(value) => handleInputChange('inscricao_municipal', value)}
                disabled={updateDadosMutation.isPending}
              />
            </div>
          </div>

          {/* Logo da Empresa */}
          <div className="row mt-4 pt-3 border-top">
            <div className="col-md-12">
              <label htmlFor="logo" className="form-label small fw-bold">Logo da Empresa</label>
              <div className="d-flex align-items-start gap-3">
                <div style={{ minWidth: '200px' }}>
                  {dados.logo ? (
                    <img 
                      src={dados.logo} 
                      alt="Logo da empresa" 
                      style={{ maxWidth: '200px', maxHeight: '100px', objectFit: 'contain' }}
                      className="border rounded p-2 bg-light"
                    />
                  ) : (
                    <div 
                      className="border rounded p-2 bg-light text-center text-secondary"
                      style={{ width: '200px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <div>
                        <i className="bi bi-image" style={{ fontSize: '2rem' }}></i>
                        <div className="small">Sem logo</div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex-grow-1">
                  <FormField
                    name="logo"
                    type="file"
                    value=""
                    onChange={onLogoChange}
                    disabled={updateDadosMutation.isPending}
                    accept="image/*"
                    helpText="Formatos aceitos: JPG, PNG, GIF (máx. 2MB)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Aba de Endereço */}
        {activeTab === 'endereco' && (
        <div className="mb-4">
          <AddressFields 
            required={false}
            size="md"
            formData={dados}
            onChange={(name: string, value: any) => handleInputChange(name as keyof DadosEmpresaType, value)}
            errors={{}}
          />
        </div>
        )}

        {/* Aba de Contato */}
        {activeTab === 'contato' && (
        <div className="mb-4">
          <div className="row">
            <div className="col-md-4">
              <FormField
                name="telefone"
                type="tel"
                label="Telefone"
                placeholder="(11) 3333-4444"
                size="md"
                value={dados.telefone}
                onChange={(value) => handleInputChange('telefone', value)}
                disabled={updateDadosMutation.isPending}
              />
            </div>
            <div className="col-md-4">
              <FormField
                name="celular"
                type="tel"
                label="Celular"
                placeholder="(11) 99999-9999"
                size="md"
                value={dados.celular}
                onChange={(value) => handleInputChange('celular', value)}
                disabled={updateDadosMutation.isPending}
              />
            </div>
            <div className="col-md-4">
              <FormField
                name="email"
                type="email"
                label="E-mail"
                placeholder="email@empresa.com"
                size="md"
                value={dados.email}
                onChange={(value) => handleInputChange('email', value)}
                disabled={updateDadosMutation.isPending}
              />
            </div>
          </div>

          <div className="row">
            <div className="col-md-12">
              <FormField
                name="site"
                type="url"
                label="Site"
                placeholder="https://www.empresa.com"
                size="md"
                value={dados.site}
                onChange={(value) => handleInputChange('site', value)}
                disabled={updateDadosMutation.isPending}
              />
            </div>
          </div>
        </div>
        )}

        {/* Aba de Responsável */}
        {activeTab === 'responsavel' && (
        <div className="mb-4">
          <div className="row">
            <div className="col-md-4">
              <FormField
                name="responsavel_nome"
                type="text"
                label="Nome"
                placeholder="Nome do responsável"
                size="md"
                value={dados.responsavel_nome}
                onChange={(value) => handleInputChange('responsavel_nome', value)}
                disabled={updateDadosMutation.isPending}
              />
            </div>
            <div className="col-md-4">
              <FormField
                name="responsavel_cpf"
                type="text"
                label="CPF"
                placeholder="000.000.000-00"
                size="md"
                value={dados.responsavel_cpf}
                onChange={(value) => handleInputChange('responsavel_cpf', value)}
                disabled={updateDadosMutation.isPending}
              />
            </div>
            <div className="col-md-4">
              <FormField
                name="responsavel_cargo"
                type="text"
                label="Cargo"
                placeholder="Cargo do responsável"
                size="md"
                value={dados.responsavel_cargo}
                onChange={(value) => handleInputChange('responsavel_cargo', value)}
                disabled={updateDadosMutation.isPending}
              />
            </div>
          </div>
        </div>
        )}

      </form>
    </DraggableModal>
  );
};

export default DadosEmpresaModal;

