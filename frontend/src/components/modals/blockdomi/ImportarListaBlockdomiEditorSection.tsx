import React from 'react';
import { BulkActionButton, LimparButton } from 'components/ui';
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
  totalValid: number;
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
  totalValid,
  isCadastrando,
}) => (
  <>
    <div className={`ilb-editor-wrapper mb-3 ${rawText.trim() ? 'has-content' : ''}`}>
      <div className="ilb-editor-header">
        <span>
          {t('blockdomi.inputListLabel')}
          <i
            className="bi bi-info-circle text-muted ms-1"
            style={{ cursor: 'help', fontSize: '0.85rem' }}
            title={t('blockdomi.importIntro')}
          />
        </span>
        {domainCount > 0 && (
          <span className="ilb-editor-counter">
            {domainCount} {t('blockdomi.domainsDetected')}
          </span>
        )}
      </div>
      <div className="position-relative">
        <textarea
          className="ilb-editor-textarea"
          placeholder="meusite.com&#10;10.0.0.1&#10;2001:db8::1&#10;https://outro.dominio.com/caminho"
          value={rawText}
          onChange={(e) => onRawTextChange(e.target.value)}
        />
        {!rawText.trim() && (
          <div className="ilb-editor-empty-state">
            <i className="bi bi-clipboard2-plus ilb-empty-icon d-block mb-2"></i>
            {t('blockdomi.pasteListHint')}
          </div>
        )}
      </div>
    </div>

    <div className="ilb-actions">
      <BulkActionButton
        type="button"
        label={t('blockdomi.paste')}
        variant="secondary"
        onClick={onPaste}
      />
      <LimparButton
        type="button"
        onClick={onClear}
        disabled={!rawText.trim()}
      />
      <BulkActionButton
        type="button"
        label={t('blockdomi.analyze')}
        variant="primary"
        onClick={onAnalisar}
        disabled={!rawText.trim() || isAnalyzing}
        isPending={isAnalyzing}
      />
      {classified && (
        <>
          <div className="btn-group btn-group-sm" role="group" aria-label={t('blockdomi.modoListaBloqueio')}>
            <BulkActionButton
              type="button"
              label={t('blockdomi.modoListaBloqueio')}
              variant={listaModo === 'bloqueio' ? 'primary' : 'secondary'}
              className={listaModo === 'bloqueio' ? '' : 'btn-outline-primary'}
              onClick={() => onListaModoChange('bloqueio')}
            />
            <BulkActionButton
              type="button"
              label={t('blockdomi.modoListaDesbloqueio')}
              variant={listaModo === 'desbloqueio' ? 'danger' : 'secondary'}
              className={listaModo === 'desbloqueio' ? '' : 'btn-outline-danger'}
              onClick={() => onListaModoChange('desbloqueio')}
            />
          </div>
          <BulkActionButton
            type="button"
            label={listaModo === 'desbloqueio' ? t('blockdomi.registerRemover') : t('blockdomi.register')}
            variant={listaModo === 'desbloqueio' ? 'danger' : 'primary'}
            onClick={onCadastrar}
            disabled={totalValid === 0 || isCadastrando}
            isPending={isCadastrando}
          />
        </>
      )}
    </div>
  </>
);

export default ImportarListaBlockdomiEditorSection;
