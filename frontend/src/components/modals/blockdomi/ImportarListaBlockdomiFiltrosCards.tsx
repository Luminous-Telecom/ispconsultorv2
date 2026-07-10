import React from 'react';
import { CopiarIconButton } from 'components/ui';
import type { BlockdomiImportTranslateFn } from './importarListaBlockdomiTypes';

interface ImportarListaBlockdomiFiltrosCardsProps {
  t: BlockdomiImportTranslateFn;
  dominiosBruto: string[];
  dominiosFiltrados: { raw: string; fixed: string }[];
  dominiosValidos: string[];
  onCopied?: () => void;
  onCopyFailed?: () => void;
  renderList: (items: string[]) => React.ReactNode;
}

const ImportarListaBlockdomiFiltrosCards: React.FC<ImportarListaBlockdomiFiltrosCardsProps> = ({
  t,
  dominiosBruto,
  dominiosFiltrados,
  dominiosValidos,
  onCopied,
  onCopyFailed,
  renderList,
}) => (
  <div className="ilb-classification-cards">
    <div className="card ilb-class-card">
      <div className="card-header bg-light d-flex justify-content-between align-items-center gap-2">
        <span>
          {t('blockdomi.raw')} ({dominiosBruto.length})
        </span>
        <CopiarIconButton
          text={dominiosBruto.join('\n')}
          copyKey="blockdomi-raw"
          disabled={dominiosBruto.length === 0}
          onCopied={onCopied}
          onCopyFailed={onCopyFailed}
        />
      </div>
      <div className="card-body overflow-auto user-select-text">
        {dominiosBruto.length === 0 ? (
          <span className="text-muted small">{t('blockdomi.none')}</span>
        ) : (
          renderList(dominiosBruto)
        )}
      </div>
    </div>
    <div className="card ilb-class-card">
      <div className="card-header bg-warning text-dark d-flex justify-content-between align-items-center gap-2">
        <span>
          {t('blockdomi.filtered')} ({dominiosFiltrados.length})
        </span>
        <CopiarIconButton
          text={dominiosFiltrados.map((x) => x.fixed).join('\n')}
          copyKey="blockdomi-filtered"
          variant="outline-dark"
          disabled={dominiosFiltrados.length === 0}
          onCopied={onCopied}
          onCopyFailed={onCopyFailed}
        />
      </div>
      <div className="card-body overflow-auto user-select-text">
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
    </div>
    <div className="card ilb-class-card">
      <div className="card-header bg-success text-white d-flex justify-content-between align-items-center gap-2">
        <span>
          {t('blockdomi.valid')} ({dominiosValidos.length})
        </span>
        <CopiarIconButton
          text={dominiosValidos.join('\n')}
          copyKey="blockdomi-valid"
          variant="outline-light"
          disabled={dominiosValidos.length === 0}
          onCopied={onCopied}
          onCopyFailed={onCopyFailed}
        />
      </div>
      <div className="card-body overflow-auto user-select-text">
        {dominiosValidos.length === 0 ? (
          <span className="text-muted small">{t('blockdomi.none')}</span>
        ) : (
          renderList(dominiosValidos)
        )}
      </div>
    </div>
  </div>
);

export default ImportarListaBlockdomiFiltrosCards;
