import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useI18n } from 'contexts/I18nContext';
import { useIsMobile } from 'hooks/useMediaQuery';
import DraggableModal from 'components/common/DraggableModal';
import ModalTabsOverflow, { ModalTabItem } from 'components/common/ModalTabsOverflow';
import { ModalFormActions } from 'components/ui';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useFormReset } from 'hooks/useFormReset';
import { saasPlanoService, type SaasPlano } from 'services/saas/saasPlanoService';
import {
  SAAS_PLANO_LIMITES_INITIAL,
  buildSaasPlanoRecursosPayload,
  extractLimitesFromSaasPlanoRecursos,
  extractModulosFromSaasPlanoRecursos,
  getSaasPlanoRecursosObj,
} from 'utils/saasPlanoRecursos';
import {
  syncSaasPlanoOnDescontoChange,
  syncSaasPlanoOnValorAnualChange,
  syncSaasPlanoOnValorMensalChange,
} from 'utils/saasPlanoAnualDesconto';
import {
  SaasPlanoGeralFormFields,
  SaasPlanoLimitesFormFields,
  type SaasPlanoFormData,
} from './SaasPlanoFormFields';
import { saasPlanoModulosTemLimites } from 'utils/saasPlanoModuloLimites';

interface Props {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  planoId?: number | null;
}

const INITIAL: SaasPlanoFormData = {
  nome: '',
  descricao: '',
  valor_mensal: 0,
  valor_anual: '',
  limite_usuarios: 5,
  ativo: true,
  mostrar_hotsite: false,
  desconto_percentual: 0,
  modulos: [],
  limites: SAAS_PLANO_LIMITES_INITIAL,
};

const SaasPlanoFormModal: React.FC<Props> = ({ show, onClose, onSuccess, planoId }) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const isEditing = !!planoId;
  const [form, setForm] = useState<SaasPlanoFormData>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof SaasPlanoFormData, string>>>({});
  const [activeTab, setActiveTab] = useState<'geral' | 'limites'>('geral');
  const hasLimitesTab = saasPlanoModulosTemLimites(form.modulos);

  useEffect(() => {
    if (!hasLimitesTab && activeTab === 'limites') setActiveTab('geral');
  }, [hasLimitesTab, activeTab]);

  const { data: planoData } = useQuery({
    queryKey: ['saas-plano', planoId],
    queryFn: () => saasPlanoService.getById(planoId!),
    enabled: show && !!planoId,
  });

  useFormReset({
    show: show && !isEditing,
    initialData: INITIAL,
    setFormData: setForm,
    setErrors,
  });

  useFormReset({
    show: show && isEditing,
    initialData: INITIAL,
    setFormData: setForm,
    setErrors,
    customData: planoData?.data
      ? (() => {
          const p = planoData.data;
          const valorAnual: number | '' = p.valor_anual == null ? '' : Number(p.valor_anual);
          return {
            nome: p.nome,
            descricao: p.descricao || '',
            valor_mensal: p.valor_mensal,
            valor_anual: valorAnual,
            limite_usuarios: p.limite_usuarios,
            ativo: p.ativo,
            mostrar_hotsite: Boolean(p.mostrar_hotsite),
            desconto_percentual: Number(p.desconto_percentual) || 0,
            modulos: extractModulosFromSaasPlanoRecursos(p.recursos),
            limites: extractLimitesFromSaasPlanoRecursos(p.recursos),
          };
        })()
      : undefined,
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<SaasPlano>) => saasPlanoService.create(data),
    onSuccess: () => {
      success('Plano salvo com sucesso');
      queryClient.invalidateQueries({ queryKey: ['saas-planos'] });
      onSuccess?.();
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.PLANO_CREATE_ERROR),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<SaasPlano>) => saasPlanoService.update(planoId!, data),
    onSuccess: () => {
      success('Plano atualizado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['saas-planos'] });
      queryClient.invalidateQueries({ queryKey: ['saas-plano', planoId] });
      onSuccess?.();
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.PLANO_UPDATE_ERROR),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleFieldChange = useCallback(
    <K extends keyof SaasPlanoFormData>(field: K, value: SaasPlanoFormData[K]) => {
      setForm((prev) => {
        if (field === 'valor_mensal') {
          return { ...prev, ...syncSaasPlanoOnValorMensalChange(prev, Number(value)) };
        }
        if (field === 'valor_anual') {
          return { ...prev, ...syncSaasPlanoOnValorAnualChange(prev, value as number | '') };
        }
        if (field === 'desconto_percentual') {
          return { ...prev, ...syncSaasPlanoOnDescontoChange(prev, Number(value)) };
        }
        return { ...prev, [field]: value };
      });
    },
    []
  );

  const handleClearError = useCallback((field: keyof SaasPlanoFormData) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Partial<Record<keyof SaasPlanoFormData, string>> = {};
    if (!form.nome.trim()) newErrors.nome = 'Nome é obrigatório';
    if (form.valor_mensal < 0) newErrors.valor_mensal = 'Valor mensal inválido';
    if (form.desconto_percentual < 0 || form.desconto_percentual > 100) {
      newErrors.desconto_percentual = 'Desconto inválido';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    const baseRecursos =
      isEditing && planoData?.data?.recursos
        ? getSaasPlanoRecursosObj(planoData.data.recursos) ?? {}
        : {};
    const recursos = buildSaasPlanoRecursosPayload(form.modulos, form.limites, baseRecursos);

    const payload: Partial<SaasPlano> = {
      nome: form.nome,
      descricao: form.descricao,
      valor_mensal: form.valor_mensal,
      valor_anual: form.valor_anual !== '' ? Number(form.valor_anual) : undefined,
      limite_usuarios: form.limite_usuarios,
      ativo: form.ativo,
      mostrar_hotsite: form.mostrar_hotsite,
      desconto_percentual: form.desconto_percentual,
      recursos,
    };

    try {
      if (isEditing) {
        await updateMutation.mutateAsync(payload);
      } else {
        await createMutation.mutateAsync(payload);
      }
    } catch {
      // tratado no mutation
    }
  };

  const planoTabs = useMemo((): ModalTabItem<'geral' | 'limites'>[] => {
    const tabs: ModalTabItem<'geral' | 'limites'>[] = [{ id: 'geral', label: 'Geral' }];
    if (hasLimitesTab) {
      tabs.push({ id: 'limites', label: t('saas.planModuleLimitsTab') });
    }
    return tabs;
  }, [hasLimitesTab, t]);

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={isEditing ? t('modal.editPlan') : t('modal.createPlan')}
      size="lg"
      modalId="saas-plano-form-modal"
      headerActions={
        <div className="plano-header-unified">
          <ModalFormActions
            className="plano-header-buttons modal-header-actions d-flex gap-2"
            onCancel={onClose}
            formId="saas-plano-form"
            isPending={isPending}
          />
          <div className="plano-header-tabs">
            <ModalTabsOverflow
              tabs={planoTabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              tabsClassName={`plano-tabs-unified ${isMobile ? 'plano-tabs-mobile' : ''}`}
              isMobile={isMobile}
              id="saas-plano-tabs"
            />
          </div>
        </div>
      }
    >
      <div className="plano-modal-content">
        <form id="saas-plano-form" onSubmit={handleSubmit} className="form-modal-simple">
          <div className="tab-content plano-tab-content plano-tab-content-padded">
            {activeTab === 'geral' && (
              <SaasPlanoGeralFormFields
                form={form}
                errors={errors}
                onFieldChange={handleFieldChange}
                onClearError={handleClearError}
              />
            )}
            {activeTab === 'limites' && hasLimitesTab && (
              <SaasPlanoLimitesFormFields form={form} onFieldChange={handleFieldChange} />
            )}
          </div>
        </form>
      </div>
    </DraggableModal>
  );
};

export default SaasPlanoFormModal;
