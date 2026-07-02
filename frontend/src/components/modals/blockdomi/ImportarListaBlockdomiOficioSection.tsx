import React, { type RefObject } from 'react';
import {
  DynamicProgressBar,
  ExtrairDominiosPdfButton,
  ExtrairPlanilhaUrlButton,
  ExtrairSeiAnatelButton,
  FormField,
  LabelWithHelp,
  Loading,
  IconOnlyButton,
  FileInput,
} from 'components/ui';
import type { BlockdomiImportTranslateFn } from './importarListaBlockdomiTypes';

interface ImportarListaBlockdomiOficioSectionProps {
  t: BlockdomiImportTranslateFn;
  numeroSeiAnatel: string;
  onNumeroSeiAnatelChange: (value: string) => void;
  nomeOficio: string;
  onNomeOficioChange: (value: string) => void;
  dataInicioBloqueio: string;
  onDataInicioBloqueioChange: (value: string) => void;
  dataFimBloqueio: string;
  onDataFimBloqueioChange: (value: string) => void;
  linkOficioAnatel: string;
  onLinkOficioAnatelChange: (value: string) => void;
  linkOficioJustica: string;
  onLinkOficioJusticaChange: (value: string) => void;
  linkPlanilhaDominios: string;
  onLinkPlanilhaDominiosChange: (value: string) => void;
  pdfAnatelInputRef: RefObject<HTMLInputElement | null>;
  pdfJusticaInputRef: RefObject<HTMLInputElement | null>;
  pdfFileInputRef: RefObject<HTMLInputElement | null>;
  pdfOficioAnatel: File | null;
  pdfOficioJustica: File | null;
  pdfFile: File | null;
  hasPdfUrl: boolean;
  isExtractingSei: boolean;
  isExtractingPdf: boolean;
  pdfExtractProgress: { current: number; total: number } | null;
  onExtractSeiAnatel: () => void;
  onExtractFromPdf: () => void;
  onExtractFromPdfUrl: () => void;
  onClearPdfAnatel: () => void;
  onClearPdfJustica: () => void;
  onClearPdfMain: () => void;
  onPdfAnatelFileChange: (file: File | null) => void;
  onPdfJusticaFileChange: (file: File | null) => void;
  onPdfMainFileChange: (file: File | null) => void;
}

const ImportarListaBlockdomiOficioSection: React.FC<ImportarListaBlockdomiOficioSectionProps> = ({
  t,
  numeroSeiAnatel,
  onNumeroSeiAnatelChange,
  nomeOficio,
  onNomeOficioChange,
  dataInicioBloqueio,
  onDataInicioBloqueioChange,
  dataFimBloqueio,
  onDataFimBloqueioChange,
  linkOficioAnatel,
  onLinkOficioAnatelChange,
  linkOficioJustica,
  onLinkOficioJusticaChange,
  linkPlanilhaDominios,
  onLinkPlanilhaDominiosChange,
  pdfAnatelInputRef,
  pdfJusticaInputRef,
  pdfFileInputRef,
  pdfOficioAnatel,
  pdfOficioJustica,
  pdfFile,
  hasPdfUrl,
  isExtractingSei,
  isExtractingPdf,
  pdfExtractProgress,
  onExtractSeiAnatel,
  onExtractFromPdf,
  onExtractFromPdfUrl,
  onClearPdfAnatel,
  onClearPdfJustica,
  onClearPdfMain,
  onPdfAnatelFileChange,
  onPdfJusticaFileChange,
  onPdfMainFileChange,
}) => (
  <div className="mb-2">
    <div className="row g-2 mb-2">
      <div className="col-12">
        <FormField
          id="ilb-numero-sei-anatel"
          name="numeroSeiAnatel"
          type="text"
          size="sm"
          label={t('blockdomi.numeroSeiAnatel')}
          helpText={t('blockdomi.seiAnatelHelp')}
          required
          placeholder="15497675"
          value={numeroSeiAnatel}
          onChange={(value) =>
            onNumeroSeiAnatelChange(String(value ?? '').replace(/\D/g, '').slice(0, 20))
          }
        />
      </div>
      <div className="col-12">
        <FormField
          id="ilb-nome-oficio"
          name="nomeOficio"
          type="text"
          size="sm"
          label={t('blockdomi.nomeOficio')}
          required
          placeholder={t('blockdomi.placeholderOficio')}
          value={nomeOficio}
          onChange={(value) => onNomeOficioChange(String(value ?? ''))}
        />
      </div>
      <div className="col-12">
        <FormField
          id="ilb-data-inicio-bloqueio"
          name="dataInicioBloqueio"
          type="date"
          size="sm"
          label={t('blockdomi.dataInicioBloqueio')}
          required
          value={dataInicioBloqueio}
          onChange={(value) => onDataInicioBloqueioChange(String(value ?? ''))}
        />
      </div>
      <div className="col-12">
        <FormField
          name="dataFimBloqueio"
          type="date"
          size="sm"
          label={t('blockdomi.dataFimBloqueioOptional')}
          value={dataFimBloqueio}
          onChange={(value) => onDataFimBloqueioChange(String(value ?? ''))}
        />
      </div>
    </div>

    <div className="pt-2 mt-2 border-top border-secondary pb-2 mb-2 border-bottom border-secondary">
      <div className="ilb-actions mb-2 form-modal-input-col">
        <ExtrairSeiAnatelButton
          type="button"
          onClick={onExtractSeiAnatel}
          disabled={isExtractingSei || !pdfOficioAnatel}
          isPending={isExtractingSei}
          title={t('blockdomi.seiAnatelHelp')}
        />
        <ExtrairDominiosPdfButton
          type="button"
          onClick={onExtractFromPdf}
          disabled={isExtractingPdf || !pdfFile}
          isPending={isExtractingPdf}
        />
        {hasPdfUrl && (
          <ExtrairPlanilhaUrlButton
            type="button"
            onClick={onExtractFromPdfUrl}
            disabled={isExtractingPdf}
            isPending={isExtractingPdf}
          />
        )}
        {isExtractingPdf && (
          <Loading variant="inline" size="sm" message={t('blockdomi.extractingPdf')} />
        )}
      </div>

      <div className="row g-2">
        <div className="col-12">
          <FormField
            name="linkOficioAnatel"
            type="text"
            size="sm"
            label={t('blockdomi.linkOficioAnatelOptional')}
            placeholder="https://... ou arquivo PDF"
            value={linkOficioAnatel}
            onChange={(value) => onLinkOficioAnatelChange(String(value ?? ''))}
          />
        </div>
        <div className="col-12">
          <div className="form-modal-input-col">
            <div className="ilb-pdf-file-cell">
              <FileInput
                ref={pdfAnatelInputRef}
                size="sm"
                className="ilb-pdf-file"
                accept=".pdf,application/pdf"
                onFileChange={onPdfAnatelFileChange}
              />
              <IconOnlyButton
                type="button"
                size="sm"
                variant="outline-danger"
                className="ilb-pdf-remove-btn"
                onClick={onClearPdfAnatel}
                disabled={!pdfOficioAnatel || isExtractingSei}
                title={t('blockdomi.removePdfFile')}
                label={t('blockdomi.removePdfFile')}
                iconClassName="bi bi-trash"
              />
            </div>
          </div>
        </div>

        <div className="col-12">
          <FormField
            name="linkOficioJustica"
            type="text"
            size="sm"
            label={t('blockdomi.linkOficioJusticaOptional')}
            helpText={t('blockdomi.separateLinksHelp')}
            placeholder="https://exemplo1.com, https://exemplo2.com ou arquivo PDF"
            value={linkOficioJustica}
            onChange={(value) => onLinkOficioJusticaChange(String(value ?? ''))}
          />
        </div>
        <div className="col-12">
          <div className="form-modal-input-col">
            <div className="ilb-pdf-file-cell">
              <FileInput
                ref={pdfJusticaInputRef}
                size="sm"
                className="ilb-pdf-file"
                accept=".pdf,application/pdf"
                onFileChange={onPdfJusticaFileChange}
              />
              <IconOnlyButton
                type="button"
                size="sm"
                variant="outline-danger"
                className="ilb-pdf-remove-btn"
                onClick={onClearPdfJustica}
                disabled={!pdfOficioJustica}
                title={t('blockdomi.removePdfFile')}
                label={t('blockdomi.removePdfFile')}
                iconClassName="bi bi-trash"
              />
            </div>
          </div>
        </div>

        <div className="col-12">
          <FormField
            name="linkPlanilhaDominios"
            type="text"
            size="sm"
            label={t('blockdomi.linkPlanilhaDominiosOptional')}
            placeholder="https://... ou arquivo PDF"
            value={linkPlanilhaDominios}
            onChange={(value) => onLinkPlanilhaDominiosChange(String(value ?? ''))}
          />
        </div>
        <div className="col-12">
          <div className="form-modal-input-col">
            <div className="ilb-pdf-file-cell">
              <FileInput
                ref={pdfFileInputRef}
                size="sm"
                className="ilb-pdf-file"
                accept=".pdf,application/pdf"
                onFileChange={onPdfMainFileChange}
              />
              <IconOnlyButton
                type="button"
                size="sm"
                variant="outline-danger"
                className="ilb-pdf-remove-btn"
                onClick={onClearPdfMain}
                disabled={!pdfFile || isExtractingPdf}
                title={t('blockdomi.removePdfFile')}
                label={t('blockdomi.removePdfFile')}
                iconClassName="bi bi-trash"
              />
            </div>
          </div>
        </div>
      </div>

      {hasPdfUrl && (
        <p className="text-muted form-hint small mt-1 mb-0 form-modal-input-col">
          {t('blockdomi.extractFromPlanilhaUrlHelp')}
        </p>
      )}
      {isExtractingPdf && (
        <div className="mt-2 form-modal-input-col">
          <div className="d-flex align-items-center justify-content-between mb-1">
            <span className="small text-muted">{t('blockdomi.extractingPdf')}</span>
            {pdfExtractProgress && pdfExtractProgress.total > 0 && (
              <span className="small text-muted">
                {t('blockdomi.pdfExtractPageProgress', {
                  current: pdfExtractProgress.current,
                  total: pdfExtractProgress.total
                })}
              </span>
            )}
          </div>
          <div className="progress progress-thin">
            <DynamicProgressBar
              percent={
                pdfExtractProgress && pdfExtractProgress.total > 0
                  ? Math.round((pdfExtractProgress.current / pdfExtractProgress.total) * 100)
                  : 0
              }
              className="progress-bar progress-bar-striped progress-bar-animated"
            />
          </div>
        </div>
      )}
    </div>
  </div>
);

export default ImportarListaBlockdomiOficioSection;
