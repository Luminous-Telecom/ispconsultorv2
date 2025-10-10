import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DadosEmpresaService, DadosEmpresa as DadosEmpresaType } from '../../../services/dadosEmpresaService';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import DraggableModal from '../../common/DraggableModal';

interface DadosEmpresaModalProps {
  show: boolean;
  onClose: () => void;
}

const DadosEmpresaModal: React.FC<DadosEmpresaModalProps> = ({
  show,
  onClose
}) => {
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

  if (isLoading) {
    return (
      <DraggableModal
        show={show}
        onClose={onClose}
        title="Dados da Empresa"
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
      title="Dados da Empresa"
      size="xl"
    >
      <form onSubmit={handleSubmit}>
        {/* Informações Básicas */}
        <div className="mb-4">
          <h6 className="border-bottom pb-2 mb-3">Informações Básicas</h6>
          <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="razao_social" className="form-label small">Razão Social *</label>
                <input
                  type="text"
                  className="form-control"
                  id="razao_social"
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
                  value={dados.inscricao_municipal}
                  onChange={(e) => handleInputChange('inscricao_municipal', e.target.value)}
                  disabled={updateDadosMutation.isPending}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div className="mb-4">
          <h6 className="border-bottom pb-2 mb-3">Endereço</h6>
          <div className="row">
            <div className="col-md-3">
              <div className="mb-3">
                <label htmlFor="cep" className="form-label small">CEP</label>
                <input
                  type="text"
                  className="form-control"
                  id="cep"
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
                  value={dados.estado}
                  onChange={(e) => handleInputChange('estado', e.target.value)}
                  disabled={updateDadosMutation.isPending}
                  maxLength={2}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Contato */}
        <div className="mb-4">
          <h6 className="border-bottom pb-2 mb-3">Contato</h6>
          <div className="row">
            <div className="col-md-4">
              <div className="mb-3">
                <label htmlFor="telefone" className="form-label small">Telefone</label>
                <input
                  type="text"
                  className="form-control"
                  id="telefone"
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
                  value={dados.site}
                  onChange={(e) => handleInputChange('site', e.target.value)}
                  disabled={updateDadosMutation.isPending}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Responsável */}
        <div className="mb-4">
          <h6 className="border-bottom pb-2 mb-3">Responsável Legal</h6>
          <div className="row">
            <div className="col-md-4">
              <div className="mb-3">
                <label htmlFor="responsavel_nome" className="form-label small">Nome</label>
                <input
                  type="text"
                  className="form-control"
                  id="responsavel_nome"
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
                  value={dados.responsavel_cargo}
                  onChange={(e) => handleInputChange('responsavel_cargo', e.target.value)}
                  disabled={updateDadosMutation.isPending}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="d-flex justify-content-end gap-2">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCancel}
            disabled={updateDadosMutation.isPending}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={updateDadosMutation.isPending}
          >
            {updateDadosMutation.isPending ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Salvando...
              </>
            ) : (
              <>
                <i className="bi bi-check-lg me-1"></i>
                Salvar Alterações
              </>
            )}
          </button>
        </div>
      </form>
    </DraggableModal>
  );
};

export default DadosEmpresaModal;

