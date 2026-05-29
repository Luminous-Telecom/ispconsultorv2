import React from 'react';
import { FormField, NovoButton } from 'components/ui';
import type { useRpkiKrillConfig } from './useRpkiKrillConfig';

type CasSectionProps = {
  cardRef: React.RefObject<HTMLDivElement | null>;
} & ReturnType<typeof useRpkiKrillConfig>['casSection'];

const CasSection: React.FC<CasSectionProps> = ({
  cardRef,
  caNome,
  setCaNome,
  cas,
  isLoadingCas,
  createCaMutation,
  handleCreateCa,
}) => (
  <div ref={cardRef} className="card mb-3">
    <div className="card-header">CAs</div>
    <div className="card-body">
      <div className="row g-2 mb-2">
        <div className="col-md-8">
          <FormField
            name="ca_nome"
            label="Nome da CA"
            size="sm"
            value={caNome}
            onChange={(value) => setCaNome(String(value ?? ''))}
          />
        </div>
        <div className="col-md-4 d-flex align-items-end">
          <NovoButton
            type="button"
            disabled={createCaMutation.isPending}
            isPending={createCaMutation.isPending}
            onClick={handleCreateCa}
          />
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-sm table-striped mb-0">
          <thead>
            <tr>
              <th>Nome</th>
            </tr>
          </thead>
          <tbody>
            {isLoadingCas && (
              <tr>
                <td className="text-muted">Carregando...</td>
              </tr>
            )}
            {cas.map((ca) => (
              <tr key={ca.id}>
                <td>{ca.nome}</td>
              </tr>
            ))}
            {!isLoadingCas && cas.length === 0 && (
              <tr>
                <td colSpan={1} className="text-muted">
                  Nenhuma CA configurada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

export default CasSection;
