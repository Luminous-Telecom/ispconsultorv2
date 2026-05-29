import React from 'react';
import { Badge } from 'components/ui';
import { DadosCentralAssinante } from 'services/centralAssinanteService';
import { CentralAssinanteTab } from './centralAssinanteUtils';

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
        <button
          className={`nav-link d-flex flex-column align-items-center justify-content-center position-relative p-3 central-assinante-nav-button ${activeTab === 'resumo' ? 'active' : ''}`}
          onClick={() => {
            onTabChange('resumo');
          }}
        >
          <i className="bi bi-house-door fs-5"></i>
          <small className="small mt-1 central-assinante-nav-text">Resumo</small>
        </button>
        <button
          className={`nav-link d-flex flex-column align-items-center justify-content-center position-relative p-3 central-assinante-nav-button ${activeTab === 'contratos' ? 'active' : ''}`}
          onClick={() => {
            onTabChange('contratos');
          }}
        >
          <i className="bi bi-file-earmark-text fs-5 position-relative">
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
        </button>
        <button
          className={`nav-link d-flex flex-column align-items-center justify-content-center position-relative p-3 central-assinante-nav-button ${activeTab === 'financeiro' ? 'active' : ''}`}
          onClick={() => {
            onTabChange('financeiro');
          }}
        >
          <i className="bi bi-wallet fs-5 position-relative">
            <span className="position-absolute top-0 end-0 central-assinante-badge-wrapper">
              <span className="central-assinante-badge-inner">
                <Badge variant={dados.resumo.titulos_atrasados > 0 ? 'danger' : 'secondary'} pill className="central-assinante-sidebar-badge">{dados.resumo.titulos_a_pagar + dados.resumo.titulos_atrasados}</Badge>
              </span>
            </span>
          </i>
          <small className="small mt-1 central-assinante-nav-text">A Pagar</small>
        </button>
        <button
          className={`nav-link d-flex flex-column align-items-center justify-content-center position-relative p-3 central-assinante-nav-button central-assinante-nav-button-pago ${activeTab === 'financeiro_pago' ? 'active' : ''}`}
          onClick={() => {
            onTabChange('financeiro_pago');
          }}
        >
          <i className="bi bi-check-circle fs-5 position-relative">
            <span className="position-absolute top-0 end-0 central-assinante-badge-wrapper">
              <span className="central-assinante-badge-inner">
                <Badge variant="secondary" pill className="central-assinante-sidebar-badge">{dados.resumo.titulos_pagos}</Badge>
              </span>
            </span>
          </i>
          <small className="small mt-1 central-assinante-nav-text">Pago</small>
        </button>
        <button
          className={`nav-link d-flex flex-column align-items-center justify-content-center position-relative p-3 central-assinante-nav-button ${activeTab === 'termos' ? 'active' : ''}`}
          onClick={() => {
            onTabChange('termos');
          }}
        >
          <i className="bi bi-file-check fs-5 position-relative">
            <span className="position-absolute top-0 end-0 central-assinante-badge-wrapper">
              <span className="central-assinante-badge-inner">
                <Badge variant={temTermosComAssinaturaPendente(dados) ? 'danger' : 'secondary'} pill className="central-assinante-sidebar-badge">{dados.resumo.total_termos}</Badge>
              </span>
            </span>
          </i>
          <small className="small mt-1 central-assinante-nav-text">Termos</small>
        </button>
      </nav>
    </aside>
    );
  }

  return (
    <div className="d-md-none fixed-bottom border-top border-secondary shadow-lg central-assinante-mobile-nav">
      <div className="d-flex justify-content-around align-items-center py-2">
        <button
          className={`btn text-decoration-none p-2 central-assinante-mobile-button ${activeTab === 'resumo' ? 'active text-white' : 'text-white-50'}`}
          onClick={() => {
            onTabChange('resumo');
          }}
        >
          <div className="d-flex flex-column align-items-center">
            <i className={`bi bi-house-door fs-5 ${activeTab === 'resumo' ? 'text-white' : 'text-white-50'}`}></i>
            <small className="small">Resumo</small>
          </div>
        </button>
        <button
          className={`btn text-decoration-none p-2 position-relative central-assinante-mobile-button ${activeTab === 'contratos' ? 'active text-white' : 'text-white-50'}`}
          onClick={() => {
            onTabChange('contratos');
          }}
        >
          <div className="d-flex flex-column align-items-center position-relative">
            <i className={`bi bi-file-earmark-text fs-5 position-relative ${activeTab === 'contratos' ? 'text-white' : 'text-white-50'}`}></i>
            <small className="small">Contratos</small>
            <span className="position-absolute top-0 end-0 central-assinante-mobile-badge">
              <Badge variant={temContratoComAssinaturaPendente(dados) ? 'danger' : 'secondary'} pill className="central-assinante-sidebar-badge">{dados?.resumo.contratos_ativos || 0}</Badge>
            </span>
          </div>
        </button>
        <button
          className={`btn text-decoration-none p-2 position-relative central-assinante-mobile-button ${activeTab === 'financeiro' ? 'active text-white' : 'text-white-50'}`}
          onClick={() => {
            onTabChange('financeiro');
          }}
        >
          <div className="d-flex flex-column align-items-center">
            <i className={`bi bi-wallet fs-5 ${activeTab === 'financeiro' ? 'text-white' : 'text-white-50'}`}></i>
            <small className="small">A Pagar</small>
            <span className="position-absolute top-0 end-0 central-assinante-mobile-badge">
              <Badge variant={(dados?.resumo.titulos_atrasados || 0) > 0 ? 'danger' : 'secondary'} pill className="central-assinante-sidebar-badge">{(dados?.resumo.titulos_a_pagar || 0) + (dados?.resumo.titulos_atrasados || 0)}</Badge>
            </span>
          </div>
        </button>
        <button
          className={`btn text-decoration-none p-2 position-relative central-assinante-mobile-button ${activeTab === 'financeiro_pago' ? 'active text-white' : 'text-white-50'}`}
          onClick={() => {
            onTabChange('financeiro_pago');
          }}
        >
          <div className="d-flex flex-column align-items-center">
            <i className={`bi bi-check-circle fs-5 ${activeTab === 'financeiro_pago' ? 'text-white' : 'text-white-50'}`}></i>
            <small className="small">Pago</small>
            <span className="position-absolute top-0 end-0 central-assinante-mobile-badge">
              <Badge variant="secondary" pill className="central-assinante-sidebar-badge">{dados?.resumo.titulos_pagos || 0}</Badge>
            </span>
          </div>
        </button>
        <button
          className={`btn text-decoration-none p-2 position-relative central-assinante-mobile-button ${activeTab === 'termos' ? 'active text-white' : 'text-white-50'}`}
          onClick={() => {
            onTabChange('termos');
          }}
        >
          <div className="d-flex flex-column align-items-center position-relative">
            <i className={`bi bi-file-check fs-5 position-relative ${activeTab === 'termos' ? 'text-white' : 'text-secondary'}`}></i>
            <small className="small">Termos</small>
            <span className="position-absolute top-0 end-0 central-assinante-mobile-badge">
              <Badge variant={temTermosComAssinaturaPendente(dados) ? 'danger' : 'secondary'} pill className="central-assinante-sidebar-badge">{dados?.resumo.total_termos || 0}</Badge>
            </span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default CentralAssinanteNav;
