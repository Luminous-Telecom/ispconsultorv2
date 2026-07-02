import React from 'react';
import { FormField, GerarButton } from 'components/ui';
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
      <FormField
        name="versaoAtual"
        type="text"
        size="sm"
        label={`${t('blockdomi.versao')} atual`}
        value={versaoAtual || '-'}
        readOnly
        disabled
      />
    </div>
    <div className="col-12">
      <div className="form-modal-input-col">
        <GerarButton variant="secondary" onClick={onGerarVersao} disabled={isGerandoVersao} isPending={isGerandoVersao} />
      </div>
    </div>
  </div>
);

export default ImportarListaBlockdomiVersaoHeader;
