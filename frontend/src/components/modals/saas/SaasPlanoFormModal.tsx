import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useI18n } from 'contexts/I18nContext';
import { useIsMobile } from 'hooks/useMediaQuery';
import DraggableModal from 'components/common/DraggableModal';
import { Button } from 'components/ui';
import { FormField, AtivoInativoField } from 'components/ui';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useFormReset } from 'hooks/useFormReset';
import { saasPlanoService, type SaasPlano } from 'services/saas/saasPlanoService';
import { PLANO_MODULOS } from 'constants/planoModulos';
import type { PlanoModuloId } from 'services/planoModulosService';

function getRecursosObj(recursos: unknown): Record<string, unknown> | null {
  if (recursos && typeof recursos === 'object' && !Array.isArray(recursos)) {
    return recursos as Record<string, unknown>;
  }
  if (typeof recursos === 'string') {
    try {
      const parsed = JSON.parse(recursos);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  return null;
}

function extractModulosFromRecursos(recursos: unknown): PlanoModuloId[] {
  const obj = getRecursosObj(recursos);
  const modulos = obj?.modulos;
  return Array.isArray(modulos) ? modulos.filter((m): m is PlanoModuloId => typeof m === 'string') : [];
}

function extractEquipamentosFromRecursos(recursos: unknown): ConfigEquipamentos {
  const obj = getRecursosObj(recursos);
  if (!obj) return INITIAL_EQUIPAMENTOS;
  const def = (key: keyof ConfigEquipamentos, val: unknown) =>
    val != null ? (typeof val === 'number' && !Number.isNaN(val) && val >= 0 ? val : INITIAL_EQUIPAMENTOS[key]) : INITIAL_EQUIPAMENTOS[key];
  return {
    limite_equipamentos: def('limite_equipamentos', obj.equipamentos_limite_equipamentos),
    limite_tuneis: def('limite_tuneis', obj.equipamentos_limite_tuneis),
    limite_backups: def('limite_backups', obj.equipamentos_limite_backups),
  };
}

interface Props {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  planoId?: number | null;
}

type ConfigEquipamentos = {
  limite_equipamentos: number;
  limite_tuneis: number;
  limite_backups: number;
};

interface PlanoForm {
  nome: string;
  descricao: string;
  valor_mensal: number;
  valor_anual: number | '';
  limite_usuarios: number;
  ativo: boolean;
  modulos: PlanoModuloId[];
  equipamentos: ConfigEquipamentos;
}

const INITIAL_EQUIPAMENTOS: ConfigEquipamentos = {
  limite_equipamentos: 5,
  limite_tuneis: 5,
  limite_backups: 1,
};

const INITIAL: PlanoForm = {
  nome: '',
  descricao: '',
  valor_mensal: 0,
  valor_anual: '',
  limite_usuarios: 5,
  ativo: true,
  modulos: [],
  equipamentos: INITIAL_EQUIPAMENTOS,
};

const SaasPlanoFormModal: React.FC<Props> = ({ show, onClose, onSuccess, planoId }) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();
  const isEditing = !!planoId;
  const [form, setForm] = useState<PlanoForm>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof PlanoForm, string>>>({});
  const [activeTab, setActiveTab] = useState<'geral' | 'equipamentos'>('geral');
  const hasEquipamentos = form.modulos.includes('equipamentos');

  useEffect(() => {
    if (!hasEquipamentos && activeTab === 'equipamentos') setActiveTab('geral');
  }, [hasEquipamentos, activeTab]);

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
          const p = planoData.data as SaasPlano;
          const modulos = extractModulosFromRecursos(p.recursos);
          const equipamentos = extractEquipamentosFromRecursos(p.recursos);
          const valorAnual: number | '' = p.valor_anual == null ? '' : Number(p.valor_anual);
          const formData = {
            nome: p.nome,
            descricao: p.descricao || '',
            valor_mensal: p.valor_mensal,
            valor_anual: valorAnual,
            limite_usuarios: p.limite_usuarios,
            ativo: p.ativo,
            modulos,
            equipamentos,
          } as PlanoForm;
          return formData;
        })()
      : undefined,
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<SaasPlano>) => saasPlanoService.create(data),
    onSuccess: () => {
      success('Plano criado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['saas-planos'] });
      onSuccess?.();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao criar plano';
      error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<SaasPlano>) => saasPlanoService.update(planoId!, data),
    onSuccess: () => {
      success('Plano atualizado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['saas-planos'] });
      queryClient.invalidateQueries({ queryKey: ['saas-plano', planoId] });
      onSuccess?.();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao atualizar plano';
      error(msg);
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Partial<Record<keyof PlanoForm, string>> = {};
    if (!form.nome.trim()) newErrors.nome = 'Nome é obrigatório';
    if (form.valor_mensal < 0) newErrors.valor_mensal = 'Valor mensal inválido';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});

    const baseRecursos = (isEditing && planoData?.data?.recursos && typeof planoData.data.recursos === 'object')
      ? { ...(planoData.data.recursos as Record<string, unknown>) }
      : {};
    const recursos: Record<string, unknown> = { ...baseRecursos, modulos: form.modulos };
    if (form.modulos.includes('equipamentos')) {
      recursos.equipamentos_limite_equipamentos = form.equipamentos.limite_equipamentos;
      recursos.equipamentos_limite_tuneis = form.equipamentos.limite_tuneis;
      recursos.equipamentos_limite_backups = form.equipamentos.limite_backups;
    } else {
      delete recursos.equipamentos_limite_equipamentos;
      delete recursos.equipamentos_limite_tuneis;
      delete recursos.equipamentos_limite_backups;
    }
    const payload: Partial<SaasPlano> = {
      nome: form.nome,
      descricao: form.descricao,
      valor_mensal: form.valor_mensal,
      valor_anual: form.valor_anual !== '' ? Number(form.valor_anual) : undefined,
      limite_usuarios: form.limite_usuarios,
      ativo: form.ativo,
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

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={isEditing ? t('modal.editPlan') : t('modal.createPlan')}
      size="lg"
      modalId="saas-plano-form-modal"
      headerActions={
        <div className="plano-header-unified">
          <div className="plano-header-buttons modal-header-actions d-flex gap-2">
            <Button type="button" variant="primary" size="sm" onClick={onClose} disabled={isPending}>
              {t('buttons.cancel')}
            </Button>
            <Button type="submit" form="saas-plano-form" variant="primary" size="sm" disabled={isPending}>
              {t('buttons.save')}
            </Button>
          </div>
          <div className="plano-header-tabs">
            <ul
              className={`nav nav-tabs plano-tabs-unified ${isMobile ? 'plano-tabs-mobile' : ''}`}
              role="tablist"
              style={{ margin: 0, padding: 0, borderBottom: 'none', backgroundColor: 'transparent' }}
            >
              <li className="nav-item" role="presentation">
                <button
                  className={`nav-link modal-tab-hover ${activeTab === 'geral' ? 'active' : ''}`}
                  type="button"
                  onClick={() => setActiveTab('geral')}
                >
                  Geral
                </button>
              </li>
              {hasEquipamentos && (
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link modal-tab-hover ${activeTab === 'equipamentos' ? 'active' : ''}`}
                    type="button"
                    onClick={() => setActiveTab('equipamentos')}
                  >
                    Equipamentos
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>
      }
    >
      <form id="saas-plano-form" onSubmit={handleSubmit}>
        <div className="plano-modal-content">
          <div className="tab-content plano-tab-content plano-tab-content-padded">
          {activeTab === 'geral' && (
            <>
              <div className="row g-2">
                <div className="col-md-8">
                  <div className="mb-0">
                    <FormField
                      name="nome"
                      type="text"
                      label={`${t('table.planName')} *`}
                      value={form.nome}
                      onChange={(v) => { setForm(p => ({ ...p, nome: String(v ?? '') })); if (errors.nome) setErrors(p => ({ ...p, nome: undefined })); }}
                      required
                      size="sm"
                      error={errors.nome}
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="mb-0">
                    <AtivoInativoField
                      value={form.ativo}
                      onChange={(v) => setForm(p => ({ ...p, ativo: v }))}
                      name="saas-plano-ativo"
                      required
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="mb-0">
                    <FormField
                      name="valor_mensal"
                      type="number"
                      label="Valor Mensal (R$) *"
                      value={form.valor_mensal}
                      onChange={(v) => { setForm(p => ({ ...p, valor_mensal: Number(v ?? 0) })); if (errors.valor_mensal) setErrors(p => ({ ...p, valor_mensal: undefined })); }}
                      min={0}
                      step={0.01}
                      required
                      size="sm"
                      error={errors.valor_mensal}
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="mb-0">
                    <FormField
                      name="valor_anual"
                      type="number"
                      label="Valor Anual (R$)"
                      value={form.valor_anual === '' ? '' : form.valor_anual}
                      onChange={(v) => setForm(p => ({ ...p, valor_anual: v !== '' && v !== null && v !== undefined ? Number(v) : '' }))}
                      min={0}
                      step={0.01}
                      size="sm"
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="mb-0">
                    <FormField
                      name="limite_usuarios"
                      type="number"
                      label="Limite de Usuários"
                      value={form.limite_usuarios}
                      onChange={(v) => setForm(p => ({ ...p, limite_usuarios: Number(v ?? 5) }))}
                      min={1}
                      size="sm"
                    />
                  </div>
                </div>
                <div className="col-12">
                  <div className="mb-0">
                    <FormField
                      name="descricao"
                      type="textarea"
                      label={t('form.description')}
                      value={form.descricao}
                      onChange={(v) => setForm(p => ({ ...p, descricao: String(v ?? '') }))}
                      rows={3}
                      size="sm"
                    />
                  </div>
                </div>
              </div>
              <div className="mb-2">
                <label className="form-label small">
                  {t('saas.planModules')}
                  <i className="bi bi-info-circle text-muted ms-1" style={{ cursor: 'help', fontSize: '0.85rem' }} title={t('saas.planModulesHelp')} />
                </label>
                <div className="d-flex flex-wrap gap-3">
                  {PLANO_MODULOS.map((mod) => (
                    <label key={mod.id} className="d-flex align-items-center gap-2 small">
                      <input
                        type="checkbox"
                        checked={form.modulos.includes(mod.id)}
                        onChange={(e) => {
                          setForm((p) => ({
                            ...p,
                            modulos: e.target.checked
                              ? [...p.modulos, mod.id]
                              : p.modulos.filter((m) => m !== mod.id),
                          }));
                        }}
                      />
                      <span>{mod.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
          {activeTab === 'equipamentos' && hasEquipamentos && (
            <>
              <div className="row g-2">
                <div className="col-md-4">
                  <div className="mb-0">
                    <FormField
                      name="equipamentos_limite_equipamentos"
                      type="number"
                      label="Limite de equipamentos"
                      value={form.equipamentos.limite_equipamentos}
                      onChange={(v) => setForm(p => ({
                        ...p,
                        equipamentos: { ...p.equipamentos, limite_equipamentos: Number(v ?? 0) },
                      }))}
                      min={0}
                      size="sm"
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="mb-0">
                    <FormField
                      name="equipamentos_limite_tuneis"
                      type="number"
                      label="Limite de túneis"
                      value={form.equipamentos.limite_tuneis}
                      onChange={(v) => setForm(p => ({
                        ...p,
                        equipamentos: { ...p.equipamentos, limite_tuneis: Number(v ?? 0) },
                      }))}
                      min={0}
                      size="sm"
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="mb-0">
                    <FormField
                      name="equipamentos_limite_backups"
                      type="number"
                      label="Limite de backups"
                      value={form.equipamentos.limite_backups}
                      onChange={(v) => setForm(p => ({
                        ...p,
                        equipamentos: { ...p.equipamentos, limite_backups: Number(v ?? 0) },
                      }))}
                      min={0}
                      size="sm"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
          </div>
        </div>
      </form>
    </DraggableModal>
  );
};

export default SaasPlanoFormModal;
