import React from 'react';
import {
  AplicarSelecaoButton,
  LimparButton,
  SelecionarButton,
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
  <div className="mb-3 border rounded blockdomi-panel">
    <div className="d-flex align-items-center justify-content-between px-2 pt-2 pb-1">
      <span className="small fw-semibold">{t('blockdomi.colunasDetectadas')}</span>
      <div className="d-flex gap-2 align-items-center">
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
    <div className="d-flex flex-wrap gap-2 p-2">
      {Object.entries(colunasDisponiveis).map(([header, items]) => {
        const selecionada = colunasSeleccionadas.has(header);
        return (
          <div
            key={header}
            className={`blockdomi-column-card ${selecionada ? 'blockdomi-column-card--selected' : ''}`}
          >
            <label
              className={`blockdomi-column-header ${selecionada ? 'blockdomi-column-header--selected' : ''}`}
            >
              <input
                type="checkbox"
                className="form-check-input m-0 flex-shrink-0"
                checked={selecionada}
                onChange={() => onColunaToggle(header)}
              />
              <span className="small fw-semibold text-truncate flex-grow-1" title={header}>{header}</span>
              <span className="small flex-shrink-0 opacity-80">{items.length}</span>
            </label>
            <div className="blockdomi-column-items">
              {items.length === 0 ? (
                <span className="opacity-50">{t('blockdomi.none')}</span>
              ) : (
                items.map((item, i) => (
                  <div key={i} className="text-truncate" title={item}>{item}</div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export default ImportarListaBlockdomiColunasPanel;
