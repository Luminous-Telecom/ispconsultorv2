import React, { useState } from 'react';
import {
  AplicarSelecaoButton,
  AppButton,
  LimparButton,
  SelecionarButton,
  TableFilterCheckbox,
} from 'components/ui';
import type { BlockdomiImportTranslateFn } from './importarListaBlockdomiTypes';

const COLUNA_PREVIEW_LIMIT = 5;

interface ColunaDetectadaCardProps {
  header: string;
  items: string[];
  selecionada: boolean;
  onToggle: (header: string) => void;
  t: BlockdomiImportTranslateFn;
}

const ColunaDetectadaCard: React.FC<ColunaDetectadaCardProps> = ({
  header,
  items,
  selecionada,
  onToggle,
  t,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasMore = items.length > COLUNA_PREVIEW_LIMIT;
  const visibleItems = isExpanded ? items : items.slice(0, COLUNA_PREVIEW_LIMIT);

  return (
    <div className="card ilb-class-card">
      <div className="card-header bg-light">
        <TableFilterCheckbox
          id={`blockdomi-coluna-${header}`}
          name={`blockdomi-coluna-${header}`}
          label={`${header} (${items.length})`}
          checked={selecionada}
          onChange={(checked) => {
            if (checked !== selecionada) onToggle(header);
          }}
        />
      </div>
      <div
        className={`card-body overflow-auto user-select-text${isExpanded ? ' ilb-coluna-body-expanded' : ''}`}
      >
        {items.length === 0 ? (
          <span className="text-muted small">{t('blockdomi.none')}</span>
        ) : (
          <ul className="list-unstyled mb-0 small">
            {visibleItems.map((item, index) => (
              <li key={`${item}-${index}`} className="text-nowrap overflow-x-auto ilb-list-item" title={item}>
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
      {hasMore && (
        <div className="ilb-coluna-ver-mais">
          <AppButton
            type="button"
            label={isExpanded ? t('blockdomi.colunasVerMenos') : t('blockdomi.colunasVerMais')}
            variant="ghost"
            size="sm"
            className="p-0 text-muted fs-sm"
            onClick={() => setIsExpanded((current) => !current)}
          />
        </div>
      )}
    </div>
  );
};

interface ImportarListaBlockdomiColunasPanelProps {
  colunasDisponiveis: Record<string, string[]>;
  colunasSeleccionadas: Set<string>;
  onColunaToggle: (header: string) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onAplicar: () => void;
  t: BlockdomiImportTranslateFn;
}

const ImportarListaBlockdomiColunasPanel: React.FC<ImportarListaBlockdomiColunasPanelProps> = ({
  colunasDisponiveis,
  colunasSeleccionadas,
  onColunaToggle,
  onSelectAll,
  onSelectNone,
  onAplicar,
  t,
}) => (
  <div className="ilb-colunas-panel">
    <div className="form-section-heading-row">
      <span className="form-section-heading-pill">{t('blockdomi.colunasDetectadas')}</span>
      <div className="form-section-heading-line" aria-hidden />
      <div className="d-flex gap-2 align-items-center flex-shrink-0">
        <SelecionarButton
          type="button"
          label={t('blockdomi.colunasSelecAll')}
          variant="ghost"
          size="sm"
          className="p-0 text-muted fs-sm"
          onClick={onSelectAll}
        />
        <LimparButton
          type="button"
          label={t('blockdomi.colunasSelecNone')}
          variant="ghost"
          size="sm"
          className="p-0 text-muted fs-sm"
          onClick={onSelectNone}
        />
        <AplicarSelecaoButton
          type="button"
          className="py-0 px-2 fs-sm"
          onClick={onAplicar}
        />
      </div>
    </div>
    <div className="ilb-classification-cards">
      {Object.entries(colunasDisponiveis).map(([header, items]) => (
        <ColunaDetectadaCard
          key={header}
          header={header}
          items={items}
          selecionada={colunasSeleccionadas.has(header)}
          onToggle={onColunaToggle}
          t={t}
        />
      ))}
    </div>
  </div>
);

export default ImportarListaBlockdomiColunasPanel;
