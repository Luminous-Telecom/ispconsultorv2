import React from 'react';
import {
  AplicarSelecaoButton,
  LimparButton,
  SelecionarButton,
  TableFilterCheckbox,
} from 'components/ui';
import type { BlockdomiImportTranslateFn } from './importarListaBlockdomiTypes';

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
  <div className="mb-3">
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
      {Object.entries(colunasDisponiveis).map(([header, items]) => {
        const selecionada = colunasSeleccionadas.has(header);
        return (
          <div key={header} className="card ilb-class-card">
            <div className="card-header bg-light">
              <TableFilterCheckbox
                id={`blockdomi-coluna-${header}`}
                name={`blockdomi-coluna-${header}`}
                label={`${header} (${items.length})`}
                checked={selecionada}
                onChange={(checked) => {
                  if (checked !== selecionada) onColunaToggle(header);
                }}
              />
            </div>
            <div className="card-body overflow-auto user-select-text">
              {items.length === 0 ? (
                <span className="text-muted small">{t('blockdomi.none')}</span>
              ) : (
                <ul className="list-unstyled mb-0 small">
                  {items.slice(0, 5).map((item, i) => (
                    <li key={i} className="text-nowrap overflow-x-auto ilb-list-item" title={item}>
                      {item}
                    </li>
                  ))}
                  {items.length > 5 && (
                    <li className="text-muted opacity-75">+{items.length - 5}</li>
                  )}
                </ul>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export default ImportarListaBlockdomiColunasPanel;
