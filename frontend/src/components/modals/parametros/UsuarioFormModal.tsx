import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UsuarioService } from '@/services/usuarioService';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useFormReset } from '@/hooks/useFormReset';
import { useUsuario, useGerarWebhookSecret } from '@/hooks/useUsuarios';
import DraggableModal from '@/components/common/DraggableModal';
import FormField from '@/components/ui/FormField';

interface UsuarioForm {
  nome: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  ativo: boolean;
}

interface UsuarioFormModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  usuarioId?: number | null;
}

const UsuarioFormModal: React.FC<UsuarioFormModalProps> = ({
  show,
  onClose,
  onSuccess,
  usuarioId
}) => {
  const isMobile = useIsMobile();
  const isEditing = !!usuarioId;
  const initialFormData: UsuarioForm = {
    nome: '',
    email: '',
    password: '',
    role: 'admin',
    ativo: true
  };

  const [formData, setFormData] = useState<UsuarioForm>(initialFormData);
  const [errors, setErrors] = useState<Partial<UsuarioForm>>({});
  const [webhookSecret, setWebhookSecret] = useState<string>('');
  const [isGeneratingSecret, setIsGeneratingSecret] = useState(false);
  const { success, error } = useNotificationContext();
  const queryClient = useQueryClient();

  const { data: usuarioData } = useUsuario(usuarioId || 0);
  const gerarWebhookSecretMutation = useGerarWebhookSecret();

  useEffect(() => {
    if (isEditing && usuarioData) {
      setFormData({
        nome: usuarioData.nome || '',
        email: usuarioData.email || '',
        password: '',
        role: usuarioData.role || 'admin',
        ativo: usuarioData.ativo !== undefined ? usuarioData.ativo : true
      });
      setWebhookSecret(usuarioData.webhook_secret || '');
      setErrors({});
    }
  }, [usuarioData, isEditing]);

  useFormReset({
    show: show && !isEditing,
    initialData: initialFormData,
    setFormData,
    setErrors
  });

  const createUsuarioMutation = useMutation({
    mutationFn: (data: UsuarioForm) => UsuarioService.create(data),
    onSuccess: () => {
      success('Usuário criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      onSuccess?.();
    },
    onError: (err: unknown) => {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao criar usuário';
      error(errorMessage);
    }
  });

  const updateUsuarioMutation = useMutation({
    mutationFn: (data: Partial<UsuarioForm>) => UsuarioService.update(usuarioId!, data),
    onSuccess: () => {
      success('Usuário atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      queryClient.invalidateQueries({ queryKey: ['usuario', usuarioId] });
      onSuccess?.();
    },
    onError: (err: unknown) => {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao atualizar usuário';
      error(errorMessage);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Partial<UsuarioForm> = {};
    if (!formData.nome.trim()) newErrors.nome = 'Nome é obrigatório';
    if (!formData.email.trim()) newErrors.email = 'Email é obrigatório';
    if (!isEditing && !formData.password.trim()) {
      newErrors.password = 'Senha é obrigatória';
    }
    if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Senha deve ter no mínimo 6 caracteres';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    try {
      if (isEditing) {
        const updateData: Partial<UsuarioForm> = {
          nome: formData.nome,
          email: formData.email,
          role: formData.role,
          ativo: formData.ativo
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        await updateUsuarioMutation.mutateAsync(updateData);
      } else {
        await createUsuarioMutation.mutateAsync(formData);
      }
    } catch (err) {
      // Erro já tratado no mutation
    }
  };

  const handleGenerateWebhookSecret = async () => {
    if (!usuarioId) return;
    
    setIsGeneratingSecret(true);
    try {
      const result = await gerarWebhookSecretMutation.mutateAsync(usuarioId);
      if (result.data?.webhook_secret) {
        setWebhookSecret(result.data.webhook_secret);
        success('Webhook secret gerado com sucesso!');
      }
    } catch (err) {
      // Erro já tratado no mutation
    } finally {
      setIsGeneratingSecret(false);
    }
  };

  const handleCopyWebhookSecret = () => {
    if (webhookSecret) {
      navigator.clipboard.writeText(webhookSecret);
      success('Webhook secret copiado!');
    }
  };

  const isPending = createUsuarioMutation.isPending || updateUsuarioMutation.isPending;

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={isEditing ? 'Editar Usuário' : 'Novo Usuário'}
      size="md"
      modalId="usuario-form-modal"
      headerActions={
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            disabled={isPending}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="usuario-form"
            className="btn btn-primary btn-sm"
            disabled={isPending}
          >
            Salvar
          </button>
        </div>
      }
    >
      <form id="usuario-form" onSubmit={handleSubmit} style={{ padding: isMobile ? '0' : '16px' }}>
        <div>
          <div className="row g-2 mb-3">
            <div className="col-md-12">
              <FormField
                name="nome"
                type="text"
                label="Nome"
                value={formData.nome}
                onChange={(value: unknown) => {
                  setFormData(prev => ({ ...prev, nome: String(value ?? '') }));
                  if (errors.nome) setErrors(prev => ({ ...prev, nome: undefined }));
                }}
                placeholder="Nome completo do usuário"
                required
                size="sm"
                error={errors.nome}
              />
            </div>
            <div className="col-md-12">
              <FormField
                name="email"
                type="email"
                label="Email"
                value={formData.email}
                onChange={(value: unknown) => {
                  setFormData(prev => ({ ...prev, email: String(value ?? '') }));
                  if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                }}
                placeholder="email@exemplo.com"
                required
                size="sm"
                error={errors.email}
              />
            </div>
            <div className="col-md-12">
              <FormField
                name="password"
                type="password"
                label={isEditing ? 'Nova Senha (deixe em branco para manter)' : 'Senha'}
                value={formData.password}
                onChange={(value: unknown) => {
                  setFormData(prev => ({ ...prev, password: String(value ?? '') }));
                  if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
                }}
                placeholder={isEditing ? 'Deixe em branco para manter a senha atual' : 'Mínimo 6 caracteres'}
                required={!isEditing}
                size="sm"
                error={errors.password}
              />
            </div>
            <div className="col-md-6">
              <FormField
                name="role"
                type="select"
                label="Perfil"
                value={formData.role}
                onChange={(value) => setFormData(prev => ({ ...prev, role: value as 'admin' | 'user' }))}
                options={[
                  { value: 'admin', label: 'Administrador' },
                  { value: 'user', label: 'Usuário' }
                ]}
                size="sm"
              />
            </div>
            <div className="col-md-6">
              <FormField
                name="ativo"
                type="checkbox"
                label="Ativo"
                value={formData.ativo}
                onChange={(value) => setFormData(prev => ({ ...prev, ativo: Boolean(value) }))}
                size="sm"
              />
            </div>
          </div>

          {isEditing && (
            <div className="row g-2 mb-3">
              <div className="col-md-12">
                <div className="mb-3">
                  <FormField
                    name="webhook_secret"
                    type="text"
                    label="Webhook Secret"
                    placeholder="Clique em Gerar token para criar um segredo"
                    size="sm"
                    value={webhookSecret}
                    readOnly
                    autoComplete="off"
                  />
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={handleGenerateWebhookSecret}
                      disabled={isPending || isGeneratingSecret}
                    >
                      {isGeneratingSecret ? 'Gerando...' : 'Gerar token'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={handleCopyWebhookSecret}
                      disabled={!webhookSecret}
                    >
                      Copiar
                    </button>
                  </div>
                  <small className="text-secondary d-block mt-1">
                    {webhookSecret
                      ? 'Utilize este token para autenticação de webhooks.'
                      : 'Clique em "Gerar token" para obter o segredo de webhook.'}
                  </small>
                </div>
              </div>
            </div>
          )}
        </div>
      </form>
    </DraggableModal>
  );
};

export default UsuarioFormModal;

