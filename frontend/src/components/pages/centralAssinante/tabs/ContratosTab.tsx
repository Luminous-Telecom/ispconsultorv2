import React from 'react';
import { Badge, Card, ImprimirButton } from 'components/ui';
import { DadosCentralAssinante } from 'services/centralAssinanteService';
import { formatCurrency, formatDate } from 'utils/formatters';

interface ContratosTabProps {
  dados: DadosCentralAssinante;
  getStatusVariant: (status: string) => 'success' | 'danger' | 'warning' | 'secondary' | 'info';
  getStatusLabel: (status: string) => string;
  baixandoContratoId: number | null;
  handleImprimirContrato: (contratoId: number) => void;
}

const ContratosTab: React.FC<ContratosTabProps> = ({
  dados,
  getStatusVariant,
  getStatusLabel,
  baixandoContratoId,
  handleImprimirContrato,
}) => (
  <div>
    {dados.contratos.filter((c) => c.status?.toLowerCase() === 'ativo').length === 0 ? (
      <div className="text-center py-3">
        <i className="bi bi-file-earmark-text text-white-50 central-assinante-empty-icon"></i>
        <p className="text-white-50 mt-2 small">Nenhum contrato ativo encontrado</p>
      </div>
    ) : (
      <div className="row g-2">
        {dados.contratos.filter((c) => c.status?.toLowerCase() === 'ativo').map((contrato) => (
          <div key={contrato.id} className="col-12">
            <div className="central-assinante-item">
              <Card className="border-0" padding="none">
                <div className="central-assinante-item-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div className="flex-grow-1">
                      <h6 className="mb-1 fw-bold text-white central-assinante-item-title">
                        <i className="bi bi-file-earmark-text text-white-50 central-assinante-item-icon me-1"></i>
                        Contrato #{contrato.id}
                      </h6>
                      <p className="mb-0 text-white-50 central-assinante-item-subtitle">{contrato.plano || 'Sem plano'}</p>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <Badge variant={getStatusVariant(contrato.status)} pill>
                        {getStatusLabel(contrato.status)}
                      </Badge>
                      <ImprimirButton
                        variant="secondary"
                        size="sm"
                        onClick={() => handleImprimirContrato(contrato.id)}
                        disabled={baixandoContratoId === contrato.id}
                        isPending={baixandoContratoId === contrato.id}
                        className="central-assinante-pdf-button"
                      />
                    </div>
                  </div>
                  <div className="d-flex gap-3 flex-wrap">
                    {contrato.valor_final && (
                      <div className="flex-fill central-assinante-item-min-width">
                        <small className="text-white-50 d-block central-assinante-item-label">Valor</small>
                        <p className="mb-0 text-white fw-semibold central-assinante-item-value-bold">{formatCurrency(contrato.valor_final)}</p>
                      </div>
                    )}
                    {contrato.data_inicio && (
                      <div className="flex-fill central-assinante-item-min-width">
                        <small className="text-white-50 d-block central-assinante-item-label">Data de Início</small>
                        <p className="mb-0 text-white central-assinante-item-value">{formatDate(contrato.data_inicio)}</p>
                      </div>
                    )}
                    {contrato.data_fim && (
                      <div className="flex-fill central-assinante-item-min-width">
                        <small className="text-white-50 d-block central-assinante-item-label">Data de Fim</small>
                        <p className="mb-0 text-white central-assinante-item-value">{formatDate(contrato.data_fim)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default ContratosTab;
