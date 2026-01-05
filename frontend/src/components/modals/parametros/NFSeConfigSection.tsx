import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NFSeConfigService, type NFSeConfigUpdate } from '@/services/nfseConfigService';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';

interface NFSeConfigSectionProps {
  disabled?: boolean;
}

const NFSeConfigSection: React.FC<NFSeConfigSectionProps> = ({ disabled = false }) => {
  const { success, error: showError } = useNotificationContext();
  const queryClient = useQueryClient();

  // Estado dos campos
  const [formData, setFormData] = useState({
    codigo_servico_municipal: '',
    aliquota_iss: '0',
    descricao_servico: '',
    serie_nf: '80000',
    numero_dps: '1',
    portal_nacional_username: '',
    portal_nacional_password: '',
    portal_nacional_base_url: 'https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional',
    portal_nacional_ambiente: 'HOMOLOGACAO' as 'HOMOLOGACAO' | 'PRODUCAO',
    asaas_api_key: '',
    asaas_sandbox: false,
    provider: 'PORTAL_NACIONAL' as 'PORTAL_NACIONAL' | 'ASAAS'
  });

  // Buscar configuração existente
  const { data: configData, isLoading, refetch } = useQuery({
    queryKey: ['nfse-config'],
    queryFn: async () => {
      const response = await NFSeConfigService.get();
      if (!response.success) {
        throw new Error(response.message || 'Erro ao carregar configuração');
      }
      return response.data;
    },
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false
  });

  // Preencher formulário quando configuração carregar
  useEffect(() => {
    if (configData) {
      setFormData({
        codigo_servico_municipal: configData.codigo_servico_municipal || '',
        aliquota_iss: String(configData.aliquota_iss || 0),
        descricao_servico: configData.descricao_servico || '',
        serie_nf: configData.serie_nf || '80000',
        numero_dps: String(configData.numero_dps || 1),
        portal_nacional_username: configData.portal_nacional_username || '',
        portal_nacional_password: configData.portal_nacional_password || '',
        portal_nacional_base_url: configData.portal_nacional_base_url || 'https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional',
        portal_nacional_ambiente: configData.portal_nacional_ambiente || 'HOMOLOGACAO',
        asaas_api_key: configData.asaas_api_key || '',
        asaas_sandbox: configData.asaas_sandbox || false,
        provider: configData.provider || 'PORTAL_NACIONAL'
      });
    }
  }, [configData]);

  // Mutation para testar autenticação/conexão
  const testAuthMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (data.provider === 'ASAAS') {
        if (!data.asaas_api_key) {
          throw new Error('API Key do Asaas é obrigatória para testar conexão');
        }

        const response = await NFSeConfigService.testAuth({
          provider: 'ASAAS',
          asaas_api_key: data.asaas_api_key,
          asaas_sandbox: data.asaas_sandbox
        });
        
        if (!response.success) {
          const errorMessage = response.message || 'Erro ao testar conexão';
          throw new Error(errorMessage);
        }
        
        return response.data;
      } else if (data.provider === 'PORTAL_NACIONAL') {
        if (!data.portal_nacional_username || !data.portal_nacional_password) {
          throw new Error('Usuário e senha são obrigatórios para testar autenticação');
        }

        const response = await NFSeConfigService.testAuth({
          provider: 'PORTAL_NACIONAL',
          portal_nacional_username: data.portal_nacional_username,
          portal_nacional_password: data.portal_nacional_password,
          portal_nacional_ambiente: data.portal_nacional_ambiente
        });
        
        if (!response.success) {
          const errorMessage = response.message || 'Erro ao testar autenticação';
          throw new Error(errorMessage);
        }
        
        return response.data;
      } else {
        throw new Error('Selecione um provedor para testar a conexão');
      }
    },
    onSuccess: () => {
      success(formData.provider === 'ASAAS' 
        ? 'Conexão com Asaas testada com sucesso! A API Key está válida.'
        : 'Autenticação testada com sucesso! As credenciais estão corretas.');
    },
    onError: (error: Error) => {
      const errorMessage = error?.message || 'Erro ao testar conexão';
      showError(errorMessage);
    }
  });

  // Mutation para salvar configuração
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const updateData: NFSeConfigUpdate = {
        codigo_servico_municipal: data.codigo_servico_municipal || null,
        aliquota_iss: parseFloat(data.aliquota_iss) || 0,
        descricao_servico: data.descricao_servico || null,
        serie_nf: data.serie_nf || null,
        numero_dps: data.numero_dps ? parseInt(data.numero_dps, 10) : null,
        portal_nacional_username: data.portal_nacional_username || null,
        portal_nacional_password: data.portal_nacional_password || null,
        portal_nacional_base_url: data.portal_nacional_base_url || 'https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional',
        portal_nacional_ambiente: data.portal_nacional_ambiente,
        asaas_api_key: data.asaas_api_key || null,
        asaas_sandbox: data.asaas_sandbox,
        provider: data.provider
      };

      const response = await NFSeConfigService.update(updateData);
      
      if (!response.success) {
        const errorMessage = response.message || response.errors || 'Erro ao salvar configuração';
        throw new Error(typeof errorMessage === 'string' ? errorMessage : 'Erro ao salvar configuração');
      }
      
      return response.data;
    },
    onSuccess: async () => {
      success('Configurações de NFS-e salvas com sucesso!');
      await queryClient.invalidateQueries({ queryKey: ['nfse-config'] });
      await refetch();
    },
    onError: (error: Error) => {
      const errorMessage = error?.message || 'Erro ao salvar configurações de NFS-e';
      showError(errorMessage);
    }
  });

  const handleInputChange = (field: keyof typeof formData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="card mb-3">
        <div className="card-header">
          <h6 className="mb-0">NFS-e</h6>
        </div>
        <div className="card-body">
          <div className="text-center p-3">
            <div className="spinner-border spinner-border-sm text-primary" role="status">
              <span className="visually-hidden">Carregando...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card mb-3">
      <div className="card-header">
        <h6 className="mb-0">NFS-e</h6>
      </div>
      <div className="card-body">
        <form onSubmit={handleSave}>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label htmlFor="nfse_codigo_servico" className="form-label">
                Código de Serviço Municipal
              </label>
              <input
                type="text"
                className="form-control"
                id="nfse_codigo_servico"
                value={formData.codigo_servico_municipal}
                onChange={(e) => handleInputChange('codigo_servico_municipal', e.target.value)}
                disabled={disabled || saveMutation.isPending}
                placeholder="Ex: 1401"
              />
              <small className="text-muted d-block mt-1">
                Código da lista de serviços do município (ex: 1401 para serviços de TI)
              </small>
            </div>

            <div className="col-md-6 mb-3">
              <label htmlFor="nfse_aliquota_iss" className="form-label">
                Alíquota de ISS (%)
              </label>
              <input
                type="number"
                className="form-control"
                id="nfse_aliquota_iss"
                value={formData.aliquota_iss}
                onChange={(e) => handleInputChange('aliquota_iss', e.target.value)}
                disabled={disabled || saveMutation.isPending}
                min="0"
                max="100"
                step="0.01"
                placeholder="0.00"
              />
              <small className="text-muted d-block mt-1">
                Alíquota padrão de ISS para as notas fiscais (0 a 100)
              </small>
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="nfse_descricao_servico" className="form-label">
              Descrição do Serviço
            </label>
            <textarea
              className="form-control"
              id="nfse_descricao_servico"
              rows={3}
              value={formData.descricao_servico}
              onChange={(e) => handleInputChange('descricao_servico', e.target.value)}
              disabled={disabled || saveMutation.isPending}
              placeholder="Ex: Prestação de serviços de desenvolvimento de software"
            />
            <small className="text-muted d-block mt-1">
              Descrição padrão do serviço prestado nas notas fiscais
            </small>
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label htmlFor="nfse_serie_nf" className="form-label">
                Série da NF
              </label>
              <input
                type="text"
                className="form-control"
                id="nfse_serie_nf"
                value={formData.serie_nf}
                onChange={(e) => handleInputChange('serie_nf', e.target.value)}
                disabled={disabled || saveMutation.isPending}
                placeholder="80000"
                maxLength={10}
              />
              <small className="text-muted d-block mt-1">
                Série da NF (permitida: 80000 a 89999)
              </small>
            </div>

            <div className="col-md-6 mb-3">
              <label htmlFor="nfse_numero_dps" className="form-label">
                Número do DPS
              </label>
              <input
                type="number"
                className="form-control"
                id="nfse_numero_dps"
                value={formData.numero_dps}
                onChange={(e) => handleInputChange('numero_dps', e.target.value)}
                disabled={disabled || saveMutation.isPending}
                min="1"
                placeholder="1"
              />
              <small className="text-muted d-block mt-1">
                Número do DPS (Documento de Prestação de Serviços)
              </small>
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="nfse_provider" className="form-label">
              Provedor de NFS-e
            </label>
            <select
              className="form-control"
              id="nfse_provider"
              value={formData.provider}
              onChange={(e) => handleInputChange('provider', e.target.value as 'PORTAL_NACIONAL' | 'ASAAS')}
              disabled={disabled || saveMutation.isPending}
            >
              <option value="ASAAS">Asaas</option>
              <option value="PORTAL_NACIONAL">Portal Nacional</option>
            </select>
            <small className="text-muted d-block mt-1">
              Selecione o provedor que será usado para emitir as notas fiscais
            </small>
          </div>

          {formData.provider === 'ASAAS' && (
            <>
              <div className="mb-3">
                <label htmlFor="nfse_asaas_api_key" className="form-label">
                  API Key do Asaas
                </label>
                <input
                  type="password"
                  className="form-control"
                  id="nfse_asaas_api_key"
                  value={formData.asaas_api_key}
                  onChange={(e) => handleInputChange('asaas_api_key', e.target.value)}
                  disabled={disabled || saveMutation.isPending}
                  placeholder="Token da API Asaas"
                />
                <small className="text-muted d-block mt-1">
                  Token da API do Asaas disponível no painel administrativo (Configurações &gt; Integrações &gt; API Key)
                </small>
              </div>

              <div className="mb-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="nfse_asaas_sandbox"
                    checked={formData.asaas_sandbox}
                    onChange={(e) => handleInputChange('asaas_sandbox', e.target.checked)}
                    disabled={disabled || saveMutation.isPending}
                  />
                  <label className="form-check-label" htmlFor="nfse_asaas_sandbox">
                    Usar ambiente Sandbox
                  </label>
                </div>
                <small className="text-muted d-block mt-1">
                  Marque para usar o ambiente de testes do Asaas
                </small>
              </div>
            </>
          )}

          {formData.provider === 'PORTAL_NACIONAL' && (
            <>
              <div className="row">
              <div className="col-md-6 mb-3">
                <label htmlFor="nfse_portal_username" className="form-label">
                  Usuário
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="nfse_portal_username"
                  value={formData.portal_nacional_username}
                  onChange={(e) => handleInputChange('portal_nacional_username', e.target.value)}
                  disabled={disabled || saveMutation.isPending}
                  placeholder="Usuário do Portal Nacional"
                />
              </div>

              <div className="col-md-6 mb-3">
                <label htmlFor="nfse_portal_password" className="form-label">
                  Senha
                </label>
                <input
                  type="password"
                  className="form-control"
                  id="nfse_portal_password"
                  value={formData.portal_nacional_password}
                  onChange={(e) => handleInputChange('portal_nacional_password', e.target.value)}
                  disabled={disabled || saveMutation.isPending}
                  placeholder="Senha do Portal Nacional"
                />
              </div>
            </div>

            <div className="row">
              <div className="col-md-8 mb-3">
                <label htmlFor="nfse_portal_base_url" className="form-label">
                  URL Base da API
                </label>
                <input
                  type="url"
                  className="form-control"
                  id="nfse_portal_base_url"
                  value={formData.portal_nacional_base_url}
                  onChange={(e) => handleInputChange('portal_nacional_base_url', e.target.value)}
                  disabled={disabled || saveMutation.isPending}
                  placeholder="https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional"
                />
              </div>

              <div className="col-md-4 mb-3">
                <label htmlFor="nfse_portal_ambiente" className="form-label">
                  Ambiente
                </label>
                <select
                  className="form-control"
                  id="nfse_portal_ambiente"
                  value={formData.portal_nacional_ambiente}
                  onChange={(e) => handleInputChange('portal_nacional_ambiente', e.target.value as 'HOMOLOGACAO' | 'PRODUCAO')}
                  disabled={disabled || saveMutation.isPending}
                >
                  <option value="HOMOLOGACAO">Homologação</option>
                  <option value="PRODUCAO">Produção</option>
                </select>
              </div>
            </div>
            </>
          )}

          <div className="d-flex justify-content-between align-items-center">
            {(formData.provider === 'PORTAL_NACIONAL' || formData.provider === 'ASAAS') && (
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => testAuthMutation.mutate(formData)}
                disabled={
                  disabled || 
                  testAuthMutation.isPending || 
                  (formData.provider === 'PORTAL_NACIONAL' && (!formData.portal_nacional_username || !formData.portal_nacional_password)) ||
                  (formData.provider === 'ASAAS' && !formData.asaas_api_key)
                }
              >
                {testAuthMutation.isPending ? 'Testando...' : formData.provider === 'ASAAS' ? 'Testar Conexão' : 'Testar Autenticação'}
              </button>
            )}
            
            <button
              type="submit"
              className="btn btn-primary"
              disabled={disabled || saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Salvando...' : 'Salvar Configurações NFS-e'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NFSeConfigSection;
