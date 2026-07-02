import React from 'react';
import { GerarButton, LabelWithHelp } from 'components/ui';
import type { BlockdomiImportTranslateFn } from './importarListaBlockdomiTypes';

interface ImportarListaBlockdomiVersaoHeaderProps {
  versaoAtual: string;
  isGerandoVersao: boolean;
  onGerarVersao: () => void;
  t: BlockdomiImportTranslateFn;
}

const ImportarListaBlockdomiVersaoHeader: React.FC<ImportarListaBlockdomiVersaoHeaderProps> = ({
  versaoAtual,
  isGerandoVersao,
  onGerarVersao,
  t,
}) => (
  <div className="row g-2 mb-2">
    <div className="col-12">
      <div className="form-field">
        <LabelWithHelp htmlFor="ilb-versao-atual" className="form-label">
          {t('blockdomi.versao')}
        </LabelWithHelp>
        <div className="form-field-control">
          <div className="input-group input-group-sm ilb-versao-atual-group">
            <input
              id="ilb-versao-atual"
              name="versaoAtual"
              type="text"
              className="form-control text-center ilb-versao-numero-field"
              value={versaoAtual || '-'}
              readOnly
              tabIndex={-1}
              aria-readonly="true"
            />
            <GerarButton
              type="button"
              variant="secondary"
              onClick={onGerarVersao}
              disabled={isGerandoVersao}
              isPending={isGerandoVersao}
            />
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default ImportarListaBlockdomiVersaoHeader;
