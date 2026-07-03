import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCentralAssinanteAuth } from 'hooks/useCentralAssinanteAuth';
import { Loading, AlterarSenhaButton, SairButton, VoltarButton } from 'components/ui';
import CentralAssinanteLoginView from './centralAssinante/CentralAssinanteLoginView';
import CentralAssinanteRecuperarSenhaView from './centralAssinante/CentralAssinanteRecuperarSenhaView';
import CentralAssinanteNav from './centralAssinante/CentralAssinanteNav';
import CentralAssinanteTabContent from './centralAssinante/CentralAssinanteTabContent';
import CentralAssinanteFaturaModal from './centralAssinante/CentralAssinanteFaturaModal';
import CentralAssinanteTrocarSenhaModal from './centralAssinante/CentralAssinanteTrocarSenhaModal';
import CentralAssinanteThemeToggle from './centralAssinante/CentralAssinanteThemeToggle';
import { useNotificationContext } from 'components/notifications';
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
  const { success: showSuccess } = useNotificationContext();
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
    baixandoBoletoId,
    baixandoContratoId,
    baixandoTermoId,
    baixandoReciboId,
    handleImprimirContrato,
    handleImprimirTermo,
    handleImprimirFatura,
    handleImprimirRecibo,
    handleVisualizarFatura,
    handleCardClick,
  } = useCentralAssinanteActions({
    slug,
    showSuccess,
    showApiError,
    setActiveTab,
  });

  const handleCloseTrocarSenha = () => {
    setShowTrocarSenha(false);
    setMostrarNovaSenha(false);
    setTrocarSenhaForm({ senhaAtual: '', novaSenha: '', confirmarNovaSenha: '' });
  };

  if (showRecuperarSenha) {
    return (
      <CentralAssinanteRecuperarSenhaView
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
      <Loading variant="fullscreen" className="central-assinante-container central-assinante-loading" />
    );
  }

  if (error || !dados) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center px-3 central-assinante-container central-assinante-error">
        <div className="text-center">
          <i className="bi bi-exclamation-triangle text-danger central-assinante-error-icon"></i>
          <h6 className="mt-2 mb-1 fw-bold text-white">Erro ao carregar dados</h6>
          <p className="text-white-50 mb-3 small">O link de acesso pode estar inválido ou expirado.</p>
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
    <div className="central-assinante-container">
      <header className="central-assinante-header">
        <div className="container-fluid central-assinante-header-container">
          <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap central-assinante-header-inner">
            <div className="central-assinante-header-title">
              <h1 className="text-truncate">Central do Assinante</h1>
              <p className="text-truncate">{dados.cliente.razao_social || dados.cliente.nome_fantasia}</p>
            </div>
            <div className="central-assinante-header-actions">
              <CentralAssinanteThemeToggle />
              <AlterarSenhaButton
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setShowTrocarSenha(true)}
              />
              <SairButton
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  handleLogout();
                  navigate(`/central-assinante/${slug}`, { replace: true });
                }}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="d-flex central-assinante-main">
        <CentralAssinanteNav
          section="sidebar"
          activeTab={activeTab}
          onTabChange={setActiveTab}
          dados={dados}
          temContratoComAssinaturaPendente={temContratoComAssinaturaPendente}
          temTermosComAssinaturaPendente={temTermosComAssinaturaPendente}
        />

        <div className="flex-grow-1 central-assinante-content">
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

      <CentralAssinanteNav
        section="mobile"
        activeTab={activeTab}
        onTabChange={setActiveTab}
        dados={dados}
        temContratoComAssinaturaPendente={temContratoComAssinaturaPendente}
        temTermosComAssinaturaPendente={temTermosComAssinaturaPendente}
      />

      {faturaVisualizar ? (
        <CentralAssinanteFaturaModal
          faturaVisualizar={faturaVisualizar}
          baixandoBoletoId={baixandoBoletoId}
          onClose={() => setFaturaVisualizar(null)}
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
    </div>
  );
};

export default CentralAssinante;
