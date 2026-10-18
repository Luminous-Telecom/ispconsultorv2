import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { startRegistration } from '@simplewebauthn/browser';
import DraggableModal from 'components/common/DraggableModal';
import {
  AppButton,
  AtivoInativoField,
  BaixarButton,
  ConfirmarButton,
  CopiarIconButton,
  CopyableFormField,
  FormField,
  LabelWithHelp,
  Loading,
  ModalFormActions,
  RemoverButton,
} from 'components/ui';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { authService } from 'services/authService';
import { useI18n } from 'contexts/I18nContext';
import { useModal } from 'contexts/ModalContext';
import { CACHE_CONFIG } from 'config/api';

export type SegurancaUsuarioPanel = 'all' | 'security';

interface SegurancaUsuarioModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  onHeaderActionsReady?: (actions: React.ReactNode) => void;
  /** Em Conf. do usuário: só 2FA/passkeys/e-mail (dispositivos ficam na aba própria). */
  panel?: SegurancaUsuarioPanel;
}

type Step = 'status' | 'setup' | 'recovery' | 'disable';

const SegurancaUsuarioModal: React.FC<SegurancaUsuarioModalProps> = ({
  show,
  onClose,
  skipWrapper = false,
  onHeaderActionsReady,
  panel = 'all',
}) => {
  const { t } = useI18n();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const { openModal } = useModal();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>('status');
  const [setupSecret, setSetupSecret] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [isPending, setIsPending] = useState(false);

  const { data: status, isLoading } = useQuery({
    queryKey: ['auth-2fa-status'],
    queryFn: async () => {
      const res = await authService.getTwoFactorStatus();
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Falha ao carregar status');
      }
      return res.data;
    },
    enabled: show,
    staleTime: 0,
    gcTime: CACHE_CONFIG.DEFAULT_CACHE_TIME,
  });

  const invalidateStatus = () => {
    queryClient.invalidateQueries({ queryKey: ['auth-2fa-status'] });
  };

  const resetLocal = useCallback(() => {
    setStep('status');
    setSetupSecret('');
    setQrDataUrl('');
    setConfirmCode('');
    setDisablePassword('');
    setDisableCode('');
    setRecoveryCodes([]);
    setIsPending(false);
  }, []);

  useEffect(() => {
    if (!show) {
      resetLocal();
    }
  }, [show, resetLocal]);

  const handleClose = useCallback(() => {
    resetLocal();
    onClose();
  }, [onClose, resetLocal]);

  const handleStartSetup = async () => {
    setIsPending(true);
    try {
      const res = await authService.setupTwoFactor();
      if (!res.success || !res.data) {
        showApiError(res.message || CONTEXT_ERROR_MESSAGES.USER_UPDATE_ERROR);
        return;
      }
      setSetupSecret(res.data.secret);
      setQrDataUrl(res.data.qr_data_url);
      setConfirmCode('');
      setStep('setup');
    } catch (err) {
      showApiError(err, CONTEXT_ERROR_MESSAGES.USER_UPDATE_ERROR);
    } finally {
      setIsPending(false);
    }
  };

  const handleConfirmSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(confirmCode.trim())) {
      showApiError(t('security.invalidCode'));
      return;
    }
    setIsPending(true);
    try {
      const res = await authService.confirmTwoFactor(confirmCode.trim());
      if (!res.success || !res.data) {
        showApiError(res.message || CONTEXT_ERROR_MESSAGES.USER_UPDATE_ERROR);
        return;
      }
      setRecoveryCodes(res.data.recovery_codes);
      setStep('recovery');
      invalidateStatus();
      success(t('security.enabledSuccess'));
    } catch (err) {
      showApiError(err, CONTEXT_ERROR_MESSAGES.USER_UPDATE_ERROR);
    } finally {
      setIsPending(false);
    }
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disablePassword || !disableCode.trim()) {
      showApiError(t('security.disableFieldsRequired'));
      return;
    }
    if (!window.confirm(t('security.confirmDisable'))) {
      return;
    }
    setIsPending(true);
    try {
      const res = await authService.disableTwoFactor(disablePassword, disableCode.trim());
      if (!res.success) {
        showApiError(res.message || CONTEXT_ERROR_MESSAGES.USER_UPDATE_ERROR);
        return;
      }
      success(t('security.disabledSuccess'));
      invalidateStatus();
      resetLocal();
    } catch (err) {
      showApiError(err, CONTEXT_ERROR_MESSAGES.USER_UPDATE_ERROR);
    } finally {
      setIsPending(false);
    }
  };

  const handleToggleEmail2fa = async (enabled: boolean) => {
    if (!status?.smtp_configured && enabled) {
      showApiError(t('security.emailSmtpRequired'));
      return;
    }
    setIsPending(true);
    try {
      const res = await authService.setEmailTwoFactor(enabled);
      if (!res.success) {
        showApiError(res.message || CONTEXT_ERROR_MESSAGES.USER_UPDATE_ERROR);
        return;
      }
      success(enabled ? t('security.emailEnabledSuccess') : t('security.emailDisabledSuccess'));
      invalidateStatus();
    } catch (err) {
      showApiError(err, CONTEXT_ERROR_MESSAGES.USER_UPDATE_ERROR);
    } finally {
      setIsPending(false);
    }
  };

  const handleAddPasskey = async () => {
    setIsPending(true);
    try {
      const optionsRes = await authService.webauthnRegisterOptions();
      if (!optionsRes.success || !optionsRes.data) {
        showApiError(optionsRes.message || CONTEXT_ERROR_MESSAGES.USER_UPDATE_ERROR);
        return;
      }
      const credential = await startRegistration({
        optionsJSON: optionsRes.data as unknown as Parameters<
          typeof startRegistration
        >[0]['optionsJSON'],
      });
      const res = await authService.webauthnRegisterVerify(credential);
      if (!res.success) {
        showApiError(res.message || CONTEXT_ERROR_MESSAGES.USER_UPDATE_ERROR);
        return;
      }
      success(t('security.passkeyAddedSuccess'));
      invalidateStatus();
    } catch (err) {
      showApiError(err, CONTEXT_ERROR_MESSAGES.USER_UPDATE_ERROR);
    } finally {
      setIsPending(false);
    }
  };

  const handleRemovePasskey = async (id: number) => {
    if (!window.confirm(t('security.passkeyRemoveConfirm'))) return;
    setIsPending(true);
    try {
      const res = await authService.removePasskey(id);
      if (!res.success) {
        showApiError(res.message || CONTEXT_ERROR_MESSAGES.USER_UPDATE_ERROR);
        return;
      }
      success(t('security.passkeyRemovedSuccess'));
      invalidateStatus();
    } catch (err) {
      showApiError(err, CONTEXT_ERROR_MESSAGES.USER_UPDATE_ERROR);
    } finally {
      setIsPending(false);
    }
  };

  const recoveryJoined = recoveryCodes.join('\n');

  const handleDownloadRecoveryCodes = () => {
    if (!recoveryJoined.trim()) return;
    const blob = new Blob([`${t('security.recoveryCodes')}\n\n${recoveryJoined}\n`], {
      type: 'text/plain;charset=utf-8',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'codigos-recuperacao-2fa.txt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    success(t('security.downloadRecoverySuccess'));
  };

  const headerActionsContent = useMemo(() => {
    if (step === 'setup') {
      return (
        <ModalFormActions
          onCancel={() => setStep('status')}
          formId="seguranca-2fa-setup-form"
          isPending={isPending}
        />
      );
    }
    if (step === 'disable') {
      return (
        <ModalFormActions
          onCancel={() => setStep('status')}
          formId="seguranca-2fa-disable-form"
          isPending={isPending}
        />
      );
    }
    if (step === 'recovery') {
      return (
        <div className="modal-header-buttons d-flex gap-2 modal-header-actions">
          <ConfirmarButton type="button" onClick={handleClose} />
        </div>
      );
    }
    // Status: só o X do DraggableModal (sem Fechar no header)
    return null;
  }, [step, isPending, handleClose]);

  useLayoutEffect(() => {
    if (!skipWrapper || !onHeaderActionsReady) return;
    if (!show) {
      onHeaderActionsReady(null);
      return;
    }
    onHeaderActionsReady(headerActionsContent);
    return () => {
      onHeaderActionsReady(null);
    };
  }, [skipWrapper, onHeaderActionsReady, headerActionsContent, show]);

  const formatDateTime = (value: string) => {
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  };

  const showSecurityPanel = panel === 'all' || panel === 'security';

  const content = isLoading ? (
    <Loading variant="modal" />
  ) : (
    <div className="form-modal-simple">
      {step === 'status' && showSecurityPanel && (
        <>
          {/* Aplicativo autenticador (TOTP) */}
          <div className="form-section-heading-row">
            <span className="form-section-heading-pill">{t('security.totpSection')}</span>
            <div className="form-section-heading-line" aria-hidden />
          </div>
          <div className="row g-2 mb-3">
            <div className="col-12">
              <AtivoInativoField
                value={!!status?.totp_enabled}
                onChange={() => undefined}
                label={t('security.twoFactorEnabled')}
                name="totp-enabled"
                helpText={t('security.description')}
                disabled
              />
            </div>
            {status?.totp_enabled && (
              <div className="col-12">
                <FormField
                  name="recovery_remaining"
                  type="text"
                  label={t('security.recoveryRemaining')}
                  value={String(status.recovery_codes_remaining)}
                  readOnly
                  disabled
                  size="sm"
                />
              </div>
            )}
            <div className="col-12">
              <div className="form-modal-input-col d-flex flex-wrap gap-2">
                {!status?.totp_enabled ? (
                  <AppButton
                    label={t('security.enable')}
                    variant="primary"
                    size="sm"
                    onClick={handleStartSetup}
                    disabled={isPending}
                    isPending={isPending}
                  />
                ) : (
                  <AppButton
                    label={t('security.disable')}
                    variant="danger"
                    size="sm"
                    onClick={() => setStep('disable')}
                    disabled={isPending}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Chaves de acesso (passkeys) */}
          <div className="form-section-heading-row">
            <span className="form-section-heading-pill">{t('security.passkeySection')}</span>
            <div className="form-section-heading-line" aria-hidden />
          </div>
          <div className="row g-2 mb-3">
            <div className="col-12">
              <div className="form-field">
                <LabelWithHelp as="span" className="form-label small" helpText={t('security.passkeyHelp')}>
                  {t('security.passkeySection')}
                </LabelWithHelp>
                <div className="form-field-control">
                  <div className="d-flex flex-column gap-2 w-100">
                    {(status?.passkeys || []).map((pk) => (
                      <div
                        key={pk.id}
                        className="d-flex align-items-center justify-content-between gap-2 flex-wrap"
                      >
                        <span className="small">
                          {pk.device_name || t('security.passkeyDefaultName')} — {formatDateTime(pk.created_at)}
                        </span>
                        <RemoverButton
                          type="button"
                          size="sm"
                          onClick={() => handleRemovePasskey(pk.id)}
                          disabled={isPending}
                        />
                      </div>
                    ))}
                    <AppButton
                      label={t('security.passkeyAdd')}
                      variant="primary"
                      size="sm"
                      onClick={handleAddPasskey}
                      disabled={isPending}
                      isPending={isPending}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Autenticação por e-mail */}
          <div className="form-section-heading-row">
            <span className="form-section-heading-pill">{t('security.emailSection')}</span>
            <div className="form-section-heading-line" aria-hidden />
          </div>
          <div className="row g-2 mb-3">
            <div className="col-12">
              <AtivoInativoField
                value={!!status?.email_2fa_enabled}
                onChange={(v) => handleToggleEmail2fa(v)}
                label={t('security.emailEnabled')}
                name="email-2fa-enabled"
                helpText={
                  status?.smtp_configured
                    ? t('security.emailHelp')
                    : t('security.emailSmtpRequired')
                }
                disabled={isPending || !status?.smtp_configured}
              />
            </div>
            {!status?.smtp_configured && (
              <div className="col-12">
                <div className="form-modal-input-col">
                  <AppButton
                    label={t('security.emailConfigureSmtp')}
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      handleClose();
                      openModal('servidor-email');
                    }}
                    disabled={isPending}
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {step === 'setup' && showSecurityPanel && (
        <form id="seguranca-2fa-setup-form" onSubmit={handleConfirmSetup}>
          <div className="form-section-heading-row">
            <span className="form-section-heading-pill">{t('security.enable')}</span>
            <div className="form-section-heading-line" aria-hidden />
          </div>
          <div className="row g-2">
            {qrDataUrl && (
              <div className="col-12">
                <div className="form-field">
                  <LabelWithHelp as="span" className="form-label small" helpText={t('security.setupHelp')}>
                    {t('security.qrAlt')}
                  </LabelWithHelp>
                  <div className="form-field-control">
                    <img
                      src={qrDataUrl}
                      alt={t('security.qrAlt')}
                      className="img-fluid seguranca-2fa-qr"
                      width={220}
                      height={220}
                    />
                  </div>
                </div>
              </div>
            )}
            <div className="col-12">
              <CopyableFormField
                name="totp_secret"
                label={t('security.manualSecret')}
                value={setupSecret}
                readOnly
                size="sm"
                copyKey="totp-secret"
                helpText={!qrDataUrl ? t('security.setupHelp') : undefined}
              />
            </div>
            <div className="col-12">
              <FormField
                name="totp_code"
                type="text"
                label={t('security.confirmCode')}
                value={confirmCode}
                onChange={(v) => setConfirmCode(String(v))}
                required
                size="sm"
                autoComplete="one-time-code"
                helpText={t('security.confirmCodeHelp')}
              />
            </div>
          </div>
        </form>
      )}

      {step === 'recovery' && showSecurityPanel && (
        <>
          <div className="form-section-heading-row">
            <span className="form-section-heading-pill">{t('security.recoveryCodes')}</span>
            <div className="form-section-heading-line" aria-hidden />
          </div>
          <div className="row g-2">
            <div className="col-12">
              <FormField
                name="recovery_codes"
                type="textarea"
                label={t('security.recoveryCodes')}
                value={recoveryJoined}
                readOnly
                disabled
                size="sm"
                rows={8}
                helpText={t('security.recoveryHelp')}
              />
            </div>
            <div className="col-12">
              <div className="form-modal-input-col d-flex flex-wrap gap-2">
                <CopiarIconButton text={recoveryJoined} copyKey="totp-recovery-codes" />
                <BaixarButton
                  type="button"
                  onClick={handleDownloadRecoveryCodes}
                  disabled={!recoveryJoined.trim()}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {step === 'disable' && showSecurityPanel && (
        <form id="seguranca-2fa-disable-form" onSubmit={handleDisable}>
          <div className="form-section-heading-row">
            <span className="form-section-heading-pill">{t('security.disable')}</span>
            <div className="form-section-heading-line" aria-hidden />
          </div>
          <div className="row g-2">
            <div className="col-12">
              <FormField
                name="disable_password"
                type="password"
                label={t('form.password')}
                value={disablePassword}
                onChange={(v) => setDisablePassword(String(v))}
                required
                size="sm"
                autoComplete="current-password"
                helpText={t('security.disableHelp')}
              />
            </div>
            <div className="col-12">
              <FormField
                name="disable_code"
                type="text"
                label={t('security.confirmCode')}
                value={disableCode}
                onChange={(v) => setDisableCode(String(v))}
                required
                size="sm"
                autoComplete="one-time-code"
                helpText={t('security.disableCodeHelp')}
              />
            </div>
          </div>
        </form>
      )}
    </div>
  );

  if (skipWrapper) return content;

  return (
    <DraggableModal
      show={show}
      onClose={handleClose}
      title={t('security.title')}
      size="md"
      modalId="seguranca-usuario-modal"
      headerActions={headerActionsContent}
    >
      {content}
    </DraggableModal>
  );
};

export default SegurancaUsuarioModal;
