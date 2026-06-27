import React from 'react';
import { GerarButton } from 'components/ui';
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
  <div className="row g-2 align-items-end mb-2">
    <div className="col-6 col-md-3 col-lg-2">
      <label className="form-label small mb-1">{t('blockdomi.versao')} atual</label>
      <input
        type="text"
        className="form-control form-control-sm"
        value={versaoAtual || '-'}
        readOnly
        aria-readonly
        tabIndex={-1}
      />
    </div>
    <div className="col-auto pb-1">
      <GerarButton variant="secondary" onClick={onGerarVersao} disabled={isGerandoVersao} isPending={isGerandoVersao} />
    </div>
  </div>
);

export default ImportarListaBlockdomiVersaoHeader;
