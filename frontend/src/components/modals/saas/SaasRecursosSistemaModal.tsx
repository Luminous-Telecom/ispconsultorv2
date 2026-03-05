/**
 * Recursos do Sistema - isolado para SaaS (usa saas_parametros)
 */
import React, { useState, useMemo, useLayoutEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { SaasParametrosService } from '@/services/saas/saasParametrosService';
import { useFormReset } from '@/hooks/useFormReset';
import DraggableModal from '@/components/common/DraggableModal';
import { Button } from '@/components/ui';

interface Props {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  onHeaderActionsReady?: (actions: React.ReactNode) => void;
}

interface ParametrosForm {
  validar_cpf_cnpj: boolean;
  validar_cep: boolean;
  titulos_vence_sabado: boolean;
  titulos_vence_domingo: boolean;
  manter_numeros_titulos: boolean;
  quantidade_titulos_manter: number;
  central_assinante_metodo_login: string;
}

const INITIAL: ParametrosForm = {
  validar_cpf_cnpj: true,
  validar_cep: false,
  titulos_vence_sabado: false,
  titulos_vence_domingo: false,
  manter_numeros_titulos: false,
  quantidade_titulos_manter: 12,
  central_assinante_metodo_login: 'cnpj',
};

const SaasRecursosSistemaModal: React.FC<Props> = ({ show, onClose, skipWrapper = false, onHeaderActionsReady }) => {
  const isMobile = useIsMobile();
  const { success, error: showError } = useNotificationContext();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<ParametrosForm>(INITIAL);

  const { data: parametros, isLoading } = useQuery({
    queryKey: ['saas-parametros'],
    queryFn: () => SaasParametrosService.get(),
    enabled: show,
    staleTime: 60 * 1000,
  });

  const customFormData = useMemo(() => {
    if (!parametros?.data) return undefined;
    const qtd = parametros.data.quantidade_titulos_manter ?? 12;
    return {
      validar_cpf_cnpj: parametros.data.validar_cpf_cnpj ?? true,
      validar_cep: parametros.data.validar_cep ?? false,
      titulos_vence_sabado: parametros.data.titulos_vence_sabado ?? false,
      titulos_vence_domingo: parametros.data.titulos_vence_domingo ?? false,
      manter_numeros_titulos: parametros.data.manter_numeros_titulos ?? false,
      quantidade_titulos_manter: Math.min(24, Math.max(1, qtd)),
      central_assinante_metodo_login: parametros.data.central_assinante_metodo_login ?? 'cnpj',
    };
  }, [parametros?.data]);

  useFormReset({
    show,
    initialData: INITIAL,
    setFormData,
    customData: customFormData,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<ParametrosForm>) => SaasParametrosService.update(data),
    onSuccess: () => {
      success('Parâmetros atualizados com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['saas-parametros'] });
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<{ message?: string }>;
      showError(axiosError?.response?.data?.message || 'Erro ao atualizar parâmetros');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData };
    if (!payload.manter_numeros_titulos) {
      payload.quantidade_titulos_manter = 12;
    }
    updateMutation.mutate(payload);
  };

  const handleCheckboxChange = (field: keyof ParametrosForm) => {
    setFormData((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleNumberChange = (field: keyof ParametrosForm, value: number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSelectChange = (field: keyof ParametrosForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const headerActions = useMemo(
    () => (
      <div className="d-flex gap-2 modal-header-actions">
        <Button type="button" variant="primary" size="sm" onClick={onClose} disabled={updateMutation.isPending}>
          Cancelar
        </Button>
        <Button type="submit" form="saas-recursos-sistema-form" variant="primary" size="sm" disabled={updateMutation.isPending}>
          Salvar
        </Button>
      </div>
    ),
    [onClose, updateMutation.isPending]
  );

  useLayoutEffect(() => {
    if (skipWrapper && onHeaderActionsReady) {
      onHeaderActionsReady(headerActions);
    }
  }, [skipWrapper, onHeaderActionsReady, headerActions]);

  const content = (
    <>
      {isLoading ? (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      ) : (
        <form id="saas-recursos-sistema-form" onSubmit={handleSubmit} style={{ padding: isMobile ? '0' : '16px' }}>
          <div className="card mb-3">
            <div className="card-header py-1 px-2">
              <small className="fw-bold mb-0">Validações</small>
            </div>
            <div className="card-body p-2">
              <div className="form-check mb-3">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="saas_validar_cpf_cnpj"
                  checked={formData.validar_cpf_cnpj}
                  onChange={() => handleCheckboxChange('validar_cpf_cnpj')}
                  disabled={updateMutation.isPending}
                />
                <label className="form-check-label" htmlFor="saas_validar_cpf_cnpj">
                  Validar CPF/CNPJ
                </label>
                <div style={{ color: '#6c757d', fontSize: '0.875rem' }}>Valida CPF/CNPJ ao cadastrar/editar clientes</div>
              </div>
              <div className="form-check mb-3">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="saas_validar_cep"
                  checked={formData.validar_cep}
                  onChange={() => handleCheckboxChange('validar_cep')}
                  disabled={updateMutation.isPending}
                />
                <label className="form-check-label" htmlFor="saas_validar_cep">
                  Validar CEP
                </label>
                <div style={{ color: '#6c757d', fontSize: '0.875rem' }}>Busca dados do endereço ao digitar CEP</div>
              </div>
            </div>
          </div>
          <div className="card mb-3">
            <div className="card-header py-1 px-2">
              <small className="fw-bold mb-0">Geração de Títulos</small>
            </div>
            <div className="card-body p-2">
              <div className="form-check mb-3">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="saas_titulos_vence_sabado"
                  checked={formData.titulos_vence_sabado}
                  onChange={() => handleCheckboxChange('titulos_vence_sabado')}
                  disabled={updateMutation.isPending}
                />
                <label className="form-check-label" htmlFor="saas_titulos_vence_sabado">
                  Títulos Vencem aos Sábados
                </label>
              </div>
              <div className="form-check mb-3">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="saas_titulos_vence_domingo"
                  checked={formData.titulos_vence_domingo}
                  onChange={() => handleCheckboxChange('titulos_vence_domingo')}
                  disabled={updateMutation.isPending}
                />
                <label className="form-check-label" htmlFor="saas_titulos_vence_domingo">
                  Títulos Vencem aos Domingos
                </label>
              </div>
              <div className="form-check mb-3">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="saas_manter_numeros_titulos"
                  checked={formData.manter_numeros_titulos}
                  onChange={() => handleCheckboxChange('manter_numeros_titulos')}
                  disabled={updateMutation.isPending}
                />
                <label className="form-check-label" htmlFor="saas_manter_numeros_titulos">
                  Manter Números de Títulos
                </label>
                <div style={{ color: '#6c757d', fontSize: '0.875rem' }}>
                  Quando um título é pago, a geração cria um novo para manter a quantidade configurada
                </div>
              </div>
              {formData.manter_numeros_titulos && (
                <div className="mb-3">
                  <label htmlFor="saas_quantidade_titulos_manter" className="form-label small mb-1">
                    Quantidade de Títulos a Manter (1 a 24)
                  </label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    id="saas_quantidade_titulos_manter"
                    min={1}
                    max={24}
                    value={formData.quantidade_titulos_manter}
                    onChange={(e) => handleNumberChange('quantidade_titulos_manter', Math.min(24, Math.max(1, parseInt(e.target.value, 10) || 12)))}
                    disabled={updateMutation.isPending}
                    style={{ maxWidth: '80px' }}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="card mb-3">
            <div className="card-header py-1 px-2">
              <small className="fw-bold mb-0">Central do Assinante</small>
            </div>
            <div className="card-body p-2">
              <label htmlFor="saas_central_metodo" className="form-label small mb-1">
                Método de Login
              </label>
              <select
                className="form-select form-select-sm"
                id="saas_central_metodo"
                value={formData.central_assinante_metodo_login}
                onChange={(e) => handleSelectChange('central_assinante_metodo_login', e.target.value)}
                disabled={updateMutation.isPending}
              >
                <option value="cnpj">CNPJ</option>
                <option value="email">Email</option>
              </select>
            </div>
          </div>
        </form>
      )}
    </>
  );

  if (skipWrapper) return content;

  return (
    <DraggableModal show={show} onClose={onClose} title="Recursos do Sistema" size="md" modalId="saas-recursos-sistema-modal" headerActions={headerActions}>
      {content}
    </DraggableModal>
  );
};

export default SaasRecursosSistemaModal;
