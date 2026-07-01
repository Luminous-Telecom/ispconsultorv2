import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UsuarioService } from 'services/usuarioService';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useFormReset } from 'hooks/useFormReset';
import { useUsuario, useGerarWebhookSecret } from 'hooks/useUsuarios';
import DraggableModal from 'components/common/DraggableModal';
import { CopiarButton, FormField, AtivoInativoField, GerarTokenButton, ModalFormActions } from 'components/ui';
import UsuarioAccountFormFields from 'components/forms/UsuarioAccountFormFields';
import { useI18n } from 'contexts/I18nContext';
import { useCopyToClipboard } from 'hooks/useCopyToClipboard';

interface UsuarioForm {
  nome: string;
  email: string;
  password: string;
  role: 'admin';
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
  const { success } = useNotificationContext();
  const { copy: copyToClipboard } = useCopyToClipboard({
    successMessage: t('messages.webhookTokenCopied'),
  });
  const { showApiError } = useApiError();
  const queryClient = useQueryClient();

  const { data: usuarioData } = useUsuario(usuarioId || 0);
  const gerarWebhookSecretMutation = useGerarWebhookSecret();

  useEffect(() => {
    if (isEditing && usuarioData) {
      setFormData({
        nome: usuarioData.nome || '',
        email: usuarioData.email || '',
        password: '',
        role: 'admin',
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
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.USER_CREATE_ERROR),
  });

  const updateUsuarioMutation = useMutation({
    mutationFn: (data: Partial<UsuarioForm>) => UsuarioService.update(usuarioId!, data),
    onSuccess: () => {
      success(t('user.successUpdate'));
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      queryClient.invalidateQueries({ queryKey: ['usuario', usuarioId] });
      onSuccess?.();
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.USER_UPDATE_ERROR),
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
          role: 'admin',
          ativo: formData.ativo
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        await updateUsuarioMutation.mutateAsync(updateData);
      } else {
        await createUsuarioMutation.mutateAsync({ ...formData, role: 'admin' });
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
      void copyToClipboard(webhookSecret);
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
        <ModalFormActions onCancel={onClose} formId="usuario-form" isPending={isPending} />
      }
  >
    <form id="usuario-form" onSubmit={handleSubmit} className="form-modal-simple">
      <div>
        <div className="row g-1 mb-0">
          <UsuarioAccountFormFields
            form={{
              nome: formData.nome,
              email: formData.email,
              password: formData.password,
            }}
            errors={{
              nome: errors.nome,
              email: errors.email,
              password: errors.password,
            }}
            onChange={(field, value) => {
              setFormData((prev) => ({ ...prev, [field]: value }));
              if (errors[field]) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next[field];
                  return next;
                });
              }
            }}
            isEditing={isEditing}
          />
          <div className="col-12">
            <AtivoInativoField
              value={formData.ativo}
              onChange={(v) => setFormData(prev => ({ ...prev, ativo: v }))}
              name="usuario-ativo"
            />
          </div>
        </div>

        {isEditing && (
          <div className="row g-1 mb-0">
            <div className="col-12">
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
                  <GerarTokenButton
                    type="button"
                    onClick={handleGenerateWebhookSecret}
                    isPending={isPending || isGeneratingSecret}
                    disabled={isPending || isGeneratingSecret}
                  />
                  <CopiarButton
                    type="button"
                    iconOnly
                    onClick={handleCopyWebhookSecret}
                    disabled={!webhookSecret}
                  />
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

