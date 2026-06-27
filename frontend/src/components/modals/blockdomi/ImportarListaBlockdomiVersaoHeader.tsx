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
  <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
    <span className="text-muted small me-2">
      {t('blockdomi.versao')} atual: <strong>{versaoAtual || '-'}</strong>
    </span>
    <GerarButton variant="secondary" onClick={onGerarVersao} disabled={isGerandoVersao} isPending={isGerandoVersao} />
  </div>
);

export default ImportarListaBlockdomiVersaoHeader;
