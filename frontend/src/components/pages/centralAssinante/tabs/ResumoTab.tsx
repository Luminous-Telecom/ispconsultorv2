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
    <div className="row central-assinante-resumo-row">
      <div className="col-6 col-sm-4 col-md-3 col-lg-2">
        <div className="central-assinante-card-bg central-assinante-resumo-card">
          <Card className="h-100 border-0" padding="none" clickable onClick={() => handleCardClick('contratos')}>
            <div className="card-body text-center central-assinante-card-body-compact">
              <h6 className="mb-0 fw-semibold text-white central-assinante-card-title">{dados.resumo.total_contratos}</h6>
              <small className="text-white-50 d-block central-assinante-card-label">Contratos</small>
              <small className="text-white-50 central-assinante-card-subtitle">{dados.resumo.contratos_ativos} ativos</small>
            </div>
          </Card>
        </div>
      </div>

      <div className="col-6 col-sm-4 col-md-3 col-lg-2">
        <div className="central-assinante-card-bg central-assinante-resumo-card">
          <Card className="h-100 border-0" padding="none" clickable onClick={() => handleCardClick('faturas_pagas')}>
            <div className="card-body text-center central-assinante-card-body-compact">
              <h6 className="mb-0 fw-semibold text-white central-assinante-card-title">{dados.resumo.titulos_pagos}</h6>
              <small className="text-white-50 d-block central-assinante-card-label">Pagas</small>
              <small className="text-white-50 central-assinante-card-subtitle">{formatCurrency(dados.resumo.valor_total_pago)}</small>
            </div>
          </Card>
        </div>
      </div>

      <div className="col-6 col-sm-4 col-md-3 col-lg-2">
        <div className="central-assinante-card-bg central-assinante-resumo-card">
          <Card className="h-100 border-0" padding="none" clickable onClick={() => handleCardClick('faturas_atrasadas')}>
            <div className="card-body text-center central-assinante-card-body-compact">
              <h6 className="mb-0 fw-semibold text-white central-assinante-card-title">{dados.resumo.titulos_atrasados}</h6>
              <small className="text-white-50 d-block central-assinante-card-label">Atrasadas</small>
              <small className="text-white-50 central-assinante-card-subtitle">{formatCurrency(dados.resumo.valor_total_atrasado)}</small>
            </div>
          </Card>
        </div>
      </div>

      <div className="col-6 col-sm-4 col-md-3 col-lg-2">
        <div className="central-assinante-card-bg central-assinante-resumo-card">
          <Card className="h-100 border-0" padding="none" clickable onClick={() => handleCardClick('faturas_a_pagar')}>
            <div className="card-body text-center central-assinante-card-body-compact">
              <h6 className="mb-0 fw-semibold text-white central-assinante-card-title">{dados.resumo.titulos_a_pagar}</h6>
              <small className="text-white-50 d-block central-assinante-card-label">A pagar</small>
              <small className="text-white-50 central-assinante-card-subtitle">{formatCurrency(dados.resumo.valor_total_a_pagar)}</small>
            </div>
          </Card>
        </div>
      </div>

      <div className="col-6 col-sm-4 col-md-3 col-lg-2">
        <div className="central-assinante-card-bg central-assinante-resumo-card">
          <Card className="h-100 border-0" padding="none" clickable onClick={() => handleCardClick('termos')}>
            <div className="card-body text-center central-assinante-card-body-compact">
              <h6 className="mb-0 fw-semibold text-white central-assinante-card-title">{dados.resumo.total_termos}</h6>
              <small className="text-white-50 d-block central-assinante-card-label">Termos</small>
              <small className="text-white-50 central-assinante-card-subtitle">{dados.resumo.termos_assinados} assinados</small>
            </div>
          </Card>
        </div>
      </div>
    </div>

    <div className="central-assinante-card-bg">
      <Card className="border-0" padding="none">
        <div className="central-assinante-info-header">
          <h6 className="mb-0 fw-semibold text-white central-assinante-info-title">Informações do cliente</h6>
        </div>
        <div className="central-assinante-info-body">
          <div className="central-assinante-info-grid">
            <div className="central-assinante-info-field">
              <small className="d-block central-assinante-info-label">Razão social</small>
              <p className="mb-0 central-assinante-info-value">{dados.cliente.razao_social}</p>
            </div>
            {dados.cliente.nome_fantasia && (
              <div className="central-assinante-info-field">
                <small className="d-block central-assinante-info-label">Nome fantasia</small>
                <p className="mb-0 central-assinante-info-value">{dados.cliente.nome_fantasia}</p>
              </div>
            )}
            {dados.cliente.cpf_cnpj && (
              <div className="central-assinante-info-field">
                <small className="d-block central-assinante-info-label">CPF/CNPJ</small>
                <p className="mb-0 central-assinante-info-value">{dados.cliente.cpf_cnpj}</p>
              </div>
            )}
            {dados.cliente.email && (
              <div className="central-assinante-info-field">
                <small className="d-block central-assinante-info-label">Email</small>
                <p className="mb-0 central-assinante-info-value">{dados.cliente.email}</p>
              </div>
            )}
            {dados.cliente.telefone && (
              <div className="central-assinante-info-field">
                <small className="d-block central-assinante-info-label">Telefone</small>
                <p className="mb-0 central-assinante-info-value">{dados.cliente.telefone}</p>
              </div>
            )}
            {dados.cliente.endereco && (
              <div className="central-assinante-info-field central-assinante-info-field-full">
                <small className="d-block central-assinante-info-label">Endereço</small>
                <p className="mb-0 central-assinante-info-value">
                  {dados.cliente.endereco}
                  {dados.cliente.numero && `, ${dados.cliente.numero}`}
                  {dados.cliente.complemento && ` - ${dados.cliente.complemento}`}
                  {dados.cliente.bairro && `, ${dados.cliente.bairro}`}
                  {dados.cliente.cidade && ` - ${dados.cliente.cidade}`}
                  {dados.cliente.estado && `/${dados.cliente.estado}`}
                  {dados.cliente.cep && ` - CEP: ${dados.cliente.cep}`}
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  </div>
);

export default ResumoTab;
