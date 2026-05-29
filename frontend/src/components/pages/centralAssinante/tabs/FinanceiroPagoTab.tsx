import React from 'react';
import {
  Badge,
  Card,
  VisualizarButton,
  BaixarButton,
  ReciboButton,
} from 'components/ui';
import { DadosCentralAssinante } from 'services/centralAssinanteService';
import { formatCurrency, formatDate } from 'utils/formatters';
import { FaturaVisualizar } from '../centralAssinanteUtils';

interface FinanceiroPagoTabProps {
  dados: DadosCentralAssinante;
  baixandoBoletoId: number | null;
  baixandoReciboId: number | null;
  handleVisualizarFatura: (titulo: FaturaVisualizar) => void;
  handleImprimirFatura: (tituloId: number) => void;
  handleImprimirRecibo: (tituloId: number) => void;
}

const FinanceiroPagoTab: React.FC<FinanceiroPagoTabProps> = ({
  dados,
  baixandoBoletoId,
  baixandoReciboId,
  handleVisualizarFatura,
  handleImprimirFatura,
  handleImprimirRecibo,
}) => (
  <div>
    {dados.titulos.pagos.length === 0 ? (
      <div className="text-center py-3">
        <i className="bi bi-check-circle text-white-50" style={{ fontSize: '2rem' }}></i>
        <p className="text-white-50 mt-2 small">Nenhuma fatura paga encontrada</p>
      </div>
    ) : (
      <div className="mb-3">
        <div className="row g-2">
          {dados.titulos.pagos.map((titulo) => (
            <div key={titulo.id} className="col-12">
              <div className="central-assinante-item">
                <Card className="border-0" padding="none">
                  <div className="central-assinante-item-body">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div className="flex-grow-1">
                        <h6 className="mb-1 fw-bold text-white central-assinante-item-title">
                          <i className="bi bi-receipt text-white-50 me-2"></i>
                          {titulo.numero_titulo}
                        </h6>
                        {titulo.plano && (
                          <p className="mb-0 text-white-50 central-assinante-item-subtitle">{titulo.plano}</p>
                        )}
                      </div>
                      <Badge variant="success" pill className="ms-2">
                        Pago
                      </Badge>
                    </div>
                    <div className="d-flex gap-3">
                      <div className="flex-fill">
                        <small className="text-white-50 d-block central-assinante-item-label">Valor Pago</small>
                        <p className="mb-0 text-white fw-semibold central-assinante-item-value-bold">{formatCurrency(titulo.valor_pago || titulo.valor_final || titulo.valor)}</p>
                      </div>
                      <div className="flex-fill">
                        <small className="text-white-50 d-block central-assinante-item-label">Vencimento</small>
                        <p className="mb-0 text-white central-assinante-item-value">{formatDate(titulo.data_vencimento)}</p>
                      </div>
                      {titulo.data_pagamento && (
                        <div className="flex-fill">
                          <small className="text-white-50 d-block central-assinante-item-label">Pagamento</small>
                          <p className="mb-0 text-white central-assinante-item-value">{formatDate(titulo.data_pagamento)}</p>
                        </div>
                      )}
                    </div>
                    <div className="d-flex gap-2 mt-3">
                      <VisualizarButton
                        variant="secondary"
                        size="sm"
                        onClick={() => handleVisualizarFatura(titulo)}
                        className="flex-grow-1 central-assinante-item-button"
                      />
                      <ReciboButton
                        variant="secondary"
                        size="sm"
                        onClick={() => handleImprimirRecibo(titulo.id)}
                        className="flex-grow-1 central-assinante-item-button"
                        disabled={baixandoReciboId === titulo.id}
                        isPending={baixandoReciboId === titulo.id}
                      />
                      <BaixarButton
                        variant="secondary"
                        size="sm"
                        label="Boleto"
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
  </div>
);

export default FinanceiroPagoTab;
