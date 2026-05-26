import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DraggableModal from 'components/common/DraggableModal';
import { ModalFormActions } from 'components/ui';
import FormField from 'components/ui/FormField';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useFormReset } from 'hooks/useFormReset';
import { saasServidorWhatsappService, type SaasServidorWhatsapp } from 'services/saas/saasConfigService';

interface Props { show: boolean; onClose: () => void; onSuccess?: () => void; itemId?: number | null; }

interface Form {
  nome: string;
  url_api: string;
  token: string;
  numero: string;
  status: 'ativo' | 'inativo' | 'erro';
  limite_mensagens: number | '';
}

const INITIAL: Form = { nome: '', url_api: '', token: '', numero: '', status: 'ativo', limite_mensagens: '' };

const SaasServidorWhatsappFormModal: React.FC<Props> = ({ show, onClose, onSuccess, itemId }) => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();
  const isEditing = !!itemId;
  const [form, setForm] = useState<Form>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});

  const { data } = useQuery({
    queryKey: ['saas-servidor-whatsapp', itemId],
    queryFn: () => saasServidorWhatsappService.getById(itemId!),
    enabled: show && !!itemId,
  });

  useFormReset({ show: show && !isEditing, initialData: INITIAL, setFormData: setForm, setErrors });
  useFormReset({
    show: show && isEditing, initialData: INITIAL, setFormData: setForm, setErrors,
    customData: data?.data ? {
      nome: (data.data as SaasServidorWhatsapp).nome,
      url_api: (data.data as SaasServidorWhatsapp).url_api,
      token: (data.data as SaasServidorWhatsapp).token || '',
      numero: (data.data as SaasServidorWhatsapp).numero || '',
      status: (data.data as SaasServidorWhatsapp).status,
      limite_mensagens: (data.data as SaasServidorWhatsapp).limite_mensagens ?? '',
    } : undefined,
  });

  const createMutation = useMutation({
    mutationFn: (d: Partial<SaasServidorWhatsapp>) => saasServidorWhatsappService.create(d),
    onSuccess: () => { success('Servidor criado'); queryClient.invalidateQueries({ queryKey: ['saas-servidores-whatsapp'] }); onSuccess?.(); },
    onError: (e: unknown) => error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao criar'),
  });
  const updateMutation = useMutation({
    mutationFn: (d: Partial<SaasServidorWhatsapp>) => saasServidorWhatsappService.update(itemId!, d),
    onSuccess: () => { success('Servidor atualizado'); queryClient.invalidateQueries({ queryKey: ['saas-servidores-whatsapp'] }); onSuccess?.(); },
    onError: (e: unknown) => error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao atualizar'),
  });
  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Partial<Record<keyof Form, string>> = {};
    if (!form.nome.trim()) errs.nome = 'Nome é obrigatório';
    if (!form.url_api.trim()) errs.url_api = 'URL da API é obrigatória';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    try {
      const payload: Partial<SaasServidorWhatsapp> = {
        nome: form.nome, url_api: form.url_api,
        token: form.token || null, numero: form.numero || null, status: form.status,
        limite_mensagens: form.limite_mensagens !== '' ? Number(form.limite_mensagens) : null,
      };
      if (isEditing) await updateMutation.mutateAsync(payload);
      else await createMutation.mutateAsync(payload);
    } catch { /* tratado no mutation */ }
  };

  return (
    <DraggableModal show={show} onClose={onClose} title="Servidor WhatsApp" size="md" modalId="saas-servidor-whatsapp-form"
      headerActions={<ModalFormActions onCancel={onClose} formId="saas-servidor-whatsapp-form-id" isPending={isPending} />}
    >
      <form id="saas-servidor-whatsapp-form-id" onSubmit={handleSubmit} style={{ padding: '16px' }}>
        <div className="row g-1">
          <div className="col-md-12">
            <FormField name="nome" type="text" label="Nome *" value={form.nome}
              onChange={v => { setForm(p => ({ ...p, nome: String(v ?? '') })); if (errors.nome) setErrors(p => ({ ...p, nome: undefined })); }}
              required size="sm" error={errors.nome} />
          </div>
          <div className="col-12">
            <FormField name="url_api" type="text" label="URL da API *" value={form.url_api}
              onChange={v => { setForm(p => ({ ...p, url_api: String(v ?? '') })); if (errors.url_api) setErrors(p => ({ ...p, url_api: undefined })); }}
              required size="sm" error={errors.url_api} />
          </div>
          <div className="col-md-6">
            <FormField name="token" type="text" label="Token" value={form.token}
              onChange={v => setForm(p => ({ ...p, token: String(v ?? '') }))} size="sm" />
          </div>
          <div className="col-md-6">
            <FormField name="numero" type="text" label="Número" value={form.numero}
              onChange={v => setForm(p => ({ ...p, numero: String(v ?? '') }))} size="sm" />
          </div>
          <div className="col-md-4">
            <FormField name="status" type="select" label="Status" value={form.status}
              onChange={v => setForm(p => ({ ...p, status: v as Form['status'] }))}
              options={[{ value: 'ativo', label: 'Ativo' }, { value: 'inativo', label: 'Inativo' }, { value: 'erro', label: 'Erro' }]} size="sm" />
          </div>
          <div className="col-md-4">
            <FormField name="limite_mensagens" type="number" label="Limite Mensagens" value={form.limite_mensagens === '' ? '' : form.limite_mensagens}
              onChange={v => setForm(p => ({ ...p, limite_mensagens: v !== '' && v != null ? Number(v) : '' }))}
              min={0} size="sm" />
          </div>
        </div>
      </form>
    </DraggableModal>
  );
};

export default SaasServidorWhatsappFormModal;
