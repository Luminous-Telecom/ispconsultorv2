import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DraggableModal from '@/components/common/DraggableModal';
import { Button } from '@/components/ui';
import FormField from '@/components/ui/FormField';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { useFormReset } from '@/hooks/useFormReset';
import { saasServidorEmailService, type SaasServidorEmail } from '@/services/saas/saasConfigService';

interface Props { show: boolean; onClose: () => void; onSuccess?: () => void; itemId?: number | null; }

interface Form {
  nome: string;
  host_smtp: string;
  porta: number;
  usuario: string;
  senha_criptografada: string;
  ssl: boolean;
  status: 'ativo' | 'inativo' | 'erro';
}

const INITIAL: Form = { nome: '', host_smtp: '', porta: 587, usuario: '', senha_criptografada: '', ssl: true, status: 'ativo' };

const SaasServidorEmailFormModal: React.FC<Props> = ({ show, onClose, onSuccess, itemId }) => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();
  const isEditing = !!itemId;
  const [form, setForm] = useState<Form>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});

  const { data } = useQuery({
    queryKey: ['saas-servidor-email', itemId],
    queryFn: () => saasServidorEmailService.getById(itemId!),
    enabled: show && !!itemId,
  });

  useFormReset({ show: show && !isEditing, initialData: INITIAL, setFormData: setForm, setErrors });
  useFormReset({
    show: show && isEditing, initialData: INITIAL, setFormData: setForm, setErrors,
    customData: data?.data ? {
      nome: (data.data as SaasServidorEmail).nome,
      host_smtp: (data.data as SaasServidorEmail).host_smtp,
      porta: (data.data as SaasServidorEmail).porta,
      usuario: (data.data as SaasServidorEmail).usuario,
      senha_criptografada: (data.data as SaasServidorEmail).senha_criptografada,
      ssl: (data.data as SaasServidorEmail).ssl,
      status: (data.data as SaasServidorEmail).status,
    } : undefined,
  });

  const createMutation = useMutation({
    mutationFn: (d: Partial<SaasServidorEmail>) => saasServidorEmailService.create(d),
    onSuccess: () => { success('Servidor criado'); queryClient.invalidateQueries({ queryKey: ['saas-servidores-email'] }); onSuccess?.(); },
    onError: (e: unknown) => error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao criar'),
  });
  const updateMutation = useMutation({
    mutationFn: (d: Partial<SaasServidorEmail>) => saasServidorEmailService.update(itemId!, d),
    onSuccess: () => { success('Servidor atualizado'); queryClient.invalidateQueries({ queryKey: ['saas-servidores-email'] }); onSuccess?.(); },
    onError: (e: unknown) => error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao atualizar'),
  });
  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Partial<Record<keyof Form, string>> = {};
    if (!form.nome.trim()) errs.nome = 'Nome é obrigatório';
    if (!form.host_smtp.trim()) errs.host_smtp = 'Host SMTP é obrigatório';
    if (!form.usuario.trim()) errs.usuario = 'Usuário é obrigatório';
    if (!form.senha_criptografada.trim()) errs.senha_criptografada = 'Senha é obrigatória';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    try {
      const payload = { ...form };
      if (isEditing) await updateMutation.mutateAsync(payload);
      else await createMutation.mutateAsync(payload);
    } catch { /* tratado no mutation */ }
  };

  return (
    <DraggableModal show={show} onClose={onClose} title={isEditing ? 'Editar Servidor Email' : 'Novo Servidor Email'} size="md" modalId="saas-servidor-email-form"
      headerActions={<div className="d-flex gap-2 modal-header-actions">
        <Button type="button" variant="primary" size="sm" onClick={onClose} disabled={isPending}>Cancelar</Button>
        <Button type="submit" form="saas-servidor-email-form-id" variant="primary" size="sm" disabled={isPending}>Salvar</Button>
      </div>}
    >
      <form id="saas-servidor-email-form-id" onSubmit={handleSubmit} style={{ padding: '16px' }}>
        <div className="row g-1">
          <div className="col-md-12">
            <FormField name="nome" type="text" label="Nome *" value={form.nome}
              onChange={v => { setForm(p => ({ ...p, nome: String(v ?? '') })); if (errors.nome) setErrors(p => ({ ...p, nome: undefined })); }}
              required size="sm" error={errors.nome} />
          </div>
          <div className="col-md-8">
            <FormField name="host_smtp" type="text" label="Host SMTP *" value={form.host_smtp}
              onChange={v => { setForm(p => ({ ...p, host_smtp: String(v ?? '') })); if (errors.host_smtp) setErrors(p => ({ ...p, host_smtp: undefined })); }}
              required size="sm" error={errors.host_smtp} />
          </div>
          <div className="col-md-4">
            <FormField name="porta" type="number" label="Porta" value={form.porta}
              onChange={v => setForm(p => ({ ...p, porta: Number(v ?? 587) }))} min={1} max={65535} size="sm" />
          </div>
          <div className="col-12">
            <FormField name="usuario" type="text" label="Usuário *" value={form.usuario}
              onChange={v => { setForm(p => ({ ...p, usuario: String(v ?? '') })); if (errors.usuario) setErrors(p => ({ ...p, usuario: undefined })); }}
              required size="sm" error={errors.usuario} />
          </div>
          <div className="col-12">
            <FormField name="senha_criptografada" type="password" label="Senha *" value={form.senha_criptografada}
              onChange={v => { setForm(p => ({ ...p, senha_criptografada: String(v ?? '') })); if (errors.senha_criptografada) setErrors(p => ({ ...p, senha_criptografada: undefined })); }}
              required size="sm" error={errors.senha_criptografada} />
          </div>
          <div className="col-md-4">
            <FormField name="ssl" type="select" label="SSL" value={form.ssl ? 'true' : 'false'}
              onChange={v => setForm(p => ({ ...p, ssl: v === 'true' }))}
              options={[{ value: 'true', label: 'Sim' }, { value: 'false', label: 'Não' }]} size="sm" />
          </div>
          <div className="col-md-4">
            <FormField name="status" type="select" label="Status" value={form.status}
              onChange={v => setForm(p => ({ ...p, status: v as Form['status'] }))}
              options={[{ value: 'ativo', label: 'Ativo' }, { value: 'inativo', label: 'Inativo' }, { value: 'erro', label: 'Erro' }]} size="sm" />
          </div>
        </div>
      </form>
    </DraggableModal>
  );
};

export default SaasServidorEmailFormModal;
