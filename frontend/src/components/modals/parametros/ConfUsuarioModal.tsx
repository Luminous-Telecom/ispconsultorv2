import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DraggableModal from 'components/common/DraggableModal';
import ModalTabsOverflow, { ModalTabItem } from 'components/common/ModalTabsOverflow';
import {
  CancelarButton,
  FormField,
  Loading,
  SalvarButton,
  ValidarButton,
} from 'components/ui';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { useIsMobile } from 'hooks/useMediaQuery';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { authService, type CurrentUser } from 'services/authService';
import { useI18n, type Language } from 'contexts/I18nContext';
import { useTheme } from 'contexts/ThemeContext';
import { useFontSize, type FontSize } from 'contexts/FontSizeContext';
import { CACHE_CONFIG } from 'config/api';
import SegurancaUsuarioModal from './SegurancaUsuarioModal';
import DispositivosConfiaveisTab from './DispositivosConfiaveisTab';

interface ConfUsuarioModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  onHeaderActionsReady?: (actions: React.ReactNode) => void;
}

type ConfUsuarioTab = 'configuracoes' | 'seguranca' | 'dispositivos';

const ConfUsuarioModal: React.FC<ConfUsuarioModalProps> = ({
  show,
  onClose,
  skipWrapper = false,
  onHeaderActionsReady,
}) => {
  const { t, language, setLanguage, availableLanguages } = useI18n();
  const { theme, setTheme } = useTheme();
  const { fontSize, setFontSize } = useFontSize();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const [activeTab, setActiveTab] = useState<ConfUsuarioTab>('configuracoes');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [emailRecuperacao, setEmailRecuperacao] = useState('');
  const [emailRecuperacaoVerificado, setEmailRecuperacaoVerificado] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [securityHeaderActions, setSecurityHeaderActions] = useState<React.ReactNode>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['auth-me-profile'],
    queryFn: async () => {
      const res = await authService.getCurrentUser();
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Falha ao carregar perfil');
      }
      return res.data;
    },
    enabled: show,
    staleTime: 0,
    gcTime: CACHE_CONFIG.DEFAULT_CACHE_TIME,
  });

  const syncFromProfile = useCallback((data: CurrentUser) => {
    setNome(data.nome || '');
    setEmail(data.email || '');
    setEmailRecuperacao(data.email_recuperacao || '');
    setEmailRecuperacaoVerificado(!!data.email_recuperacao_verificado);
  }, []);

  useEffect(() => {
    if (profile) {
      syncFromProfile(profile);
    }
  }, [profile, syncFromProfile]);

  useEffect(() => {
    if (!show) {
      setActiveTab('configuracoes');
      setIsPending(false);
      setIsValidating(false);
      setSecurityHeaderActions(null);
    }
  }, [show]);

  const handleClose = useCallback(() => {
    setActiveTab('configuracoes');
    setSecurityHeaderActions(null);
    onClose();
  }, [onClose]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    try {
      const res = await authService.updateCurrentUser({
        nome: nome.trim(),
        email: email.trim(),
        email_recuperacao: emailRecuperacao.trim() || null,
      });
      if (!res.success || !res.data) {
        showApiError(res.message || CONTEXT_ERROR_MESSAGES.USER_UPDATE_ERROR);
        return;
      }
      syncFromProfile(res.data);
      queryClient.setQueryData(['auth-me-profile'], res.data);
      success(t('userConfig.saveSuccess'));
    } catch (err) {
      showApiError(err, CONTEXT_ERROR_MESSAGES.USER_UPDATE_ERROR);
    } finally {
      setIsPending(false);
    }
  };

  const handleValidateRecoveryEmail = async () => {
    if (!emailRecuperacao.trim()) {
      showApiError(t('userConfig.recoveryEmailRequired'));
      return;
    }
    // Salva o e-mail antes de enviar o link, se ainda não estiver gravado
    setIsValidating(true);
    try {
      if (
        emailRecuperacao.trim().toLowerCase() !== (profile?.email_recuperacao || '').toLowerCase()
      ) {
        const saveRes = await authService.updateCurrentUser({
          email_recuperacao: emailRecuperacao.trim(),
        });
        if (!saveRes.success || !saveRes.data) {
          showApiError(saveRes.message || CONTEXT_ERROR_MESSAGES.USER_UPDATE_ERROR);
          return;
        }
        syncFromProfile(saveRes.data);
        queryClient.setQueryData(['auth-me-profile'], saveRes.data);
      }
      const res = await authService.sendRecoveryEmailValidation();
      if (!res.success) {
        showApiError(res.message || CONTEXT_ERROR_MESSAGES.USER_UPDATE_ERROR);
        return;
      }
      success(t('userConfig.recoveryEmailSent'));
    } catch (err) {
      showApiError(err, CONTEXT_ERROR_MESSAGES.USER_UPDATE_ERROR);
    } finally {
      setIsValidating(false);
    }
  };

  const tabs = useMemo(
    (): ModalTabItem<ConfUsuarioTab>[] => [
      { id: 'configuracoes', label: t('userConfig.tabSettings') },
      { id: 'seguranca', label: t('userConfig.tabSecurity') },
      { id: 'dispositivos', label: t('userConfig.tabTrustedDevices') },
    ],
    [t]
  );

  const languageOptions = useMemo(
    () =>
      availableLanguages.map((lang) => ({
        value: lang.code,
        label: `${lang.flag ? `${lang.flag} ` : ''}${lang.name}`,
      })),
    [availableLanguages]
  );

  const themeOptions = useMemo(
    () => [
      { value: 'light', label: t('layout.lightMode') },
      { value: 'dark', label: t('layout.darkMode') },
    ],
    [t]
  );

  const fontSizeOptions = useMemo(
    () => [
      { value: 'sm', label: t('layout.fontSizeSmall') },
      { value: 'md', label: t('layout.fontSizeMedium') },
      { value: 'lg', label: t('layout.fontSizeLarge') },
    ],
    [t]
  );

  const recoveryTrailing = emailRecuperacaoVerificado ? (
    <span
      className="form-field-verified text-success d-inline-flex align-items-center justify-content-center"
      title={t('userConfig.recoveryEmailVerified')}
      aria-label={t('userConfig.recoveryEmailVerified')}
    >
      <i className="bi bi-check-lg" aria-hidden />
    </span>
  ) : (
    <ValidarButton
      type="button"
      size="sm"
      onClick={handleValidateRecoveryEmail}
      disabled={isPending || isValidating || !emailRecuperacao.trim()}
      isPending={isValidating}
    />
  );

  const headerActionsContent = useMemo(() => {
    const headerButtons =
      activeTab === 'seguranca' && securityHeaderActions ? (
        securityHeaderActions
      ) : (
        <>
          <CancelarButton type="button" onClick={handleClose} isPending={isPending} />
          {activeTab === 'configuracoes' ? (
            <SalvarButton type="submit" form="conf-usuario-form" isPending={isPending} />
          ) : null}
        </>
      );

    return (
      <div className="conf-usuario-header-unified">
        <div className="conf-usuario-header-buttons modal-header-actions">{headerButtons}</div>
        <div className="conf-usuario-header-tabs">
          <ModalTabsOverflow
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabsClassName={`banco-tabs-unified ${isMobile ? 'banco-tabs-mobile' : ''}`}
            isMobile={isMobile}
            id="confUsuarioTab"
          />
        </div>
      </div>
    );
  }, [activeTab, securityHeaderActions, tabs, isMobile, handleClose, isPending]);

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

  const settingsContent = (
    <form id="conf-usuario-form" onSubmit={handleSaveProfile} className="form-modal-simple">
      <div className="form-section-heading-row">
        <span className="form-section-heading-pill">{t('userConfig.profileSection')}</span>
        <div className="form-section-heading-line" aria-hidden />
      </div>
      <div className="row g-2 mb-3">
        <div className="col-12">
          <FormField
            name="nome"
            type="text"
            label={t('userConfig.name')}
            value={nome}
            onChange={(v) => setNome(String(v))}
            required
            size="sm"
            autoComplete="name"
          />
        </div>
        <div className="col-12">
          <FormField
            name="email"
            type="email"
            label={t('userConfig.email')}
            value={email}
            onChange={(v) => setEmail(String(v))}
            required
            size="sm"
            autoComplete="email"
            helpText={t('userConfig.emailHelp')}
          />
        </div>
        <div className="col-12">
          <FormField
            name="email_recuperacao"
            type="email"
            label={t('userConfig.recoveryEmail')}
            value={emailRecuperacao}
            onChange={(v) => {
              const next = String(v);
              setEmailRecuperacao(next);
              setEmailRecuperacaoVerificado(
                !!profile?.email_recuperacao_verificado &&
                  next.trim().toLowerCase() === (profile?.email_recuperacao || '').toLowerCase()
              );
            }}
            size="sm"
            autoComplete="email"
            helpText={t('userConfig.recoveryEmailHelp')}
            trailing={recoveryTrailing}
          />
        </div>
      </div>

      <div className="form-section-heading-row">
        <span className="form-section-heading-pill">{t('userConfig.preferencesSection')}</span>
        <div className="form-section-heading-line" aria-hidden />
      </div>
      <div className="row g-2">
        <div className="col-12">
          <FormField
            name="idioma"
            type="select"
            label={t('layout.language')}
            value={language}
            onChange={(v) => setLanguage(String(v) as Language)}
            options={languageOptions}
            size="sm"
            helpText={t('userConfig.languageHelp')}
          />
        </div>
        <div className="col-12">
          <FormField
            name="tema"
            type="select"
            label={t('layout.theme')}
            value={theme}
            onChange={(v) => setTheme(String(v) === 'dark' ? 'dark' : 'light')}
            options={themeOptions}
            size="sm"
            helpText={t('userConfig.themeHelp')}
          />
        </div>
        <div className="col-12">
          <FormField
            name="fonte"
            type="select"
            label={t('layout.fontSize')}
            value={fontSize}
            onChange={(v) => setFontSize(String(v) as FontSize)}
            options={fontSizeOptions}
            size="sm"
            helpText={t('userConfig.fontSizeHelp')}
          />
        </div>
      </div>
    </form>
  );

  const tabContentClass =
    activeTab === 'dispositivos'
      ? 'tab-content conf-usuario-tab-content conf-usuario-tab-content-scrollable banco-tab-content-scrollable'
      : 'tab-content conf-usuario-tab-content conf-usuario-tab-content-padded';

  const modalContent = isLoading ? (
    <Loading variant="modal" />
  ) : (
    <div className="conf-usuario-modal-content">
      <div className={tabContentClass} id="confUsuarioTabContent">
        {activeTab === 'configuracoes' && settingsContent}
        {activeTab === 'seguranca' && (
          <SegurancaUsuarioModal
            show={show}
            onClose={handleClose}
            skipWrapper
            panel="security"
            onHeaderActionsReady={setSecurityHeaderActions}
          />
        )}
        {activeTab === 'dispositivos' && <DispositivosConfiaveisTab />}
      </div>
    </div>
  );

  if (skipWrapper) return modalContent;

  return (
    <DraggableModal
      show={show}
      onClose={handleClose}
      title={t('userConfig.title')}
      size="md"
      modalId="conf-usuario-modal"
      headerActions={headerActionsContent}
    >
      {modalContent}
    </DraggableModal>
  );
};

export default ConfUsuarioModal;
