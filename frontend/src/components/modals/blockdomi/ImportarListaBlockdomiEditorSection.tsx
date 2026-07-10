import React from 'react';
import { BulkActionButton, FormField, AtivoInativoField } from 'components/ui';
import type { BlockdomiImportTranslateFn } from './importarListaBlockdomiTypes';
import type { ClassifiedList } from './importarListaBlockdomiTypes';

interface ImportarListaBlockdomiEditorSectionProps {
  t: BlockdomiImportTranslateFn;
  rawText: string;
  domainCount: number;
  onRawTextChange: (value: string) => void;
  onPaste: () => void;
  onClear: () => void;
  onAnalisar: () => void;
  isAnalyzing: boolean;
  classified: ClassifiedList | null;
  listaModo: 'bloqueio' | 'desbloqueio';
  onListaModoChange: (modo: 'bloqueio' | 'desbloqueio') => void;
  onCadastrar: () => void;
  canCadastrar: boolean;
  isCadastrando: boolean;
}

const ImportarListaBlockdomiEditorSection: React.FC<ImportarListaBlockdomiEditorSectionProps> = ({
  t,
  rawText,
  domainCount,
  onRawTextChange,
  onPaste,
  onClear,
  onAnalisar,
  isAnalyzing,
  classified,
  listaModo,
  onListaModoChange,
  onCadastrar,
  canCadastrar,
  isCadastrando,
}) => (
  <>
    <div className="col-12">
      <FormField
        name="rawText"
        type="textarea"
        size="sm"
        label={t('blockdomi.inputListLabel')}
        helpText={
          domainCount > 0
            ? `${t('blockdomi.importIntro')} — ${domainCount} ${t('blockdomi.domainsDetected')}`
            : t('blockdomi.importIntro')
        }
        placeholder={t('blockdomi.pasteListHint')}
        value={rawText}
        onChange={(value) => onRawTextChange(String(value ?? ''))}
        rows={8}
      />
    </div>

    <div className="ilb-actions form-modal-input-col">
      <BulkActionButton
        type="button"
        label={t('blockdomi.paste')}
        variant="secondary"
        size="sm"
        onClick={onPaste}
      />
      <BulkActionButton
        type="button"
        label={t('buttons.clear')}
        variant="outline-secondary"
        size="sm"
        onClick={onClear}
        disabled={!rawText.trim()}
      />
      <BulkActionButton
        type="button"
        label={t('blockdomi.analyze')}
        variant="primary"
        size="sm"
        onClick={onAnalisar}
        disabled={!rawText.trim() || isAnalyzing}
        isPending={isAnalyzing}
      />
      {classified && (
        <BulkActionButton
          type="button"
          label={listaModo === 'desbloqueio' ? t('blockdomi.registerRemover') : t('blockdomi.register')}
          variant={listaModo === 'desbloqueio' ? 'danger' : 'primary'}
          size="sm"
          onClick={onCadastrar}
          disabled={!canCadastrar || isCadastrando}
          isPending={isCadastrando}
        />
      )}
    </div>

    {classified && (
      <div className="col-12">
        <AtivoInativoField
          name="listaModo"
          label={t('blockdomi.modoLista')}
          value={listaModo === 'bloqueio'}
          trueLabel={t('blockdomi.modoListaBloqueio')}
          falseLabel={t('blockdomi.modoListaDesbloqueio')}
          onChange={(isBloqueio) => onListaModoChange(isBloqueio ? 'bloqueio' : 'desbloqueio')}
        />
      </div>
    )}
  </>
);

export default ImportarListaBlockdomiEditorSection;
