import React from 'react';
import { FormField, NovoButton, Loading } from 'components/ui';
import type { CaItem } from './types';
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
  <div ref={cardRef} className="mb-3">
    <div className="form-section-heading-row">
      <span className="form-section-heading-pill">CAs</span>
      <div className="form-section-heading-line" aria-hidden />
    </div>
      <div className="row g-2 mb-2">
        <div className="col-12">
          <FormField
            name="ca_nome"
            label="Nome da CA"
            size="sm"
            value={caNome}
            onChange={(value) => setCaNome(String(value ?? ''))}
          />
        </div>
        <div className="col-12">
          <div className="form-modal-input-col">
            <NovoButton
              type="button"
              disabled={createCaMutation.isPending}
              isPending={createCaMutation.isPending}
              onClick={handleCreateCa}
            />
          </div>
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
                <td>
                  <Loading variant="inline" size="sm" showMessage={false} />
                </td>
              </tr>
            )}
            {(cas as CaItem[]).map((ca) => (
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
);

export default CasSection;
