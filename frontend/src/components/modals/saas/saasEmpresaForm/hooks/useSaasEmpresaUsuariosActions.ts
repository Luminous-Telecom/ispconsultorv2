import { useCallback, useMemo } from 'react';
import { useBulkBtn } from 'components/ui';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { saasTenantUsuariosService, type SaasTenantUsuario } from 'services/saas/saasTenantUsuariosService';
import type { BulkAction } from 'components/tables/types';
import type { SaasEmpresaTranslateFn } from '../types';

interface UseSaasEmpresaUsuariosActionsParams {
  refetchUsuarios: () => void;
  setShowUsuarioCreate: (show: boolean) => void;
  setShowUsuarioEdit: (show: boolean) => void;
  setSelectedUsuarioId: (id: number | null) => void;
  t: SaasEmpresaTranslateFn;
}

export function useSaasEmpresaUsuariosActions({
  refetchUsuarios,
  setShowUsuarioCreate,
  setShowUsuarioEdit,
  setSelectedUsuarioId,
  t,
}: UseSaasEmpresaUsuariosActionsParams) {
  const bulkBtn = useBulkBtn();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  const handleDeleteUsuario = useCallback(async (sel: SaasTenantUsuario[]) => {
    const u = sel[0];
    if (!u || !window.confirm(t('messages.confirmDelete'))) return;
    try {
      await saasTenantUsuariosService.delete(u.id);
      refetchUsuarios();
      success(t('messages.success'));
    } catch {
      showApiError(t('messages.error'));
    }
  }, [refetchUsuarios, success, showApiError, t]);

  const usuariosBulkActions = useMemo((): BulkAction<SaasTenantUsuario>[] => [
    { key: 'novo', label: bulkBtn.novo.label, variant: bulkBtn.novo.variant, requiresSelection: false, onClick: () => setShowUsuarioCreate(true) },
    { key: 'editar', label: bulkBtn.editar.label, variant: bulkBtn.editar.variant, onClick: (sel: SaasTenantUsuario[]) => { if (sel[0]) { setSelectedUsuarioId(sel[0].id); setShowUsuarioEdit(true); } } },
    { key: 'deletar', label: bulkBtn.deletar.label, variant: bulkBtn.deletar.variant, onClick: handleDeleteUsuario },
  ], [bulkBtn, handleDeleteUsuario, setShowUsuarioCreate, setShowUsuarioEdit, setSelectedUsuarioId]);

  const handleUsuarioRowDoubleClick = useCallback((i: SaasTenantUsuario) => {
    setSelectedUsuarioId(i.id);
    setShowUsuarioEdit(true);
  }, [setSelectedUsuarioId, setShowUsuarioEdit]);

  return { usuariosBulkActions, handleUsuarioRowDoubleClick };
}
