import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DraggableModal from '@/components/common/DraggableModal';
import { Button } from '@/components/ui';
import FormField from '@/components/ui/FormField';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { useFormReset } from '@/hooks/useFormReset';
import { saasTipoCobrancaService, type SaasTipoCobranca } from '@/services/saas/saasCrudService';

interface Props { show: boolean; onClose: () => void; onSuccess?: () => void; itemId?: number | null; }

const PERIODICIDADES = [
  { value: 'mensal', label: 'Mensal' },
  { value: 'bimestral', label: 'Bimestral' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral', label: 'Semestral' },
  { value: 'anual', label: 'Anual' },
  { value: 'quinzenal', label: 'Quinzenal' },
  { value: 'semanal', label: 'Semanal' },
];

interface Form {
  empresa_id: number | '';
  nome: string;
  quantidade_titulos: number;
  periodicidade: string;
  ativo: boolean;
}

const INITIAL: Form = { empresa_id: '', nome: '', quantidade_titulos: 1, periodicidade: 'mensal', ativo: true };

const SaasTipoCobrancaFormModal: React.FC<Props> = ({ show, onClose, onSuccess, itemId }) => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();
  const isEditing = !!itemId;
  const [form, setForm] = useState<Form>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});

  const { data } = useQuery({
    queryKey: ['saas-tipo-cobranca', itemId],
    queryFn: () => saasTipoCobrancaService.getById(itemId!),
    enabled: show && !!itemId,
  });

  useFormReset({ show: show && !isEditing, initialData: INITIAL, setFormData: setForm, setErrors });
  useFormReset({
    show: show && isEditing, initialData: INITIAL, setFormData: setForm, setErrors,
    customData: data?.data ? (() => {
      const d = data.data as unknown as SaasTipoCobranca;
      return { empresa_id: d.empresa_id, nome: d.nome, quantidade_titulos: d.quantidade_titulos ?? 1, periodicidade: d.periodicidade ?? 'mensal', ativo: d.ativo ?? true };
    })() : undefined,
  });

  const createMutation = useMutation({
    mutationFn: (d: Partial<SaasTipoCobranca>) => saasTipoCobrancaService.create(d),
    onSuccess: () => { success('Tipo de cobrança criado'); queryClient.invalidateQueries({ queryKey: ['saas-tipos-cobranca'] }); onSuccess?.(); },
    onError: (e: unknown) => error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao criar'),
  });
  const updateMutation = useMutation({
    mutationFn: (d: Partial<SaasTipoCobranca>) => saasTipoCobrancaService.update(itemId!, d),
    onSuccess: () => { success('Tipo de cobrança atualizado'); queryClient.invalidateQueries({ queryKey: ['saas-tipos-cobranca'] }); onSuccess?.(); },
    onError: (e: unknown) => error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao atualizar'),
  });
  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Partial<Record<keyof Form, string>> = {};
    if (!form.nome.trim()) errs.nome = 'Nome é obrigatório';
    if (form.empresa_id === '') errs.empresa_id = 'Empresa é obrigatória';
    if (form.quantidade_titulos < 1) errs.quantidade_titulos = 'Quantidade mínima é 1';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    try {
      const payload: Partial<SaasTipoCobranca> = {
        empresa_id: Number(form.empresa_id),
        nome: form.nome,
        quantidade_titulos: form.quantidade_titulos,
        periodicidade: form.periodicidade as SaasTipoCobranca['periodicidade'],
        ativo: form.ativo,
      };
      if (isEditing) await updateMutation.mutateAsync(payload);
      else await createMutation.mutateAsync(payload);
    } catch { /* tratado no mutation */ }
  };

  return (
    <DraggableModal show={show} onClose={onClose} title={isEditing ? 'Editar Tipo de Cobrança' : 'Novo Tipo de Cobrança'} size="md" modalId="saas-tipo-cobranca-form"
      headerActions={
        <div className="d-flex gap-2 modal-header-actions">
          <Button type="button" variant="primary" size="sm" onClick={onClose} disabled={isPending}>Cancelar</Button>
          <Button type="submit" form="saas-tipo-cobranca-form-id" variant="primary" size="sm" disabled={isPending}>Salvar</Button>
        </div>
      }
    >
      <form id="saas-tipo-cobranca-form-id" onSubmit={handleSubmit} style={{ padding: '16px' }}>
        <div className="row g-1">
          <div className="col-md-6">
            <FormField name="empresa_id" type="number" label="ID da Empresa *" value={form.empresa_id === '' ? '' : form.empresa_id}
              onChange={v => { setForm(p => ({ ...p, empresa_id: v !== '' && v != null ? Number(v) : '' })); if (errors.empresa_id) setErrors(e => ({ ...e, empresa_id: undefined })); }}
              min={1} required size="sm" error={errors.empresa_id} />
          </div>
          <div className="col-md-6">
            <FormField name="nome" type="text" label="Nome *" value={form.nome}
              onChange={v => { setForm(p => ({ ...p, nome: String(v ?? '') })); if (errors.nome) setErrors(e => ({ ...e, nome: undefined })); }}
              required size="sm" error={errors.nome} />
          </div>
          <div className="col-md-6">
            <FormField name="quantidade_titulos" type="number" label="Quantidade de títulos" value={form.quantidade_titulos}
              onChange={v => setForm(p => ({ ...p, quantidade_titulos: v !== '' && v != null ? Number(v) : 1 }))}
              min={1} size="sm" error={errors.quantidade_titulos} />
          </div>
          <div className="col-md-6">
            <FormField name="periodicidade" type="select" label="Periodicidade" value={form.periodicidade}
              onChange={v => setForm(p => ({ ...p, periodicidade: String(v ?? 'mensal') }))}
              options={PERIODICIDADES} size="sm" />
          </div>
          <div className="col-md-4">
            <FormField name="ativo" type="checkbox" label={form.ativo ? 'Ativo' : 'Inativo'} value={form.ativo}
              onChange={v => setForm(p => ({ ...p, ativo: Boolean(v) }))}
              switch size="sm" />
          </div>
        </div>
      </form>
    </DraggableModal>
  );
};

export default SaasTipoCobrancaFormModal;
