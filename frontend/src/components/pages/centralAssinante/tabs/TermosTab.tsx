import React from 'react';
import { Badge, Card, ImprimirButton } from 'components/ui';
import { DadosCentralAssinante } from 'services/centralAssinanteService';
import { formatDate } from 'utils/formatters';

interface TermosTabProps {
  dados: DadosCentralAssinante;
  baixandoTermoId: number | null;
  handleImprimirTermo: (termoId: number) => void;
}

const TermosTab: React.FC<TermosTabProps> = ({
  dados,
  baixandoTermoId,
  handleImprimirTermo,
}) => {
  if (dados.termos.length === 0) {
    return (
      <div className="text-center py-3">
        <i className="bi bi-file-check text-white-50 central-assinante-empty-icon"></i>
        <p className="text-white-50 mt-2 small">Nenhum termo encontrado</p>
      </div>
    );
  }

  return (
    <div className="central-assinante-stack">
      {dados.termos.map((termo) => (
        <div key={termo.id} className="central-assinante-item">
          <Card className="border-0" padding="none">
            <div className="central-assinante-termo-body">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <h6 className="mb-0 fw-bold text-white central-assinante-termo-title">{termo.titulo || termo.tipo_termo || `Termo #${termo.id}`}</h6>
                <div className="d-flex gap-2 align-items-center">
                  <Badge variant={termo.assinado === 'SIM' ? 'success' : 'warning'} pill>
                    {termo.assinado === 'SIM' ? 'Assinado' : 'Pendente'}
                  </Badge>
                  <ImprimirButton
                    variant="secondary"
                    size="sm"
                    onClick={() => handleImprimirTermo(termo.id)}
                    disabled={baixandoTermoId === termo.id}
                    isPending={baixandoTermoId === termo.id}
                    className="central-assinante-pdf-button"
                  />
                </div>
              </div>
              <div className="d-flex gap-3 flex-wrap">
                <div className="flex-fill central-assinante-item-min-width">
                  <small className="text-white-50 d-block central-assinante-item-label">Tipo</small>
                  <p className="mb-0 text-white central-assinante-item-value">{termo.tipo_termo}</p>
                </div>
                {termo.aceito_por && (
                  <div className="flex-fill central-assinante-item-min-width">
                    <small className="text-white-50 d-block central-assinante-item-label">Assinado por</small>
                    <p className="mb-0 text-white central-assinante-item-value">{termo.aceito_por}</p>
                  </div>
                )}
                {termo.data_aceite && (
                  <div className="flex-fill central-assinante-item-min-width">
                    <small className="text-white-50 d-block central-assinante-item-label">Data de aceite</small>
                    <p className="mb-0 text-white central-assinante-item-value">{formatDate(termo.data_aceite)}</p>
                  </div>
                )}
                <div className="flex-fill central-assinante-item-min-width">
                  <small className="text-white-50 d-block central-assinante-item-label">Data de criação</small>
                  <p className="mb-0 text-white central-assinante-item-value">{formatDate(termo.created_at)}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      ))}
    </div>
  );
};

export default TermosTab;
