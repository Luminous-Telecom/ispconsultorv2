import React from 'react';
import { CopiarButton } from 'components/ui';
import type { BlockdomiImportTranslateFn } from './importarListaBlockdomiTypes';

interface ImportarListaBlockdomiFiltrosCardsProps {
  t: BlockdomiImportTranslateFn;
  dominiosBruto: string[];
  dominiosFiltrados: { raw: string; fixed: string }[];
  dominiosValidos: string[];
  onCopy: (items: string[]) => void;
  renderList: (items: string[]) => React.ReactNode;
}

const ImportarListaBlockdomiFiltrosCards: React.FC<ImportarListaBlockdomiFiltrosCardsProps> = ({
  t,
  dominiosBruto,
  dominiosFiltrados,
  dominiosValidos,
  onCopy,
  renderList,
}) => (
  <div className="row g-2 mb-2 mt-1 form-modal-multi-col">
    <div className="col-12 col-md-4">
      <div className="card h-100 ilb-filtro-card">
        <div className="card-header py-2 bg-light d-flex justify-content-between align-items-center">
          <strong>{t('blockdomi.raw')}</strong>
          <span className="badge bg-secondary">{dominiosBruto.length}</span>
        </div>
        <div className="card-body py-2 overflow-auto user-select-text ilb-filtro-body">
          {dominiosBruto.length === 0 ? (
            <span className="text-muted small">{t('blockdomi.none')}</span>
          ) : (
            renderList(dominiosBruto)
          )}
        </div>
        <div className="card-footer py-2 d-flex justify-content-center">
          <CopiarButton
            type="button"
            iconOnly
            onClick={() => onCopy(dominiosBruto)}
            disabled={dominiosBruto.length === 0}
          />
        </div>
      </div>
    </div>
    <div className="col-12 col-md-4">
      <div className="card h-100 ilb-filtro-card border-warning">
        <div className="card-header py-2 bg-warning text-dark d-flex justify-content-between align-items-center">
          <strong>{t('blockdomi.filtered')}</strong>
          <span className="badge bg-dark">{dominiosFiltrados.length}</span>
        </div>
        <div className="card-body py-2 overflow-auto user-select-text ilb-filtro-body">
          {dominiosFiltrados.length === 0 ? (
            <span className="text-muted small">{t('blockdomi.none')}</span>
          ) : (
            <ul className="list-unstyled mb-0 small">
              {dominiosFiltrados.map((item, i) => (
                <li key={i} className="text-nowrap overflow-x-auto ilb-list-item">
                  {item.raw} <span className="text-muted">{'>'}</span> {item.fixed}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card-footer py-2 d-flex justify-content-center">
          <CopiarButton
            type="button"
            iconOnly
            variant="outline-dark"
            onClick={() => onCopy(dominiosFiltrados.map((x) => x.fixed))}
            disabled={dominiosFiltrados.length === 0}
          />
        </div>
      </div>
    </div>
    <div className="col-12 col-md-4">
      <div className="card h-100 ilb-filtro-card border-success">
        <div className="card-header py-2 bg-success text-white d-flex justify-content-between align-items-center">
          <strong>{t('blockdomi.valid')}</strong>
          <span className="badge bg-light text-dark">{dominiosValidos.length}</span>
        </div>
        <div className="card-body py-2 overflow-auto user-select-text ilb-filtro-body">
          {dominiosValidos.length === 0 ? (
            <span className="text-muted small">{t('blockdomi.none')}</span>
          ) : (
            renderList(dominiosValidos)
          )}
        </div>
        <div className="card-footer py-2 d-flex justify-content-center">
          <CopiarButton
            type="button"
            iconOnly
            variant="outline-light"
            onClick={() => onCopy(dominiosValidos)}
            disabled={dominiosValidos.length === 0}
          />
        </div>
      </div>
    </div>
  </div>
);

export default ImportarListaBlockdomiFiltrosCards;
