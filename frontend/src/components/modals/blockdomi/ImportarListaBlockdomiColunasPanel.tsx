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
    <div className="row g-2 p-2">
      {Object.entries(colunasDisponiveis).map(([header, items]) => {
        const selecionada = colunasSeleccionadas.has(header);
        return (
          <div key={header} className="col-12">
            <TableFilterCheckbox
              id={`blockdomi-coluna-${header}`}
              name={`blockdomi-coluna-${header}`}
              label={`${header} (${items.length})`}
              checked={selecionada}
              onChange={(checked) => {
                if (checked !== selecionada) onColunaToggle(header);
              }}
            />
            {items.length > 0 && (
              <div className="form-modal-input-col small text-muted mt-1">
                {items.slice(0, 5).map((item, i) => (
                  <div key={i} className="text-truncate" title={item}>{item}</div>
                ))}
                {items.length > 5 && (
                  <div className="opacity-75">+{items.length - 5}</div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

export default ImportarListaBlockdomiColunasPanel;
