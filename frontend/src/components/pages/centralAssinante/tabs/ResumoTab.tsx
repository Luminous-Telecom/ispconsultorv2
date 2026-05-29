import React from 'react';
import { Card } from 'components/ui';
import { DadosCentralAssinante } from 'services/centralAssinanteService';
import { formatCurrency } from 'utils/formatters';
import { CentralAssinanteCardTipo } from '../centralAssinanteUtils';

interface ResumoTabProps {
  dados: DadosCentralAssinante;
  handleCardClick: (tipo: CentralAssinanteCardTipo) => void;
}

const ResumoTab: React.FC<ResumoTabProps> = ({ dados, handleCardClick }) => (
  <div>
    <div className="row g-2 g-md-3 mb-3">
      <div className="col-6 col-sm-4 col-md-3 col-lg-2">
        <div className="central-assinante-card-bg central-assinante-resumo-card central-assinante-card-contratos">
          <Card className="h-100 border-0" padding="none" clickable onClick={() => handleCardClick('contratos')}>
            <div className="card-body text-center central-assinante-card-body-compact">
              <div className="central-assinante-card-icon-wrapper">
                <i className="bi bi-file-earmark-text"></i>
              </div>
              <h6 className="mb-0 fw-bold text-white central-assinante-card-title">{dados.resumo.total_contratos}</h6>
              <small className="text-white-50 d-block central-assinante-card-label">Contratos</small>
              <small className="text-white-50 central-assinante-card-subtitle">{dados.resumo.contratos_ativos} ativos</small>
            </div>
          </Card>
        </div>
      </div>

      <div className="col-6 col-sm-4 col-md-3 col-lg-2">
        <div className="central-assinante-card-bg central-assinante-resumo-card central-assinante-card-pagos">
          <Card className="h-100 border-0" padding="none" clickable onClick={() => handleCardClick('faturas_pagas')}>
            <div className="card-body text-center central-assinante-card-body-compact">
              <div className="central-assinante-card-icon-wrapper">
                <i className="bi bi-check-circle"></i>
              </div>
              <h6 className="mb-0 fw-bold text-white central-assinante-card-title">{dados.resumo.titulos_pagos}</h6>
              <small className="text-white-50 d-block central-assinante-card-label">Faturas Pagas</small>
              <small className="text-white-50 central-assinante-card-subtitle">{formatCurrency(dados.resumo.valor_total_pago)}</small>
            </div>
          </Card>
        </div>
      </div>

      <div className="col-6 col-sm-4 col-md-3 col-lg-2">
        <div className="central-assinante-card-bg central-assinante-resumo-card central-assinante-card-atrasados">
          <Card className="h-100 border-0" padding="none" clickable onClick={() => handleCardClick('faturas_atrasadas')}>
            <div className="card-body text-center central-assinante-card-body-compact">
              <div className="central-assinante-card-icon-wrapper">
                <i className="bi bi-exclamation-triangle"></i>
              </div>
              <h6 className="mb-0 fw-bold text-white central-assinante-card-title">{dados.resumo.titulos_atrasados}</h6>
              <small className="text-white-50 d-block central-assinante-card-label">Faturas Atrasadas</small>
              <small className="text-white-50 central-assinante-card-subtitle">{formatCurrency(dados.resumo.valor_total_atrasado)}</small>
            </div>
          </Card>
        </div>
      </div>

      <div className="col-6 col-sm-4 col-md-3 col-lg-2">
        <div className="central-assinante-card-bg central-assinante-resumo-card central-assinante-card-a-pagar">
          <Card className="h-100 border-0" padding="none" clickable onClick={() => handleCardClick('faturas_a_pagar')}>
            <div className="card-body text-center central-assinante-card-body-compact">
              <div className="central-assinante-card-icon-wrapper">
                <i className="bi bi-clock-history"></i>
              </div>
              <h6 className="mb-0 fw-bold text-white central-assinante-card-title">{dados.resumo.titulos_a_pagar}</h6>
              <small className="text-white-50 d-block central-assinante-card-label">A Pagar</small>
              <small className="text-white-50 central-assinante-card-subtitle">{formatCurrency(dados.resumo.valor_total_a_pagar)}</small>
            </div>
          </Card>
        </div>
      </div>

      <div className="col-6 col-sm-4 col-md-3 col-lg-2">
        <div className="central-assinante-card-bg central-assinante-resumo-card central-assinante-card-termos">
          <Card className="h-100 border-0" padding="none" clickable onClick={() => handleCardClick('termos')}>
            <div className="card-body text-center central-assinante-card-body-compact">
              <div className="central-assinante-card-icon-wrapper">
                <i className="bi bi-file-check"></i>
              </div>
              <h6 className="mb-0 fw-bold text-white central-assinante-card-title">{dados.resumo.total_termos}</h6>
              <small className="text-white-50 d-block central-assinante-card-label">Termos</small>
              <small className="text-white-50 central-assinante-card-subtitle">{dados.resumo.termos_assinados} assinados</small>
            </div>
          </Card>
        </div>
      </div>
    </div>

    <div className="central-assinante-card-bg">
      <Card className="border-0" padding="none">
        <div className="border-bottom border-secondary central-assinante-info-header">
          <h6 className="mb-0 fw-bold text-white central-assinante-info-title">
            <i className="bi bi-person-circle text-white-50 me-1"></i>
            Informações do Cliente
          </h6>
        </div>
        <div className="central-assinante-info-body">
          <div className="row g-1">
            <div className="col-12 col-md-6">
              <div className="central-assinante-info-field">
                <small className="text-white-50 text-uppercase d-block central-assinante-info-label">Razão Social</small>
                <p className="mb-0 text-white central-assinante-info-value">{dados.cliente.razao_social}</p>
              </div>
            </div>
            {dados.cliente.nome_fantasia && (
              <div className="col-12 col-md-6">
                <div className="central-assinante-info-field">
                  <small className="text-white-50 text-uppercase d-block central-assinante-info-label">Nome Fantasia</small>
                  <p className="mb-0 text-white central-assinante-info-value">{dados.cliente.nome_fantasia}</p>
                </div>
              </div>
            )}
            {dados.cliente.cpf_cnpj && (
              <div className="col-12 col-md-6">
                <div className="central-assinante-info-field">
                  <small className="text-white-50 text-uppercase d-block central-assinante-info-label">CPF/CNPJ</small>
                  <p className="mb-0 text-white central-assinante-info-value">{dados.cliente.cpf_cnpj}</p>
                </div>
              </div>
            )}
            {dados.cliente.email && (
              <div className="col-12 col-md-6">
                <div className="central-assinante-info-field">
                  <small className="text-white-50 text-uppercase d-block central-assinante-info-label">Email</small>
                  <p className="mb-0 text-white central-assinante-info-value">{dados.cliente.email}</p>
                </div>
              </div>
            )}
            {dados.cliente.telefone && (
              <div className="col-12 col-md-6">
                <div className="central-assinante-info-field">
                  <small className="text-white-50 text-uppercase d-block central-assinante-info-label">Telefone</small>
                  <p className="mb-0 text-white central-assinante-info-value">{dados.cliente.telefone}</p>
                </div>
              </div>
            )}
            {dados.cliente.endereco && (
              <div className="col-12">
                <div className="central-assinante-info-field">
                  <small className="text-white-50 text-uppercase d-block central-assinante-info-label">Endereço</small>
                  <p className="mb-0 text-white central-assinante-info-value">
                    {dados.cliente.endereco}
                    {dados.cliente.numero && `, ${dados.cliente.numero}`}
                    {dados.cliente.complemento && ` - ${dados.cliente.complemento}`}
                    {dados.cliente.bairro && `, ${dados.cliente.bairro}`}
                    {dados.cliente.cidade && ` - ${dados.cliente.cidade}`}
                    {dados.cliente.estado && `/${dados.cliente.estado}`}
                    {dados.cliente.cep && ` - CEP: ${dados.cliente.cep}`}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  </div>
);

export default ResumoTab;
