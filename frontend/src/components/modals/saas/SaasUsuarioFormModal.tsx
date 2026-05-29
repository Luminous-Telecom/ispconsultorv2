import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DraggableModal from 'components/common/DraggableModal';
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import { FormField, AtivoInativoField, ModalFormActions } from 'components/ui';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useFormReset } from 'hooks/useFormReset';
import { saasUsuariosService, type SaasUsuarioSuper, type SaasNivelAcesso } from 'services/saas/saasUsuariosService';

interface Props {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  usuarioId?: number | null;
}

interface UsuarioForm {
  nome: string;
  email: string;
  senha: string;
  nivel_acesso: SaasNivelAcesso;
  ativo: boolean;
}

const INITIAL: UsuarioForm = {
  nome: '',
  email: '',
  senha: '',
  nivel_acesso: 'admin',
  ativo: true,
};

const SaasUsuarioFormModal: React.FC<Props> = ({ show, onClose, onSuccess, usuarioId }) => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();
  const isEditing = !!usuarioId;
  const [form, setForm] = useState<UsuarioForm>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof UsuarioForm, string>>>({});

  const { data: usuarioData } = useQuery({
    queryKey: ['saas-usuario', usuarioId],
    queryFn: () => saasUsuariosService.getById(usuarioId!),
    enabled: show && !!usuarioId,
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
    customData: usuarioData?.data
      ? {
          nome: (usuarioData.data as SaasUsuarioSuper).nome,
          email: (usuarioData.data as SaasUsuarioSuper).email,
          senha: '',
          nivel_acesso: (usuarioData.data as SaasUsuarioSuper).nivel_acesso,
          ativo: (usuarioData.data as SaasUsuarioSuper).ativo,
        }
      : undefined,
  });

  const createMutation = useMutation({
    mutationFn: (data: UsuarioForm) => saasUsuariosService.create(data),
    onSuccess: () => {
      success('Usuário criado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['saas-usuarios'] });
      onSuccess?.();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao criar usuário';
      error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<UsuarioForm>) => saasUsuariosService.update(usuarioId!, data),
    onSuccess: () => {
      success('Usuário atualizado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['saas-usuarios'] });
      queryClient.invalidateQueries({ queryKey: ['saas-usuario', usuarioId] });
      onSuccess?.();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao atualizar usuário';
      error(msg);
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Partial<Record<keyof UsuarioForm, string>> = {};
    if (!form.nome.trim()) newErrors.nome = 'Nome é obrigatório';
    if (!form.email.trim()) newErrors.email = 'Email é obrigatório';
    if (!isEditing && !form.senha.trim()) newErrors.senha = 'Senha é obrigatória';
    if (form.senha && form.senha.length < 6) newErrors.senha = 'Senha deve ter no mínimo 6 caracteres';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});

    try {
      if (isEditing) {
        const payload: Partial<UsuarioForm> = { nome: form.nome, email: form.email, nivel_acesso: form.nivel_acesso, ativo: form.ativo };
        if (form.senha) payload.senha = form.senha;
        await updateMutation.mutateAsync(payload);
      } else {
        await createMutation.mutateAsync(form);
      }
    } catch {
      // tratado no mutation
    }
  };

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="Usuário SaaS"
      size="md"
      modalId="saas-usuario-form-modal"
      headerActions={
        <ModalFormActions onCancel={onClose} formId="saas-usuario-form" isPending={isPending} />
      }
    >
      <form id="saas-usuario-form" onSubmit={handleSubmit} style={{ padding: '16px' }}>
        <div className="row g-1">
          <div className="col-12">
            <FormField
              name="nome"
              type="text"
              label="Nome"
              value={form.nome}
              onChange={(v) => { setForm(p => ({ ...p, nome: String(v ?? '') })); if (errors.nome) setErrors(p => ({ ...p, nome: undefined })); }}
              required
              size="sm"
              error={errors.nome}
            />
          </div>
          <div className="col-12">
            <FormField
              name="email"
              type="email"
              label="Email"
              value={form.email}
              onChange={(v) => { setForm(p => ({ ...p, email: String(v ?? '') })); if (errors.email) setErrors(p => ({ ...p, email: undefined })); }}
              required
              size="sm"
              error={errors.email}
            />
          </div>
          <div className="col-12">
            <FormField
              name="senha"
              type="password"
              label={isEditing ? 'Nova Senha (deixe em branco para manter)' : 'Senha'}
              value={form.senha}
              onChange={(v) => { setForm(p => ({ ...p, senha: String(v ?? '') })); if (errors.senha) setErrors(p => ({ ...p, senha: undefined })); }}
              required={!isEditing}
              placeholder={isEditing ? 'Deixe em branco para não alterar' : ''}
              size="sm"
              error={errors.senha}
            />
          </div>
          <div className="col-md-6">
            <FormField
              name="nivel_acesso"
              type="select"
              label="Nível de Acesso"
              value={form.nivel_acesso}
              onChange={(v) => setForm(p => ({ ...p, nivel_acesso: v as SaasNivelAcesso }))}
              options={[
                { value: 'super', label: 'Super' },
                { value: 'admin', label: 'Admin' },
                { value: 'suporte', label: 'Suporte' },
              ]}
              size="sm"
            />
          </div>
          <div className="col-md-6">
            <AtivoInativoField
              value={form.ativo}
              onChange={(v) => setForm(p => ({ ...p, ativo: v }))}
              name="saas-usuario-ativo"
            />
          </div>
        </div>
      </form>
    </DraggableModal>
  );
};

export default SaasUsuarioFormModal;
