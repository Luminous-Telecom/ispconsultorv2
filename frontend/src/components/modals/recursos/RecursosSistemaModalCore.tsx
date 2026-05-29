import React, { useState, useMemo, useLayoutEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useIsMobile } from 'hooks/useMediaQuery';
import { useFormReset } from 'hooks/useFormReset';
import DraggableModal from 'components/common/DraggableModal';
import { ModalFormActions } from 'components/ui';
import {
  RECURSOS_SISTEMA_BY_VARIANT,
  RECURSOS_ERP_INITIAL,
  RECURSOS_SAAS_INITIAL,
  mapSaasParametrosToForm,
  type RecursosSistemaVariant,
  type RecursosSistemaFormBase,
  type RecursosSistemaFormSaas,
} from './recursosSistemaVariants';

export interface RecursosSistemaModalCoreProps {
  variant: RecursosSistemaVariant;
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  onHeaderActionsReady?: (actions: React.ReactNode) => void;
}

const RecursosSistemaModalCore: React.FC<RecursosSistemaModalCoreProps> = ({
  variant,
  show,
  onClose,
  skipWrapper = false,
  onHeaderActionsReady,
}) => {
  const isSaas = variant === 'saas';
  const config = RECURSOS_SISTEMA_BY_VARIANT[variant];
  const isMobile = useIsMobile();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<RecursosSistemaFormSaas>(
    isSaas ? RECURSOS_SAAS_INITIAL : { ...RECURSOS_SAAS_INITIAL }
  );

  const { data: parametros, isLoading } = useQuery({
    queryKey: [...config.queryKey],
    queryFn: () => config.api.get(),
    enabled: show,
    staleTime: 60 * 1000,
    refetchOnMount: !isSaas,
  });

  const customFormData = useMemo((): RecursosSistemaFormSaas | undefined => {
    if (!parametros?.data) return undefined;
    const d = parametros.data;
    const base: RecursosSistemaFormBase = {
      validar_cpf_cnpj: d.validar_cpf_cnpj ?? true,
      validar_cep: d.validar_cep ?? false,
      titulos_vence_sabado: d.titulos_vence_sabado ?? false,
      titulos_vence_domingo: d.titulos_vence_domingo ?? false,
      central_assinante_metodo_login: d.central_assinante_metodo_login ?? 'cnpj',
    };
    if (!isSaas) return { ...RECURSOS_SAAS_INITIAL, ...base };
    return mapSaasParametrosToForm(d, base);
  }, [parametros?.data, isSaas]);

  useFormReset({
    show,
    initialData: isSaas ? RECURSOS_SAAS_INITIAL : { ...RECURSOS_SAAS_INITIAL, ...RECURSOS_ERP_INITIAL },
    setFormData,
    customData: customFormData,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<RecursosSistemaFormSaas>) => config.api.update(data),
    onSuccess: () => {
      success('Parâmetros atualizados com sucesso!');
      queryClient.invalidateQueries({ queryKey: [...config.queryKey] });
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.PARAMS_UPDATE_ERROR),
  });

  const idPrefix = isSaas ? 'saas_' : '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaas) {
      const payload = { ...formData };
      if (!payload.manter_numeros_titulos) payload.quantidade_titulos_manter = 12;
      if (payload.dias_atraso_bloqueio !== null && payload.dias_atraso_bloqueio <= 0) {
        payload.dias_atraso_bloqueio = null;
      }
      if (payload.dias_desbloqueio_manual !== null && payload.dias_desbloqueio_manual <= 0) {
        payload.dias_desbloqueio_manual = null;
      }
      updateMutation.mutate(payload);
      return;
    }
    const { manter_numeros_titulos: _m, quantidade_titulos_manter: _q, dias_atraso_bloqueio: _a, dias_desbloqueio_manual: _d, ...erpPayload } =
      formData;
    updateMutation.mutate(erpPayload);
  };

  const handleCheckboxChange = (field: keyof RecursosSistemaFormSaas) => {
    setFormData((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSelectChange = (field: keyof RecursosSistemaFormBase, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const headerActionsContent = useMemo(
    () => (
      <ModalFormActions
        onCancel={onClose}
        formId={config.formId}
        isPending={updateMutation.isPending}
      />
    ),
    [onClose, config.formId, updateMutation.isPending]
  );

  useLayoutEffect(() => {
    if (skipWrapper && onHeaderActionsReady) {
      onHeaderActionsReady(headerActionsContent);
    }
  }, [skipWrapper, onHeaderActionsReady, headerActionsContent]);

  const modalContent = (
    <>
      {isLoading ? (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      ) : (
        <form
          id={config.formId}
          className="form-modal-simple"
          onSubmit={handleSubmit}
          style={{ padding: isMobile ? '0' : '16px', paddingBottom: isMobile ? 0 : isSaas ? 24 : 16 }}
        >
          <div className="card mb-3">
            <div className="card-header py-1 px-2">
              <small className="fw-bold mb-0">Validações</small>
            </div>
            <div className={`card-body p-2${isSaas ? ' overflow-visible' : ''}`}>
              <div className="form-check mb-3">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id={`${idPrefix}validar_cpf_cnpj`}
                  checked={formData.validar_cpf_cnpj}
                  onChange={() => handleCheckboxChange('validar_cpf_cnpj')}
                  disabled={updateMutation.isPending}
                />
                <label className="form-check-label" htmlFor={`${idPrefix}validar_cpf_cnpj`}>
                  Validar CNPJ
                  <i
                    className="bi bi-info-circle text-muted ms-1"
                    style={{ cursor: 'help', fontSize: '0.85rem' }}
                    title={
                      isSaas
                        ? 'Valida CNPJ ao cadastrar/editar clientes'
                        : 'Quando ativado, valida se CNPJ é válido ao cadastrar/editar clientes'
                    }
                  />
                </label>
              </div>
              <div className="form-check mb-3">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id={`${idPrefix}validar_cep`}
                  checked={formData.validar_cep}
                  onChange={() => handleCheckboxChange('validar_cep')}
                  disabled={updateMutation.isPending}
                />
                <label className="form-check-label" htmlFor={`${idPrefix}validar_cep`}>
                  Validar CEP
                  <i
                    className="bi bi-info-circle text-muted ms-1"
                    style={{ cursor: 'help', fontSize: '0.85rem' }}
                    title={
                      isSaas
                        ? 'Busca dados do endereço ao digitar CEP'
                        : 'Quando ativado, busca automaticamente os dados do endereço ao digitar um CEP válido'
                    }
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-header py-1 px-2">
              <small className="fw-bold mb-0">Geração de Títulos</small>
            </div>
            <div className={`card-body p-2${isSaas ? ' overflow-visible' : ''}`}>
              <div className="form-check mb-3">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id={`${idPrefix}titulos_vence_sabado`}
                  checked={formData.titulos_vence_sabado}
                  onChange={() => handleCheckboxChange('titulos_vence_sabado')}
                  disabled={updateMutation.isPending}
                />
                <label className="form-check-label" htmlFor={`${idPrefix}titulos_vence_sabado`}>
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
                  id={`${idPrefix}titulos_vence_domingo`}
                  checked={formData.titulos_vence_domingo}
                  onChange={() => handleCheckboxChange('titulos_vence_domingo')}
                  disabled={updateMutation.isPending}
                />
                <label className="form-check-label" htmlFor={`${idPrefix}titulos_vence_domingo`}>
                  Títulos Vencem aos Domingos
                  <i
                    className="bi bi-info-circle text-muted ms-1"
                    style={{ cursor: 'help', fontSize: '0.85rem' }}
                    title="Permite que títulos tenham vencimento aos domingos"
                  />
                </label>
              </div>
              {isSaas && (
                <>
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
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            quantidade_titulos_manter: Math.min(
                              24,
                              Math.max(1, parseInt(e.target.value, 10) || 12)
                            ),
                          }))
                        }
                        disabled={updateMutation.isPending}
                        style={{ maxWidth: '80px' }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-header py-1 px-2">
              <small className="fw-bold mb-0">Central do Assinante</small>
            </div>
            <div className={`card-body p-2${isSaas ? ' overflow-visible' : ''}`}>
              <label htmlFor={`${idPrefix}central_metodo`} className="form-label small mb-1">
                Método de Login
                <i
                  className="bi bi-info-circle text-muted ms-1"
                  style={{ cursor: 'help', fontSize: '0.85rem' }}
                  title="Define se o login na central do assinante será feito por CNPJ ou Email"
                />
              </label>
              <select
                className={`form-select form-select-sm`}
                id={`${idPrefix}central_metodo`}
                value={formData.central_assinante_metodo_login}
                onChange={(e) => handleSelectChange('central_assinante_metodo_login', e.target.value)}
                disabled={updateMutation.isPending}
              >
                <option value="cnpj">CNPJ</option>
                <option value="email">Email</option>
              </select>
            </div>
          </div>

          {isSaas && (
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
                        dias_atraso_bloqueio:
                          v === '' ? null : Math.min(365, Math.max(0, parseInt(v, 10) || 0)),
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
                      title="Ao desbloquear manualmente, a empresa terá esta quantidade de dias para regularizar títulos."
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
                        dias_desbloqueio_manual:
                          v === '' ? null : Math.min(365, Math.max(0, parseInt(v, 10) || 0)),
                      }));
                    }}
                    disabled={updateMutation.isPending}
                    style={{ maxWidth: '140px', minWidth: '80px' }}
                  />
                  <small className="text-muted d-block mt-1">0 ou vazio = desabilitado</small>
                </div>
              </div>
            </div>
          )}
        </form>
      )}
    </>
  );

  if (skipWrapper) return modalContent;

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={config.title}
      size="md"
      modalId={config.modalId}
      headerActions={headerActionsContent}
    >
      {modalContent}
    </DraggableModal>
  );
};

export default RecursosSistemaModalCore;
