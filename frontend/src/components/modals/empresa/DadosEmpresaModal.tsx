import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DadosEmpresaService, DadosEmpresa as DadosEmpresaType } from '../../../services/dadosEmpresaService';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import DraggableModal from '../../common/DraggableModal';
import { useFormReset } from '../../../hooks/useFormReset';

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
    enabled: show
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
    setDados(prev => ({
      ...prev,
      [field]: value || '' // Garantir que nunca seja null
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
      <form id="empresa-form" onSubmit={handleSubmit}>
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
              <div className="mb-3">
                <label htmlFor="razao_social" className="form-label small">Razão Social *</label>
                <input
                  type="text"
                  className="form-control"
                  id="razao_social"
                  name="razao_social"
                  autoComplete="organization"
                  value={dados.razao_social}
                  onChange={(e) => handleInputChange('razao_social', e.target.value)}
                  disabled={updateDadosMutation.isPending}
                  required
                />
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="nome_fantasia" className="form-label small">Nome Fantasia</label>
                <input
                  type="text"
                  className="form-control"
                  id="nome_fantasia"
                  name="nome_fantasia"
                  value={dados.nome_fantasia}
                  onChange={(e) => handleInputChange('nome_fantasia', e.target.value)}
                  disabled={updateDadosMutation.isPending}
                />
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-4">
              <div className="mb-3">
                <label htmlFor="cnpj" className="form-label small">CNPJ *</label>
                <input
                  type="text"
                  className="form-control"
                  id="cnpj"
                  name="cnpj"
                  value={dados.cnpj}
                  onChange={(e) => handleInputChange('cnpj', e.target.value)}
                  disabled={updateDadosMutation.isPending}
                  required
                />
              </div>
            </div>
            <div className="col-md-4">
              <div className="mb-3">
                <label htmlFor="inscricao_estadual" className="form-label small">Inscrição Estadual</label>
                <input
                  type="text"
                  className="form-control"
                  id="inscricao_estadual"
                  name="inscricao_estadual"
                  value={dados.inscricao_estadual}
                  onChange={(e) => handleInputChange('inscricao_estadual', e.target.value)}
                  disabled={updateDadosMutation.isPending}
                />
              </div>
            </div>
            <div className="col-md-4">
              <div className="mb-3">
                <label htmlFor="inscricao_municipal" className="form-label small">Inscrição Municipal</label>
                <input
                  type="text"
                  className="form-control"
                  id="inscricao_municipal"
                  name="inscricao_municipal"
                  value={dados.inscricao_municipal}
                  onChange={(e) => handleInputChange('inscricao_municipal', e.target.value)}
                  disabled={updateDadosMutation.isPending}
                />
              </div>
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
                  <input
                    type="file"
                    className="form-control"
                    id="logo"
                    name="logo"
                    accept="image/*"
                    onChange={onLogoChange}
                    disabled={updateDadosMutation.isPending}
                  />
                  <small className="text-secondary text-secondary">
                    Formatos aceitos: JPG, PNG, GIF (máx. 2MB)
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Aba de Endereço */}
        {activeTab === 'endereco' && (
        <div className="mb-4">
          <div className="row">
            <div className="col-md-3">
              <div className="mb-3">
                <label htmlFor="cep" className="form-label small">CEP</label>
                <input
                  type="text"
                  className="form-control"
                  id="cep"
                  name="cep"
                  autoComplete="postal-code"
                  value={dados.cep}
                  onChange={(e) => handleInputChange('cep', e.target.value)}
                  disabled={updateDadosMutation.isPending}
                />
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="endereco" className="form-label small">Endereço</label>
                <input
                  type="text"
                  className="form-control"
                  id="endereco"
                  name="endereco"
                  autoComplete="street-address"
                  value={dados.endereco}
                  onChange={(e) => handleInputChange('endereco', e.target.value)}
                  disabled={updateDadosMutation.isPending}
                />
              </div>
            </div>
            <div className="col-md-3">
              <div className="mb-3">
                <label htmlFor="numero" className="form-label small">Número</label>
                <input
                  type="text"
                  className="form-control"
                  id="numero"
                  name="numero"
                  value={dados.numero}
                  onChange={(e) => handleInputChange('numero', e.target.value)}
                  disabled={updateDadosMutation.isPending}
                />
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-4">
              <div className="mb-3">
                <label htmlFor="complemento" className="form-label small">Complemento</label>
                <input
                  type="text"
                  className="form-control"
                  id="complemento"
                  name="complemento"
                  value={dados.complemento}
                  onChange={(e) => handleInputChange('complemento', e.target.value)}
                  disabled={updateDadosMutation.isPending}
                />
              </div>
            </div>
            <div className="col-md-4">
              <div className="mb-3">
                <label htmlFor="bairro" className="form-label small">Bairro</label>
                <input
                  type="text"
                  className="form-control"
                  id="bairro"
                  name="bairro"
                  value={dados.bairro}
                  onChange={(e) => handleInputChange('bairro', e.target.value)}
                  disabled={updateDadosMutation.isPending}
                />
              </div>
            </div>
            <div className="col-md-4">
              <div className="mb-3">
                <label htmlFor="cidade" className="form-label small">Cidade</label>
                <input
                  type="text"
                  className="form-control"
                  id="cidade"
                  name="cidade"
                  autoComplete="address-level2"
                  value={dados.cidade}
                  onChange={(e) => handleInputChange('cidade', e.target.value)}
                  disabled={updateDadosMutation.isPending}
                />
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-2">
              <div className="mb-3">
                <label htmlFor="estado" className="form-label small">Estado</label>
                <input
                  type="text"
                  className="form-control"
                  id="estado"
                  name="estado"
                  autoComplete="address-level1"
                  value={dados.estado}
                  onChange={(e) => handleInputChange('estado', e.target.value)}
                  disabled={updateDadosMutation.isPending}
                  maxLength={2}
                />
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Aba de Contato */}
        {activeTab === 'contato' && (
        <div className="mb-4">
          <div className="row">
            <div className="col-md-4">
              <div className="mb-3">
                <label htmlFor="telefone" className="form-label small">Telefone</label>
                <input
                  type="text"
                  className="form-control"
                  id="telefone"
                  name="telefone"
                  autoComplete="tel"
                  value={dados.telefone}
                  onChange={(e) => handleInputChange('telefone', e.target.value)}
                  disabled={updateDadosMutation.isPending}
                />
              </div>
            </div>
            <div className="col-md-4">
              <div className="mb-3">
                <label htmlFor="celular" className="form-label small">Celular</label>
                <input
                  type="text"
                  className="form-control"
                  id="celular"
                  name="celular"
                  autoComplete="tel"
                  value={dados.celular}
                  onChange={(e) => handleInputChange('celular', e.target.value)}
                  disabled={updateDadosMutation.isPending}
                />
              </div>
            </div>
            <div className="col-md-4">
              <div className="mb-3">
                <label htmlFor="email" className="form-label small">E-mail</label>
                <input
                  type="email"
                  className="form-control"
                  id="email"
                  name="email"
                  autoComplete="email"
                  value={dados.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={updateDadosMutation.isPending}
                />
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-12">
              <div className="mb-3">
                <label htmlFor="site" className="form-label small">Site</label>
                <input
                  type="url"
                  className="form-control"
                  id="site"
                  name="site"
                  autoComplete="url"
                  value={dados.site}
                  onChange={(e) => handleInputChange('site', e.target.value)}
                  disabled={updateDadosMutation.isPending}
                />
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Aba de Responsável */}
        {activeTab === 'responsavel' && (
        <div className="mb-4">
          <div className="row">
            <div className="col-md-4">
              <div className="mb-3">
                <label htmlFor="responsavel_nome" className="form-label small">Nome</label>
                <input
                  type="text"
                  className="form-control"
                  id="responsavel_nome"
                  name="responsavel_nome"
                  autoComplete="name"
                  value={dados.responsavel_nome}
                  onChange={(e) => handleInputChange('responsavel_nome', e.target.value)}
                  disabled={updateDadosMutation.isPending}
                />
              </div>
            </div>
            <div className="col-md-4">
              <div className="mb-3">
                <label htmlFor="responsavel_cpf" className="form-label small">CPF</label>
                <input
                  type="text"
                  className="form-control"
                  id="responsavel_cpf"
                  name="responsavel_cpf"
                  value={dados.responsavel_cpf}
                  onChange={(e) => handleInputChange('responsavel_cpf', e.target.value)}
                  disabled={updateDadosMutation.isPending}
                />
              </div>
            </div>
            <div className="col-md-4">
              <div className="mb-3">
                <label htmlFor="responsavel_cargo" className="form-label small">Cargo</label>
                <input
                  type="text"
                  className="form-control"
                  id="responsavel_cargo"
                  name="responsavel_cargo"
                  autoComplete="organization-title"
                  value={dados.responsavel_cargo}
                  onChange={(e) => handleInputChange('responsavel_cargo', e.target.value)}
                  disabled={updateDadosMutation.isPending}
                />
              </div>
            </div>
          </div>
        </div>
        )}

      </form>
    </DraggableModal>
  );
};

export default DadosEmpresaModal;

