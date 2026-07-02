import React from 'react';
import { Badge, NavLinkButton } from 'components/ui';
import { DadosCentralAssinante } from 'services/centralAssinanteService';
import { CentralAssinanteTab, getFinanceiroNavBadgeVariant, getFinanceiroPagoNavBadgeVariant } from './centralAssinanteUtils';

interface CentralAssinanteNavProps {
  section: 'sidebar' | 'mobile';
  activeTab: CentralAssinanteTab;
  onTabChange: (tab: CentralAssinanteTab) => void;
  dados: DadosCentralAssinante;
  temContratoComAssinaturaPendente: (dados: DadosCentralAssinante | undefined) => boolean;
  temTermosComAssinaturaPendente: (dados: DadosCentralAssinante | undefined) => boolean;
}

const CentralAssinanteNav: React.FC<CentralAssinanteNavProps> = ({
  section,
  activeTab,
  onTabChange,
  dados,
  temContratoComAssinaturaPendente,
  temTermosComAssinaturaPendente,
}) => {
  if (section === 'sidebar') {
    return (
    <aside className="d-none d-md-block central-assinante-sidebar">
      <nav className="nav nav-pills flex-column p-2 central-assinante-nav">
        <NavLinkButton
          className={`nav-link d-flex flex-column align-items-center justify-content-center position-relative p-3 central-assinante-nav-button ${activeTab === 'resumo' ? 'active' : ''}`}
          onClick={() => {
            onTabChange('resumo');
          }}
          ariaLabel="Resumo"
        >
          <i className="bi bi-house-door central-assinante-nav-icon"></i>
          <small className="small mt-1 central-assinante-nav-text">Resumo</small>
        </NavLinkButton>
        <NavLinkButton
          className={`nav-link d-flex flex-column align-items-center justify-content-center position-relative p-3 central-assinante-nav-button ${activeTab === 'contratos' ? 'active' : ''}`}
          onClick={() => {
            onTabChange('contratos');
          }}
          ariaLabel="Contratos"
        >
          <i className="bi bi-file-earmark-text central-assinante-nav-icon position-relative">
            <span className="position-absolute top-0 end-0 central-assinante-badge-wrapper">
              <span className="central-assinante-badge-inner">
                <Badge
                  variant={temContratoComAssinaturaPendente(dados) ? 'danger' : 'secondary'}
                  pill
                  className="central-assinante-sidebar-badge"
                >
                  {dados.resumo.contratos_ativos}
                </Badge>
              </span>
            </span>
          </i>
          <small className="small mt-1 central-assinante-nav-text">Contratos</small>
        </NavLinkButton>
        <NavLinkButton
          className={`nav-link d-flex flex-column align-items-center justify-content-center position-relative p-3 central-assinante-nav-button ${activeTab === 'financeiro' ? 'active' : ''}`}
          onClick={() => {
            onTabChange('financeiro');
          }}
          ariaLabel="A Pagar"
        >
          <i className="bi bi-wallet central-assinante-nav-icon position-relative">
            <span className="position-absolute top-0 end-0 central-assinante-badge-wrapper">
              <span className="central-assinante-badge-inner">
                <Badge variant={getFinanceiroNavBadgeVariant(dados)} pill className="central-assinante-sidebar-badge">{dados.resumo.titulos_a_pagar + dados.resumo.titulos_atrasados}</Badge>
              </span>
            </span>
          </i>
          <small className="small mt-1 central-assinante-nav-text">A Pagar</small>
        </NavLinkButton>
        <NavLinkButton
          className={`nav-link d-flex flex-column align-items-center justify-content-center position-relative p-3 central-assinante-nav-button central-assinante-nav-button-pago ${activeTab === 'financeiro_pago' ? 'active' : ''}`}
          onClick={() => {
            onTabChange('financeiro_pago');
          }}
          ariaLabel="Pago"
        >
          <i className="bi bi-check-circle central-assinante-nav-icon position-relative">
            <span className="position-absolute top-0 end-0 central-assinante-badge-wrapper">
              <span className="central-assinante-badge-inner">
                <Badge variant={getFinanceiroPagoNavBadgeVariant(dados)} pill className="central-assinante-sidebar-badge">{dados.resumo.titulos_pagos}</Badge>
              </span>
            </span>
          </i>
          <small className="small mt-1 central-assinante-nav-text">Pago</small>
        </NavLinkButton>
        <NavLinkButton
          className={`nav-link d-flex flex-column align-items-center justify-content-center position-relative p-3 central-assinante-nav-button ${activeTab === 'termos' ? 'active' : ''}`}
          onClick={() => {
            onTabChange('termos');
          }}
          ariaLabel="Termos"
        >
          <i className="bi bi-file-check central-assinante-nav-icon position-relative">
            <span className="position-absolute top-0 end-0 central-assinante-badge-wrapper">
              <span className="central-assinante-badge-inner">
                <Badge variant={temTermosComAssinaturaPendente(dados) ? 'danger' : 'secondary'} pill className="central-assinante-sidebar-badge">{dados.resumo.total_termos}</Badge>
              </span>
            </span>
          </i>
          <small className="small mt-1 central-assinante-nav-text">Termos</small>
        </NavLinkButton>
      </nav>
    </aside>
    );
  }

  return (
    <div className="d-md-none fixed-bottom central-assinante-mobile-nav">
      <div className="d-flex justify-content-around align-items-center py-1 central-assinante-mobile-nav-inner">
        <NavLinkButton
          className={`btn text-decoration-none central-assinante-mobile-button ${activeTab === 'resumo' ? 'active text-white' : 'text-white-50'}`}
          onClick={() => {
            onTabChange('resumo');
          }}
          ariaLabel="Resumo"
        >
          <div className="d-flex flex-column align-items-center">
            <i className={`bi bi-house-door central-assinante-nav-icon ${activeTab === 'resumo' ? 'text-white' : 'text-white-50'}`}></i>
            <small className="small">Resumo</small>
          </div>
        </NavLinkButton>
        <NavLinkButton
          className={`btn text-decoration-none central-assinante-mobile-button ${activeTab === 'contratos' ? 'active text-white' : 'text-white-50'}`}
          onClick={() => {
            onTabChange('contratos');
          }}
          ariaLabel="Contratos"
        >
          <div className="d-flex flex-column align-items-center">
            <i className={`bi bi-file-earmark-text central-assinante-nav-icon position-relative ${activeTab === 'contratos' ? 'text-white' : 'text-white-50'}`}>
              <span className="position-absolute top-0 end-0 central-assinante-badge-wrapper">
                <span className="central-assinante-badge-inner">
                  <Badge variant={temContratoComAssinaturaPendente(dados) ? 'danger' : 'secondary'} pill className="central-assinante-sidebar-badge">{dados?.resumo.contratos_ativos || 0}</Badge>
                </span>
              </span>
            </i>
            <small className="small">Contratos</small>
          </div>
        </NavLinkButton>
        <NavLinkButton
          className={`btn text-decoration-none central-assinante-mobile-button ${activeTab === 'financeiro' ? 'active text-white' : 'text-white-50'}`}
          onClick={() => {
            onTabChange('financeiro');
          }}
          ariaLabel="A Pagar"
        >
          <div className="d-flex flex-column align-items-center">
            <i className={`bi bi-wallet central-assinante-nav-icon position-relative ${activeTab === 'financeiro' ? 'text-white' : 'text-white-50'}`}>
              <span className="position-absolute top-0 end-0 central-assinante-badge-wrapper">
                <span className="central-assinante-badge-inner">
                  <Badge variant={getFinanceiroNavBadgeVariant(dados)} pill className="central-assinante-sidebar-badge">{(dados?.resumo.titulos_a_pagar || 0) + (dados?.resumo.titulos_atrasados || 0)}</Badge>
                </span>
              </span>
            </i>
            <small className="small">A Pagar</small>
          </div>
        </NavLinkButton>
        <NavLinkButton
          className={`btn text-decoration-none central-assinante-mobile-button ${activeTab === 'financeiro_pago' ? 'active text-white' : 'text-white-50'}`}
          onClick={() => {
            onTabChange('financeiro_pago');
          }}
          ariaLabel="Pago"
        >
          <div className="d-flex flex-column align-items-center">
            <i className={`bi bi-check-circle central-assinante-nav-icon position-relative ${activeTab === 'financeiro_pago' ? 'text-white' : 'text-white-50'}`}>
              <span className="position-absolute top-0 end-0 central-assinante-badge-wrapper">
                <span className="central-assinante-badge-inner">
                  <Badge variant={getFinanceiroPagoNavBadgeVariant(dados)} pill className="central-assinante-sidebar-badge">{dados?.resumo.titulos_pagos || 0}</Badge>
                </span>
              </span>
            </i>
            <small className="small">Pago</small>
          </div>
        </NavLinkButton>
        <NavLinkButton
          className={`btn text-decoration-none central-assinante-mobile-button ${activeTab === 'termos' ? 'active text-white' : 'text-white-50'}`}
          onClick={() => {
            onTabChange('termos');
          }}
          ariaLabel="Termos"
        >
          <div className="d-flex flex-column align-items-center">
            <i className={`bi bi-file-check central-assinante-nav-icon position-relative ${activeTab === 'termos' ? 'text-white' : 'text-secondary'}`}>
              <span className="position-absolute top-0 end-0 central-assinante-badge-wrapper">
                <span className="central-assinante-badge-inner">
                  <Badge variant={temTermosComAssinaturaPendente(dados) ? 'danger' : 'secondary'} pill className="central-assinante-sidebar-badge">{dados?.resumo.total_termos || 0}</Badge>
                </span>
              </span>
            </i>
            <small className="small">Termos</small>
          </div>
        </NavLinkButton>
      </div>
    </div>
  );
};

export default CentralAssinanteNav;
