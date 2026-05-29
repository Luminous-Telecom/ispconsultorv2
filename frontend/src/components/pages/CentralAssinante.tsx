import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCentralAssinanteAuth } from 'hooks/useCentralAssinanteAuth';
import { Spinner, AlterarSenhaButton, SairButton, VoltarButton } from 'components/ui';
import CentralAssinanteLoginView from './centralAssinante/CentralAssinanteLoginView';
import CentralAssinanteRecuperarSenhaView from './centralAssinante/CentralAssinanteRecuperarSenhaView';
import CentralAssinanteNav from './centralAssinante/CentralAssinanteNav';
import CentralAssinanteTabContent from './centralAssinante/CentralAssinanteTabContent';
import CentralAssinanteFaturaModal from './centralAssinante/CentralAssinanteFaturaModal';
import CentralAssinanteTrocarSenhaModal from './centralAssinante/CentralAssinanteTrocarSenhaModal';
import { useNotificationContext, NotificationContainer } from 'components/notifications';
import { useApiError } from 'hooks/useApiError';
import { useCentralAssinantePageData } from './centralAssinante/useCentralAssinantePageData';
import { useCentralAssinanteActions } from './centralAssinante/useCentralAssinanteActions';
import {
  CentralAssinanteTab,
  getStatusLabel,
  getStatusVariant,
  temContratoComAssinaturaPendente,
  temTermosComAssinaturaPendente,
} from './centralAssinante/centralAssinanteUtils';
import 'styles/CentralAssinante.scss';

const CentralAssinante: React.FC = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { success: showSuccess, notifications, removeNotification, pauseNotification, resumeNotification } = useNotificationContext();
  const { showApiError } = useApiError();
  const [activeTab, setActiveTab] = useState<CentralAssinanteTab>('resumo');

  const {
    loginForm,
    setLoginForm,
    showRecuperarSenha,
    setShowRecuperarSenha,
    recuperarSenhaForm,
    setRecuperarSenhaForm,
    showTrocarSenha,
    setShowTrocarSenha,
    mostrarNovaSenha,
    setMostrarNovaSenha,
    trocarSenhaForm,
    setTrocarSenhaForm,
    centralToken,
    isAuthenticated,
    loginMutation,
    recuperarSenhaMutation,
    trocarSenhaMutation,
    handleLogin,
    handleRecuperarSenha,
    handleTrocarSenha,
    handleLogout,
  } = useCentralAssinanteAuth(slug);

  const { dados, isLoading, error, empresaData, loginFieldConfig } = useCentralAssinantePageData({
    slug,
    isAuthenticated,
    centralToken,
  });

  const {
    faturaVisualizar,
    setFaturaVisualizar,
    copiedField,
    baixandoBoletoId,
    baixandoContratoId,
    baixandoTermoId,
    baixandoReciboId,
    handleImprimirContrato,
    handleImprimirTermo,
    handleImprimirFatura,
    handleImprimirRecibo,
    handleVisualizarFatura,
    copiarCodigo,
    handleCardClick,
  } = useCentralAssinanteActions({
    slug,
    showSuccess,
    showApiError,
    setActiveTab,
  });

  const notificationProps = {
    notifications,
    removeNotification,
    pauseNotification,
    resumeNotification,
  };

  const handleCloseTrocarSenha = () => {
    setShowTrocarSenha(false);
    setMostrarNovaSenha(false);
    setTrocarSenhaForm({ senhaAtual: '', novaSenha: '', confirmarNovaSenha: '' });
  };

  if (showRecuperarSenha) {
    return (
      <CentralAssinanteRecuperarSenhaView
        {...notificationProps}
        form={recuperarSenhaForm}
        onFormChange={setRecuperarSenhaForm}
        onSubmit={handleRecuperarSenha}
        onBack={() => {
          setShowRecuperarSenha(false);
          setRecuperarSenhaForm({ cnpj: '', email: '' });
        }}
        isPending={recuperarSenhaMutation.isPending}
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <CentralAssinanteLoginView
        {...notificationProps}
        empresaLogo={empresaData?.logo}
        loginForm={loginForm}
        onLoginFormChange={setLoginForm}
        onSubmit={handleLogin}
        onForgotPassword={() => setShowRecuperarSenha(true)}
        loginFieldLabel={loginFieldConfig.label}
        loginFieldPlaceholder={loginFieldConfig.placeholder}
        loginInputType={loginFieldConfig.label === 'Email' ? 'email' : 'text'}
        isPending={loginMutation.isPending}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center central-assinante-loading">
        <Spinner size="lg" variant="primary" aria-label="Carregando..." />
        <NotificationContainer
          position="bottom-right"
          notifications={notifications}
          onRemove={removeNotification}
          onPause={pauseNotification}
          onResume={resumeNotification}
          onActionClick={() => {}}
        />
      </div>
    );
  }

  if (error || !dados) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center px-3 central-assinante-container central-assinante-error">
        <div className="text-center">
          <i className="bi bi-exclamation-triangle text-danger central-assinante-error-icon"></i>
          <h6 className="mt-2 mb-1 fw-bold text-white">Erro ao carregar dados</h6>
          <p className="text-white-50 mb-3 small">O link de acesso pode estar inválido ou expirado.</p>
          <NotificationContainer
            position="bottom-right"
            notifications={notifications}
            onRemove={removeNotification}
            onPause={pauseNotification}
            onResume={resumeNotification}
            onActionClick={() => {}}
          />
          <VoltarButton
            size="sm"
            onClick={() => {
              handleLogout();
              navigate(`/central-assinante/${slug}`, { replace: true });
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark min-vh-100 central-assinante-container">
      <div className="text-white py-2 border-bottom border-secondary central-assinante-header">
        <div className="container-fluid px-2 px-md-3">
          <div className="d-flex align-items-center justify-content-between">
            <div className="flex-grow-1 text-center">
              <h1 className="h6 mb-1 fw-bold text-white">
                <i className="bi bi-person-circle me-1 me-md-2"></i>
                <span className="d-none d-md-inline">Central do Assinante</span>
                <span className="d-md-none">Central</span>
              </h1>
              <p className="mb-0 text-white-50 small">{dados.cliente.razao_social || dados.cliente.nome_fantasia}</p>
            </div>
            <div className="d-flex align-items-center gap-2">
              <AlterarSenhaButton
                type="button"
                size="sm"
                onClick={() => setShowTrocarSenha(true)}
              />
              <SairButton
                type="button"
                size="sm"
                onClick={() => {
                  handleLogout();
                  navigate(`/central-assinante/${slug}`, { replace: true });
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="d-flex central-assinante-main">
        <CentralAssinanteNav
          section="sidebar"
          activeTab={activeTab}
          onTabChange={setActiveTab}
          dados={dados}
          temContratoComAssinaturaPendente={temContratoComAssinaturaPendente}
          temTermosComAssinaturaPendente={temTermosComAssinaturaPendente}
        />

        <div className="flex-grow-1 px-2 px-md-3 py-2">
          <div>
            <CentralAssinanteTabContent
              activeTab={activeTab}
              dados={dados}
              getStatusVariant={getStatusVariant}
              getStatusLabel={getStatusLabel}
              baixandoBoletoId={baixandoBoletoId}
              baixandoContratoId={baixandoContratoId}
              baixandoTermoId={baixandoTermoId}
              baixandoReciboId={baixandoReciboId}
              handleVisualizarFatura={handleVisualizarFatura}
              handleCardClick={handleCardClick}
              handleImprimirContrato={handleImprimirContrato}
              handleImprimirTermo={handleImprimirTermo}
              handleImprimirFatura={handleImprimirFatura}
              handleImprimirRecibo={handleImprimirRecibo}
            />
          </div>
        </div>
      </div>

      <CentralAssinanteNav
        section="mobile"
        activeTab={activeTab}
        onTabChange={setActiveTab}
        dados={dados}
        temContratoComAssinaturaPendente={temContratoComAssinaturaPendente}
        temTermosComAssinaturaPendente={temTermosComAssinaturaPendente}
      />
      <div className="d-md-none central-assinante-mobile-spacer"></div>

      {faturaVisualizar ? (
        <CentralAssinanteFaturaModal
          faturaVisualizar={faturaVisualizar}
          copiedField={copiedField}
          baixandoBoletoId={baixandoBoletoId}
          onClose={() => setFaturaVisualizar(null)}
          copiarCodigo={copiarCodigo}
          handleImprimirFatura={handleImprimirFatura}
        />
      ) : null}

      {showTrocarSenha ? (
        <CentralAssinanteTrocarSenhaModal
          trocarSenhaForm={trocarSenhaForm}
          setTrocarSenhaForm={setTrocarSenhaForm}
          mostrarNovaSenha={mostrarNovaSenha}
          setMostrarNovaSenha={setMostrarNovaSenha}
          isPending={trocarSenhaMutation.isPending}
          onSubmit={handleTrocarSenha}
          onClose={handleCloseTrocarSenha}
        />
      ) : null}

      <NotificationContainer
        position="bottom-right"
        notifications={notifications}
        onRemove={removeNotification}
        onPause={pauseNotification}
        onResume={resumeNotification}
        onActionClick={() => {}}
      />
    </div>
  );
};

export default CentralAssinante;
