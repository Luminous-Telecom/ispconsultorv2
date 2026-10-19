import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UsuarioService } from 'services/usuarioService';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useFormReset } from 'hooks/useFormReset';
import { useUsuario, useGerarWebhookSecret, useResetUsuario2fa } from 'hooks/useUsuarios';
import DraggableModal from 'components/common/DraggableModal';
import { AppButton, CopyableFormField, AtivoInativoField, EntityIdField, GerarTokenButton, ModalFormActions } from 'components/ui';
import UsuarioAccountFormFields from 'components/forms/UsuarioAccountFormFields';
import { useI18n } from 'contexts/I18nContext';

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
  const { showApiError } = useApiError();
  const queryClient = useQueryClient();

  const { data: usuarioData } = useUsuario(usuarioId || 0);
  const gerarWebhookSecretMutation = useGerarWebhookSecret();
  const reset2faMutation = useResetUsuario2fa();
  const [totpEnabled, setTotpEnabled] = useState(false);

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
      setTotpEnabled(!!usuarioData.totp_enabled);
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

  const handleReset2fa = async () => {
    if (!usuarioId || !totpEnabled) return;
    if (!window.confirm(t('security.adminResetConfirm'))) return;
    try {
      await reset2faMutation.mutateAsync(usuarioId);
      setTotpEnabled(false);
    } catch {
      // Erro já tratado no mutation
    }
  };

  const isPending =
    createUsuarioMutation.isPending ||
    updateUsuarioMutation.isPending ||
    reset2faMutation.isPending;

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
          <EntityIdField id={usuarioId} />
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
              <CopyableFormField
                name="webhook_secret"
                type="text"
                label={t('user.webhookSecret')}
                placeholder={t('user.generateWebhookHelp')}
                size="sm"
                value={webhookSecret}
                readOnly
                autoComplete="off"
                copyKey="usuario-webhook-secret"
                footerActions={
                  <GerarTokenButton
                    type="button"
                    onClick={handleGenerateWebhookSecret}
                    isPending={isPending || isGeneratingSecret}
                    disabled={isPending || isGeneratingSecret}
                  />
                }
                footerHint={
                  !webhookSecret ? (
                    <small className="form-helper-message mt-1">
                      {t('user.generateWebhookHelp')}
                    </small>
                  ) : undefined
                }
              />
            </div>
            <div className="col-12">
              <AtivoInativoField
                value={totpEnabled}
                onChange={() => undefined}
                label={t('security.twoFactorEnabled')}
                name="usuario-totp-enabled"
                disabled
              />
            </div>
            {totpEnabled && (
              <div className="col-12 form-modal-input-col">
                <AppButton
                  label={t('security.adminReset')}
                  variant="danger"
                  size="sm"
                  type="button"
                  onClick={handleReset2fa}
                  disabled={isPending}
                  isPending={reset2faMutation.isPending}
                />
                <small className="form-helper-message mt-1 d-block">
                  {t('security.adminResetHelp')}
                </small>
              </div>
            )}
          </div>
        )}
      </div>
    </form>
  </DraggableModal>
  );
};

export default UsuarioFormModal;

