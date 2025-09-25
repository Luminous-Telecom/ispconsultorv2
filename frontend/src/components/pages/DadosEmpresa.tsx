import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { DadosEmpresaService, DadosEmpresa as DadosEmpresaType, UpdateDadosEmpresa } from '../../services/dadosEmpresaService';
import { useNotificationContext } from '../../contexts/NotificationContext';

const DadosEmpresa: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const { success, error } = useNotificationContext();

  // Query para buscar dados da empresa
  const { data: dadosEmpresa, isLoading, refetch } = useQuery({
    queryKey: ['dados-empresa'],
    queryFn: () => DadosEmpresaService.get(),
    placeholderData: (previousData) => previousData,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Mutation para atualizar dados da empresa
  const updateDadosMutation = useMutation({
    mutationFn: (data: UpdateDadosEmpresa) => DadosEmpresaService.update(data),
    onSuccess: () => {
      success('Dados da empresa atualizados com sucesso!');
      setIsEditing(false);
      refetch();
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Erro ao atualizar dados da empresa');
    }
  });

  const [dados, setDados] = useState<DadosEmpresaType>({
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
  });

  // Carregar dados quando disponíveis
  useEffect(() => {
    if (dadosEmpresa) {
      setDados(dadosEmpresa as DadosEmpresaType);
    }
  }, [dadosEmpresa]);

  const handleInputChange = (field: keyof DadosEmpresaType, value: string) => {
    setDados(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    updateDadosMutation.mutate(dados);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (dadosEmpresa) {
      setDados(dadosEmpresa as DadosEmpresaType);
    }
  };

  const onLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      const resp = await DadosEmpresaService.uploadLogo(file);
      if (resp?.success && resp.logo) {
        setDados(prev => ({ ...prev, logo: resp.logo }));
        success('Logo atualizada com sucesso!');
      } else {
        error('Não foi possível atualizar a logo');
      }
    } catch (err) {
      console.error('Erro no upload da logo:', err);
      error('Erro ao enviar a logo');
    }
  };

  return (
    <>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">Dados da Empresa</h1>
        <div className="btn-group" role="group">
          {!isEditing ? (
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={() => setIsEditing(true)}
              disabled={isLoading}
            >
              <i className="bi bi-pencil"></i> Editar Dados
            </button>
          ) : (
            <>
              <button 
                type="button" 
                className="btn btn-success"
                onClick={handleSave}
                disabled={updateDadosMutation.isPending}
              >
                <i className="bi bi-check"></i> Salvar
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={handleCancel}
                disabled={updateDadosMutation.isPending}
              >
                <i className="bi bi-x"></i> Cancelar
              </button>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      ) : (
        <div className="row">
          <div className="col-lg-8">
            <div className="card shadow">
              <div className="card-header py-3" style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #e3e6f0' }}>
                <h6 className="m-0 font-weight-bold text-primary" style={{ fontWeight: 'bold', color: '#007bff' }}>
                  Informações da Empresa
                </h6>
              </div>
              <div className="card-body">
                <form>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="razao_social" className="form-label">
                          Razão Social <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          id="razao_social"
                          value={dados.razao_social ?? ''}
                          onChange={(e) => handleInputChange('razao_social', e.target.value)}
                          disabled={!isEditing}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="nome_fantasia" className="form-label">Nome Fantasia</label>
                        <input
                          type="text"
                          className="form-control"
                          id="nome_fantasia"
                          value={dados.nome_fantasia ?? ''}
                          onChange={(e) => handleInputChange('nome_fantasia', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="cnpj" className="form-label">
                          CNPJ <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          id="cnpj"
                          value={dados.cnpj ?? ''}
                          onChange={(e) => handleInputChange('cnpj', e.target.value)}
                          disabled={!isEditing}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="inscricao_estadual" className="form-label">Inscrição Estadual</label>
                        <input
                          type="text"
                          className="form-control"
                          id="inscricao_estadual"
                          value={dados.inscricao_estadual ?? ''}
                          onChange={(e) => handleInputChange('inscricao_estadual', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="inscricao_municipal" className="form-label">Inscrição Municipal</label>
                        <input
                          type="text"
                          className="form-control"
                          id="inscricao_municipal"
                          value={dados.inscricao_municipal ?? ''}
                          onChange={(e) => handleInputChange('inscricao_municipal', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="telefone" className="form-label">Telefone</label>
                        <input
                          type="tel"
                          className="form-control"
                          id="telefone"
                          value={dados.telefone ?? ''}
                          onChange={(e) => handleInputChange('telefone', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="celular" className="form-label">Celular</label>
                        <input
                          type="tel"
                          className="form-control"
                          id="celular"
                          value={dados.celular ?? ''}
                          onChange={(e) => handleInputChange('celular', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="email" className="form-label">
                          Email <span className="text-danger">*</span>
                        </label>
                        <input
                          type="email"
                          className="form-control"
                          id="email"
                          value={dados.email ?? ''}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          disabled={!isEditing}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="site" className="form-label">Site</label>
                        <input
                          type="url"
                          className="form-control"
                          id="site"
                          value={dados.site ?? ''}
                          onChange={(e) => handleInputChange('site', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                  </div>

                  <hr className="my-4" />
                  <h5 className="mb-3">Endereço</h5>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="endereco" className="form-label">
                          Endereço <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          id="endereco"
                          value={dados.endereco ?? ''}
                          onChange={(e) => handleInputChange('endereco', e.target.value)}
                          disabled={!isEditing}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label htmlFor="numero" className="form-label">
                          Número <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          id="numero"
                          value={dados.numero ?? ''}
                          onChange={(e) => handleInputChange('numero', e.target.value)}
                          disabled={!isEditing}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label htmlFor="complemento" className="form-label">Complemento</label>
                        <input
                          type="text"
                          className="form-control"
                          id="complemento"
                          value={dados.complemento ?? ''}
                          onChange={(e) => handleInputChange('complemento', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label htmlFor="bairro" className="form-label">
                          Bairro <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          id="bairro"
                          value={dados.bairro ?? ''}
                          onChange={(e) => handleInputChange('bairro', e.target.value)}
                          disabled={!isEditing}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label htmlFor="cidade" className="form-label">
                          Cidade <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          id="cidade"
                          value={dados.cidade ?? ''}
                          onChange={(e) => handleInputChange('cidade', e.target.value)}
                          disabled={!isEditing}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-2">
                      <div className="mb-3">
                        <label htmlFor="estado" className="form-label">
                          Estado <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          id="estado"
                          value={dados.estado ?? ''}
                          onChange={(e) => handleInputChange('estado', e.target.value)}
                          disabled={!isEditing}
                          required
                        >
                          <option value="">UF</option>
                          <option value="AC">AC</option>
                          <option value="AL">AL</option>
                          <option value="AP">AP</option>
                          <option value="AM">AM</option>
                          <option value="BA">BA</option>
                          <option value="CE">CE</option>
                          <option value="DF">DF</option>
                          <option value="ES">ES</option>
                          <option value="GO">GO</option>
                          <option value="MA">MA</option>
                          <option value="MT">MT</option>
                          <option value="MS">MS</option>
                          <option value="MG">MG</option>
                          <option value="PA">PA</option>
                          <option value="PB">PB</option>
                          <option value="PR">PR</option>
                          <option value="PE">PE</option>
                          <option value="PI">PI</option>
                          <option value="RJ">RJ</option>
                          <option value="RN">RN</option>
                          <option value="RS">RS</option>
                          <option value="RO">RO</option>
                          <option value="RR">RR</option>
                          <option value="SC">SC</option>
                          <option value="SP">SP</option>
                          <option value="SE">SE</option>
                          <option value="TO">TO</option>
                        </select>
                      </div>
                    </div>
                    <div className="col-md-2">
                      <div className="mb-3">
                        <label htmlFor="cep" className="form-label">
                          CEP <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          id="cep"
                          value={dados.cep ?? ''}
                          onChange={(e) => handleInputChange('cep', e.target.value)}
                          disabled={!isEditing}
                          required
                        />
                      </div>
                    </div>

                  <hr className="my-4" />
                  <h5 className="mb-3">Responsável</h5>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="responsavel_nome" className="form-label">Nome</label>
                        <input
                          type="text"
                          className="form-control"
                          id="responsavel_nome"
                          value={dados.responsavel_nome ?? ''}
                          onChange={(e) => handleInputChange('responsavel_nome', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label htmlFor="responsavel_cpf" className="form-label">CPF</label>
                        <input
                          type="text"
                          className="form-control"
                          id="responsavel_cpf"
                          value={dados.responsavel_cpf ?? ''}
                          onChange={(e) => handleInputChange('responsavel_cpf', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label htmlFor="responsavel_cargo" className="form-label">Cargo</label>
                        <input
                          type="text"
                          className="form-control"
                          id="responsavel_cargo"
                          value={dados.responsavel_cargo ?? ''}
                          onChange={(e) => handleInputChange('responsavel_cargo', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                </form>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card shadow">
              <div className="card-header py-3" style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #e3e6f0' }}>
                <h6 className="m-0 font-weight-bold text-primary" style={{ fontWeight: 'bold', color: '#007bff' }}>
                  Logo da Empresa
                </h6>
              </div>
              <div className="card-body text-center">
                <div className="mb-3">
                  {dados.logo ? (
                    <img 
                      src={dados.logo} 
                      alt="Logo da empresa" 
                      className="img-fluid" 
                      style={{ maxHeight: '200px' }}
                    />
                  ) : (
                    <div className="bg-light border rounded p-5" style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div className="text-muted">
                        <i className="bi bi-image" style={{ fontSize: '3rem' }}></i>
                        <p className="mt-2 mb-0">Nenhuma logo cadastrada</p>
                      </div>
                    </div>
                  )}
                </div>
                {isEditing && (
                  <div className="d-grid gap-2">
                    <input 
                      type="file" 
                      className="form-control" 
                      accept="image/*"
                      id="logo"
                      onChange={onLogoChange}
                    />
                    <label htmlFor="logo" className="btn btn-outline-primary">
                      <i className="bi bi-upload"></i> Alterar Logo
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DadosEmpresa;
