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
  <div className="mb-3 border rounded" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
    <div className="d-flex align-items-center justify-content-between px-2 pt-2 pb-1">
      <span className="small fw-semibold">{t('blockdomi.colunasDetectadas')}</span>
      <div className="d-flex gap-2 align-items-center">
        <SelecionarButton
          type="button"
          label={t('blockdomi.colunasSelecAll')}
          variant="ghost"
          size="sm"
          className="p-0 text-muted"
          style={{ fontSize: '0.75rem' }}
          onClick={onSelectAll}
        />
        <LimparButton
          type="button"
          label={t('blockdomi.colunasSelecNone')}
          variant="ghost"
          size="sm"
          className="p-0 text-muted"
          style={{ fontSize: '0.75rem' }}
          onClick={onSelectNone}
        />
        <AplicarSelecaoButton
          type="button"
          className="py-0 px-2"
          style={{ fontSize: '0.75rem' }}
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
            className="rounded"
            style={{
              minWidth: 160,
              maxWidth: 260,
              flex: '1 1 160px',
              border: '1px solid',
              borderColor: selecionada ? 'var(--bs-primary)' : 'var(--border-color)',
              backgroundColor: 'var(--bg-primary)',
              overflow: 'hidden',
              transition: 'border-color 0.15s'
            }}
          >
            <label
              className="d-flex align-items-center gap-2 px-2 py-1"
              style={{
                cursor: 'pointer',
                backgroundColor: selecionada ? 'var(--bs-primary)' : 'var(--bg-tertiary)',
                color: selecionada ? '#fff' : 'var(--text-primary)',
                userSelect: 'none',
                transition: 'background-color 0.15s, color 0.15s',
                margin: 0
              }}
            >
              <input
                type="checkbox"
                className="form-check-input m-0 flex-shrink-0"
                style={{ width: '0.8rem', height: '0.8rem' }}
                checked={selecionada}
                onChange={() => onColunaToggle(header)}
              />
              <span className="small fw-semibold text-truncate flex-grow-1" title={header}>{header}</span>
              <span className="small flex-shrink-0" style={{ opacity: 0.8 }}>{items.length}</span>
            </label>
            <div
              style={{
                maxHeight: 120,
                overflowY: 'auto',
                padding: '4px 8px',
                fontFamily: 'monospace',
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                lineHeight: 1.6
              }}
            >
              {items.length === 0 ? (
                <span style={{ opacity: 0.5 }}>{t('blockdomi.none')}</span>
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
