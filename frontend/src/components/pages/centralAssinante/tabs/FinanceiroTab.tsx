import React from 'react';
import {
  Badge,
  Card,
  VisualizarButton,
  BaixarButton,
} from 'components/ui';
import { DadosCentralAssinante } from 'services/centralAssinanteService';
import { formatCurrency, formatDate } from 'utils/formatters';
import { FaturaVisualizar } from '../centralAssinanteUtils';

interface FinanceiroTabProps {
  dados: DadosCentralAssinante;
  getStatusVariant: (status: string) => 'success' | 'danger' | 'warning' | 'secondary' | 'info';
  getStatusLabel: (status: string) => string;
  baixandoBoletoId: number | null;
  handleVisualizarFatura: (titulo: FaturaVisualizar) => void;
  handleImprimirFatura: (tituloId: number) => void;
}

const FinanceiroTab: React.FC<FinanceiroTabProps> = ({
  dados,
  getStatusVariant,
  getStatusLabel,
  baixandoBoletoId,
  handleVisualizarFatura,
  handleImprimirFatura,
}) => (
  <div>
    {(dados.titulos.a_pagar.length === 0 && dados.titulos.atrasados.length === 0) ? (
      <div className="text-center py-3">
        <i className="bi bi-receipt text-white-50 central-assinante-empty-icon"></i>
        <p className="text-white-50 mt-2 small">Nenhuma fatura em aberto encontrada</p>
      </div>
    ) : (
      <>
        {dados.titulos.atrasados.length > 0 && (
          <div className="mb-3">
            <h6 className="text-white mb-2 small text-center">
              <i className="bi bi-exclamation-triangle central-assinante-item-icon me-1"></i>
              Faturas Atrasadas ({dados.titulos.atrasados.length})
            </h6>
            <div className="row g-2">
              {dados.titulos.atrasados.map((titulo) => (
                <div key={titulo.id} className="col-12">
                  <div className="central-assinante-item">
                    <Card className="border-0" padding="none">
                      <div className="central-assinante-item-body">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div className="flex-grow-1">
                            <h6 className="mb-1 fw-bold text-white central-assinante-item-title">
                              <i className="bi bi-receipt text-white-50 central-assinante-item-icon me-1"></i>
                              {titulo.numero_titulo}
                            </h6>
                            {titulo.plano && (
                              <p className="mb-0 text-white-50 central-assinante-item-subtitle">{titulo.plano}</p>
                            )}
                          </div>
                          <Badge variant="danger" pill className="ms-2">
                            {titulo.dias_atraso}d atraso
                          </Badge>
                        </div>
                        <div className="d-flex gap-3">
                          <div className="flex-fill">
                            <small className="text-white-50 d-block central-assinante-item-label">Valor</small>
                            <p className="mb-0 text-white fw-semibold central-assinante-item-value-bold">{formatCurrency(titulo.valor_aberto || titulo.valor_final || titulo.valor)}</p>
                          </div>
                          <div className="flex-fill">
                            <small className="text-white-50 d-block central-assinante-item-label">Vencimento</small>
                            <p className="mb-0 text-white central-assinante-item-value">{formatDate(titulo.data_vencimento)}</p>
                          </div>
                        </div>
                        <div className="d-flex gap-2 mt-3">
                          <VisualizarButton
                            variant="secondary"
                            size="sm"
                            onClick={() => handleVisualizarFatura(titulo)}
                            className="flex-grow-1 central-assinante-item-button"
                          />
                          <BaixarButton
                            variant="secondary"
                            size="sm"
                            onClick={() => handleImprimirFatura(titulo.id)}
                            className="flex-grow-1 central-assinante-item-button"
                            disabled={baixandoBoletoId === titulo.id}
                            isPending={baixandoBoletoId === titulo.id}
                          />
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {dados.titulos.a_pagar.length > 0 && (
          <div className="mb-3">
            <div className="row g-2">
              {dados.titulos.a_pagar.map((titulo) => (
                <div key={titulo.id} className="col-12">
                  <div className="central-assinante-item">
                    <Card className="border-0" padding="none">
                      <div className="central-assinante-item-body">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div className="flex-grow-1">
                            <h6 className="mb-1 fw-bold text-white" style={{ fontSize: '0.9rem' }}>
                              <i className="bi bi-receipt text-white-50 central-assinante-item-icon me-1"></i>
                              {titulo.numero_titulo}
                            </h6>
                            {titulo.plano && (
                              <p className="mb-0 text-white-50" style={{ fontSize: '0.8rem' }}>{titulo.plano}</p>
                            )}
                          </div>
                          <Badge variant={getStatusVariant(titulo.status)} pill className="ms-2">
                            {getStatusLabel(titulo.status)}
                          </Badge>
                        </div>
                        <div className="d-flex gap-3">
                          <div className="flex-fill">
                            <small className="text-white-50 d-block central-assinante-item-label">Valor</small>
                            <p className="mb-0 text-white fw-semibold central-assinante-item-value-bold">{formatCurrency(titulo.valor_aberto || titulo.valor_final || titulo.valor)}</p>
                          </div>
                          <div className="flex-fill">
                            <small className="text-white-50 d-block central-assinante-item-label">Vencimento</small>
                            <p className="mb-0 text-white central-assinante-item-value">{formatDate(titulo.data_vencimento)}</p>
                          </div>
                        </div>
                        <div className="d-flex gap-2 mt-3">
                          <VisualizarButton
                            variant="secondary"
                            size="sm"
                            onClick={() => handleVisualizarFatura(titulo)}
                            className="flex-grow-1 central-assinante-item-button"
                          />
                          <BaixarButton
                            variant="secondary"
                            size="sm"
                            onClick={() => handleImprimirFatura(titulo.id)}
                            className="flex-grow-1 central-assinante-item-button"
                            disabled={baixandoBoletoId === titulo.id}
                            isPending={baixandoBoletoId === titulo.id}
                          />
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    )}
  </div>
);

export default FinanceiroTab;
