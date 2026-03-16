import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useI18n } from 'contexts/I18nContext';
import DraggableModal from 'components/common/DraggableModal';
import { Button } from 'components/ui';
import FormField from 'components/ui/FormField';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useFormReset } from 'hooks/useFormReset';
import { saasTenantUsuariosService, type SaasTenantUsuario } from 'services/saas/saasTenantUsuariosService';

interface Props {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  usuarioId?: number | null;
  empresaId: number;
}

interface Form {
  nome: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  ativo: boolean;
}

const INITIAL: Form = { nome: '', email: '', password: '', role: 'admin', ativo: true };

const SaasTenantUsuarioFormModal: React.FC<Props> = ({ show, onClose, onSuccess, usuarioId, empresaId }) => {
  const { t } = useI18n();
  const { success, error } = useNotificationContext();
  const isEditing = !!usuarioId;
  const [form, setForm] = useState<Form>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});

  const { data } = useQuery({
    queryKey: ['saas-tenant-usuario', usuarioId],
    queryFn: () => saasTenantUsuariosService.getById(usuarioId!),
    enabled: show && !!usuarioId,
  });

  useFormReset({ show: show && !isEditing, initialData: INITIAL, setFormData: setForm, setErrors });
  useFormReset({
    show: show && isEditing,
    initialData: INITIAL,
    setFormData: setForm,
    setErrors,
    customData: data?.data ? (() => {
      const d = data.data as unknown as SaasTenantUsuario;
      return { nome: d.nome ?? '', email: d.email ?? '', password: '', role: (d.role || 'admin') as 'admin' | 'user', ativo: d.ativo !== false };
    })() : undefined,
  });

  const createMutation = useMutation({
    mutationFn: (d: Form) => saasTenantUsuariosService.create({ empresa_id: empresaId, ...d }),
    onSuccess: () => {
      success('Usuário criado com sucesso');
      onSuccess?.();
      onClose();
    },
    onError: (e: unknown) => error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || t('messages.error')),
  });

  const updateMutation = useMutation({
    mutationFn: (d: Partial<Form>) => saasTenantUsuariosService.update(usuarioId!, d),
    onSuccess: () => {
      success('Usuário atualizado com sucesso');
      onSuccess?.();
      onClose();
    },
    onError: (e: unknown) => error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || t('messages.error')),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Partial<Record<keyof Form, string>> = {};
    if (!form.nome.trim()) errs.nome = t('form.required');
    if (!form.email.trim()) errs.email = t('form.required');
    if (!isEditing && !form.password.trim()) errs.password = t('form.required');
    if (form.password && form.password.length < 6) errs.password = t('messages.passwordMinLength');
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    if (isEditing) {
      const payload: Partial<Form> = { nome: form.nome, email: form.email, role: form.role, ativo: form.ativo };
      if (form.password) payload.password = form.password;
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(form);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="Usuário"
      size="md"
      modalId="saas-tenant-usuario-form"
      headerActions={
        <div className="d-flex gap-2 modal-header-actions">
          <Button type="button" variant="primary" size="sm" onClick={onClose} disabled={isPending}>Cancelar</Button>
          <Button type="submit" form="saas-tenant-usuario-form-id" variant="primary" size="sm" disabled={isPending}>Salvar</Button>
        </div>
      }
    >
      <form id="saas-tenant-usuario-form-id" onSubmit={handleSubmit} className="p-3">
        <div className="row g-2">
          <div className="col-12">
            <FormField name="nome" type="text" label={`${t('form.name')} *`} value={form.nome} onChange={(v) => { setForm(p => ({ ...p, nome: String(v ?? '') })); if (errors.nome) setErrors(e => ({ ...e, nome: undefined })); }} required size="sm" error={errors.nome} />
          </div>
          <div className="col-12">
            <FormField name="email" type="email" label={`${t('form.email')} *`} value={form.email} onChange={(v) => { setForm(p => ({ ...p, email: String(v ?? '') })); if (errors.email) setErrors(e => ({ ...e, email: undefined })); }} required size="sm" error={errors.email} />
          </div>
          <div className="col-12">
            <FormField
              name="password"
              type="password"
              label={isEditing ? t('user.newPassword') : `${t('form.password')} *`}
              value={form.password}
              onChange={(v) => { setForm(p => ({ ...p, password: String(v ?? '') })); if (errors.password) setErrors(e => ({ ...e, password: undefined })); }}
              required={!isEditing}
              size="sm"
              error={errors.password}
            />
          </div>
          <div className="col-6">
            <FormField
              name="role"
              type="select"
              label={t('user.profile')}
              value={form.role}
              onChange={(v) => setForm(p => ({ ...p, role: (v as 'admin' | 'user') ?? 'admin' }))}
              options={[
                { value: 'admin', label: t('user.admin') },
              ]}
              size="sm"
            />
          </div>
          <div className="col-6">
            <FormField name="ativo" type="checkbox" label={form.ativo ? t('status.active') : t('status.inactive')} value={form.ativo} onChange={(v) => setForm(p => ({ ...p, ativo: Boolean(v) }))} switch size="sm" />
          </div>
        </div>
      </form>
    </DraggableModal>
  );
};

export default SaasTenantUsuarioFormModal;
