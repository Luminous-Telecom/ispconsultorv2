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
  dias_atraso_bloqueio: number | null;
  dias_desbloqueio_manual: number | null;
}

const INITIAL: ParametrosForm = {
  validar_cpf_cnpj: true,
  validar_cep: false,
  titulos_vence_sabado: false,
  titulos_vence_domingo: false,
  manter_numeros_titulos: false,
  quantidade_titulos_manter: 12,
  central_assinante_metodo_login: 'cnpj',
  dias_atraso_bloqueio: null,
  dias_desbloqueio_manual: null,
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
      dias_atraso_bloqueio: parametros.data.dias_atraso_bloqueio ?? null,
      dias_desbloqueio_manual: parametros.data.dias_desbloqueio_manual ?? null,
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
    if (payload.dias_atraso_bloqueio !== null && payload.dias_atraso_bloqueio <= 0) {
      payload.dias_atraso_bloqueio = null;
    }
    if (payload.dias_desbloqueio_manual !== null && payload.dias_desbloqueio_manual <= 0) {
      payload.dias_desbloqueio_manual = null;
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
        <form id="saas-recursos-sistema-form" className="form-modal-simple" onSubmit={handleSubmit} style={{ padding: isMobile ? '0' : '16px', paddingBottom: isMobile ? 0 : 24 }}>
          <div className="card mb-3">
            <div className="card-header py-1 px-2">
              <small className="fw-bold mb-0">Validações</small>
            </div>
            <div className="card-body p-2 overflow-visible">
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
                  <i
                    className="bi bi-info-circle text-muted ms-1"
                    style={{ cursor: 'help', fontSize: '0.85rem' }}
                    title="Valida CPF/CNPJ ao cadastrar/editar clientes"
                  />
                </label>
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
                  <i
                    className="bi bi-info-circle text-muted ms-1"
                    style={{ cursor: 'help', fontSize: '0.85rem' }}
                    title="Busca dados do endereço ao digitar CEP"
                  />
                </label>
              </div>
            </div>
          </div>
          <div className="card mb-3">
            <div className="card-header py-1 px-2">
              <small className="fw-bold mb-0">Geração de Títulos</small>
            </div>
            <div className="card-body p-2 overflow-visible">
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
                  <i
                    className="bi bi-info-circle text-muted ms-1"
                    style={{ cursor: 'help', fontSize: '0.85rem' }}
                    title="Permite que títulos tenham vencimento aos sábados"
                  />
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
                  <i
                    className="bi bi-info-circle text-muted ms-1"
                    style={{ cursor: 'help', fontSize: '0.85rem' }}
                    title="Permite que títulos tenham vencimento aos domingos"
                  />
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
                  <i
                    className="bi bi-info-circle text-muted ms-1"
                    style={{ cursor: 'help', fontSize: '0.85rem' }}
                    title="Quando um título é pago, a geração cria um novo para manter a quantidade configurada"
                  />
                </label>
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
            <div className="card-body p-2 overflow-visible">
              <label htmlFor="saas_central_metodo" className="form-label small mb-1">
                Método de Login
                <i
                  className="bi bi-info-circle text-muted ms-1"
                  style={{ cursor: 'help', fontSize: '0.85rem' }}
                  title="Define se o login na central do assinante será feito por CNPJ ou Email"
                />
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
          <div className="card mb-3">
            <div className="card-header py-1 px-2">
              <small className="fw-bold mb-0">Bloqueio por Atraso</small>
            </div>
            <div className="card-body p-2 overflow-visible">
              <div className="mb-3">
                <label htmlFor="saas_dias_atraso_bloqueio" className="form-label small mb-1">
                  Dias em atraso para bloqueio
                  <i
                    className="bi bi-info-circle text-muted ms-1"
                    style={{ cursor: 'help', fontSize: '0.85rem' }}
                    title="Número de dias após o vencimento para bloquear o acesso à plataforma. Deixe em branco ou 0 para desabilitar."
                  />
                </label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  id="saas_dias_atraso_bloqueio"
                  min={0}
                  max={365}
                  placeholder="Ex: 15"
                  value={formData.dias_atraso_bloqueio ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      dias_atraso_bloqueio: v === '' ? null : Math.min(365, Math.max(0, parseInt(v, 10) || 0))
                    }));
                  }}
                  disabled={updateMutation.isPending}
                  style={{ maxWidth: '140px', minWidth: '80px' }}
                />
                <small className="text-muted d-block mt-1">0 ou vazio = desabilitado</small>
              </div>
              <div className="mb-3">
                <label htmlFor="saas_dias_desbloqueio_manual" className="form-label small mb-1">
                  Dias para desbloqueio manual
                  <i
                    className="bi bi-info-circle text-muted ms-1"
                    style={{ cursor: 'help', fontSize: '0.85rem' }}
                    title="Ao desbloquear manualmente, a empresa terá esta quantidade de dias para regularizar títulos. Após o prazo, será bloqueada novamente se houver atraso. Deixe em branco ou 0 para desabilitar."
                  />
                </label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  id="saas_dias_desbloqueio_manual"
                  min={0}
                  max={365}
                  placeholder="Ex: 7"
                  value={formData.dias_desbloqueio_manual ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      dias_desbloqueio_manual: v === '' ? null : Math.min(365, Math.max(0, parseInt(v, 10) || 0))
                    }));
                  }}
                  disabled={updateMutation.isPending}
                  style={{ maxWidth: '140px', minWidth: '80px' }}
                />
                <small className="text-muted d-block mt-1">0 ou vazio = desabilitado</small>
              </div>
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
