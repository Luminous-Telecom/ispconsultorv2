import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UsuarioService } from '@/services/usuarioService';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useFormReset } from '@/hooks/useFormReset';
import { useUsuario, useGerarWebhookSecret } from '@/hooks/useUsuarios';
import DraggableModal from '@/components/common/DraggableModal';
import { Button } from '@/components/ui';
import FormField from '@/components/ui/FormField';
import { useI18n } from '@/contexts/I18nContext';

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
  const { t } = useI18n();
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
      success(t('user.successCreate'));
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      onSuccess?.();
    },
    onError: (err: unknown) => {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || t('user.errorCreate');
      error(errorMessage);
    }
  });

  const updateUsuarioMutation = useMutation({
    mutationFn: (data: Partial<UsuarioForm>) => UsuarioService.update(usuarioId!, data),
    onSuccess: () => {
      success(t('user.successUpdate'));
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      queryClient.invalidateQueries({ queryKey: ['usuario', usuarioId] });
      onSuccess?.();
    },
    onError: (err: unknown) => {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || t('user.errorUpdate');
      error(errorMessage);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Partial<UsuarioForm> = {};
    if (!formData.nome.trim()) newErrors.nome = t('messages.nameRequired');
    if (!formData.email.trim()) newErrors.email = t('messages.emailRequired');
    if (!isEditing && !formData.password.trim()) {
      newErrors.password = t('messages.passwordRequired');
    }
    if (formData.password && formData.password.length < 6) {
      newErrors.password = t('messages.passwordMinLength');
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
      title={t('user.title')}
      size="md"
      modalId="usuario-form-modal"
      headerActions={
        <div className="d-flex gap-2 modal-header-actions">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onClose}
            disabled={isPending}
          >
            {t('actions.cancel')}
          </Button>
          <Button
            type="submit"
            form="usuario-form"
            variant="primary"
            size="sm"
            disabled={isPending}
          >
            {t('actions.save')}
          </Button>
        </div>
      }
  >
    <form id="usuario-form" onSubmit={handleSubmit} style={{ padding: isMobile ? '0' : '16px' }}>
      <div>
        <div className="row g-1 mb-0">
          <div className="col-md-12">
            <FormField
              name="nome"
              type="text"
              label={t('form.name')}
              value={formData.nome}
              onChange={(value: unknown) => {
                setFormData(prev => ({ ...prev, nome: String(value ?? '') }));
                if (errors.nome) setErrors(prev => ({ ...prev, nome: undefined }));
              }}
              placeholder={t('placeholder.enterName')}
              required
              size="sm"
              error={errors.nome}
            />
          </div>
          <div className="col-md-12">
            <FormField
              name="email"
              type="email"
              label={t('form.email')}
              value={formData.email}
              onChange={(value: unknown) => {
                setFormData(prev => ({ ...prev, email: String(value ?? '') }));
                if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
              }}
              placeholder={t('placeholder.enterEmail')}
              required
              size="sm"
              error={errors.email}
            />
          </div>
          <div className="col-md-12">
            <FormField
              name="password"
              type="password"
              label={isEditing ? t('user.newPassword') : t('form.password')}
              value={formData.password}
              onChange={(value: unknown) => {
                setFormData(prev => ({ ...prev, password: String(value ?? '') }));
                if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
              }}
              placeholder={isEditing ? t('user.newPasswordPlaceholder') : t('user.passwordPlaceholder')}
              required={!isEditing}
              size="sm"
              error={errors.password}
            />
          </div>
          <div className="col-md-6">
            <FormField
              name="role"
              type="select"
              label={t('user.profile')}
              value={formData.role}
              onChange={(value) => setFormData(prev => ({ ...prev, role: value as 'admin' | 'user' }))}
              options={[
                { value: 'admin', label: t('user.admin') },
                { value: 'user', label: t('user.user') }
              ]}
              size="sm"
            />
          </div>
          <div className="col-md-6">
            <FormField
              name="ativo"
              type="checkbox"
              label={t('form.active')}
              value={formData.ativo}
              onChange={(value) => setFormData(prev => ({ ...prev, ativo: Boolean(value) }))}
              size="sm"
            />
          </div>
        </div>

        {isEditing && (
          <div className="row g-1 mb-0">
            <div className="col-md-12">
              <div className="mb-3">
                <FormField
                  name="webhook_secret"
                  type="text"
                  label={t('user.webhookSecret')}
                  placeholder={t('user.generateWebhookHelp')}
                  size="sm"
                  value={webhookSecret}
                  readOnly
                  autoComplete="off"
                />
                <div className="d-flex flex-wrap gap-2 mt-2">
                  <Button
                    type="button"
                    variant="outline-primary"
                    size="sm"
                    onClick={handleGenerateWebhookSecret}
                    disabled={isPending || isGeneratingSecret}
                  >
                    {t('user.generateToken')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline-primary"
                    size="sm"
                    onClick={handleCopyWebhookSecret}
                    disabled={!webhookSecret}
                  >
                    {t('user.copy')}
                  </Button>
                </div>
                <small className="text-secondary d-block mt-1">
                  {webhookSecret
                    ? t('user.webhookHelp')
                    : t('user.generateWebhookHelp')}
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

