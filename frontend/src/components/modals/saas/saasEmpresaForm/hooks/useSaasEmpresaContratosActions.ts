import { useCallback, useMemo } from 'react';
import { useBulkBtn } from 'components/ui';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { saasEmpresasService } from 'services/saas/saasEmpresasService';
import { saasContratoService, type SaasContrato } from 'services/saas/saasCrudService';
import type { BulkAction } from 'components/tables/types';
import type { SaasEmpresaTranslateFn, StatusEmpresa } from '../types';

interface UseSaasEmpresaContratosActionsParams {
  empresaId: number | null;
  statusEmpresa?: StatusEmpresa;
  refetchContratos: () => void;
  setShowContratoCreate: (show: boolean) => void;
  setShowContratoEdit: (show: boolean) => void;
  setSelectedContratoId: (id: number | null) => void;
  t: SaasEmpresaTranslateFn;
}

export function useSaasEmpresaContratosActions({
  empresaId,
  statusEmpresa,
  refetchContratos,
  setShowContratoCreate,
  setShowContratoEdit,
  setSelectedContratoId,
  t,
}: UseSaasEmpresaContratosActionsParams) {
  const bulkBtn = useBulkBtn();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  const handleDeleteContrato = useCallback(async (sel: SaasContrato[]) => {
    const c = sel[0];
    if (!c || !window.confirm(t('messages.confirmDelete'))) return;
    try {
      await saasContratoService.delete(c.id);
      refetchContratos();
    } catch {
      showApiError(t('messages.error'));
    }
  }, [refetchContratos, showApiError, t]);

  const handleDesbloquearManual = useCallback(async () => {
    if (!empresaId) return;
    if (!window.confirm(t('saas.confirmManualUnblock') || 'Desbloquear empresa manualmente? Ela terá o prazo configurado para regularizar os títulos.')) return;
    try {
      const res = await saasEmpresasService.desbloquearManual(empresaId);
      const msg = (res as { message?: string })?.message ?? t('messages.success');
      success(msg);
      refetchContratos();
    } catch (e) {
      showApiError(e, CONTEXT_ERROR_MESSAGES.SAAS_EMPRESA_SAVE_ERROR);
    }
  }, [empresaId, refetchContratos, success, showApiError, t]);

  const contratosBulkActions = useMemo((): BulkAction<SaasContrato>[] => {
    const base = [
      { key: 'novo', label: bulkBtn.novo.label, variant: bulkBtn.novo.variant, requiresSelection: false, onClick: () => setShowContratoCreate(true) },
      { key: 'editar', label: bulkBtn.editar.label, variant: bulkBtn.editar.variant, onClick: (sel: SaasContrato[]) => { if (sel[0]) { setSelectedContratoId(sel[0].id); setShowContratoEdit(true); } } },
      { key: 'deletar', label: bulkBtn.deletar.label, variant: bulkBtn.deletar.variant, onClick: handleDeleteContrato },
    ];
    if (statusEmpresa?.bloqueado_por_atraso) {
      base.push({ key: 'desbloquear', label: t('saas.manualUnblock') || 'Desbloquear manualmente', variant: 'primary' as const, requiresSelection: true, onClick: handleDesbloquearManual });
    }
    return base;
  }, [bulkBtn, t, handleDeleteContrato, statusEmpresa?.bloqueado_por_atraso, handleDesbloquearManual, setShowContratoCreate, setShowContratoEdit, setSelectedContratoId]);

  const handleContratoRowDoubleClick = useCallback((i: SaasContrato) => {
    setSelectedContratoId(i.id);
    setShowContratoEdit(true);
  }, [setSelectedContratoId, setShowContratoEdit]);

  return { contratosBulkActions, handleContratoRowDoubleClick };
}
