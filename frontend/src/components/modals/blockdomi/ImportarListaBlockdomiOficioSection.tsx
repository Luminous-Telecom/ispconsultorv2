import React, { type RefObject } from 'react';
import {
  ExtrairDominiosPdfButton,
  ExtrairPlanilhaUrlButton,
  ExtrairSeiAnatelButton,
} from 'components/ui';
import Button from 'components/ui/Button';
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
  <div className="row g-3 mb-3">
    <div className="col-12">
      <div className="row g-2 mb-2 w-100 align-items-end">
        <div className="col-12 col-lg-3 col-md-4">
          <label className="form-label small mb-1 d-flex align-items-center gap-1">
            {t('blockdomi.numeroSeiAnatelOptional')}
            <i
              className="bi bi-info-circle text-muted"
              style={{ cursor: 'help', fontSize: '0.85rem' }}
              title={t('blockdomi.seiAnatelHelp')}
            />
          </label>
          <input
            type="text"
            className="form-control form-control-sm"
            inputMode="numeric"
            autoComplete="off"
            placeholder="15497675"
            value={numeroSeiAnatel}
            onChange={(e) => onNumeroSeiAnatelChange(e.target.value.replace(/\D/g, '').slice(0, 20))}
          />
        </div>
        <div className="col-12 col-lg-5 col-md-8">
          <label className="form-label small mb-1">{t('blockdomi.nomeOficioOptional')}</label>
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder={t('blockdomi.placeholderOficio')}
            value={nomeOficio}
            onChange={(e) => onNomeOficioChange(e.target.value)}
          />
        </div>
        <div className="col-6 col-lg-2 col-md-6">
          <label className="form-label small mb-1">{t('blockdomi.dataInicioBloqueio')}</label>
          <input
            type="date"
            className="form-control form-control-sm"
            value={dataInicioBloqueio}
            onChange={(e) => onDataInicioBloqueioChange(e.target.value)}
          />
        </div>
        <div className="col-6 col-lg-2 col-md-6">
          <label className="form-label small mb-1">{t('blockdomi.dataFimBloqueioOptional')}</label>
          <input
            type="date"
            className="form-control form-control-sm"
            value={dataFimBloqueio}
            onChange={(e) => onDataFimBloqueioChange(e.target.value)}
          />
        </div>
      </div>
      <div className="pt-3 mt-3 border-top border-secondary pb-3 mb-3 border-bottom border-secondary">
        <div className="ilb-actions mb-2">
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
            <span className="d-inline-flex align-items-center gap-1 small text-muted">
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
              <span className="text-nowrap">{t('blockdomi.extractingPdf')}</span>
            </span>
          )}
        </div>
        <label className="form-label small mb-1 mt-2">{t('blockdomi.linkOficioAnatelOptional')}</label>
        <div className="ilb-pdf-field-group">
          <div className="ilb-pdf-url-file-row">
            <input
              type="text"
              className="form-control form-control-sm ilb-pdf-url"
              placeholder="https://... ou arquivo PDF"
              value={linkOficioAnatel}
              onChange={(e) => onLinkOficioAnatelChange(e.target.value)}
            />
            <div className="ilb-pdf-file-cell">
              <input
                ref={pdfAnatelInputRef}
                type="file"
                className="form-control form-control-sm ilb-pdf-file"
                accept=".pdf,application/pdf"
                onChange={(e) => onPdfAnatelFileChange(e.target.files?.[0] ?? null)}
              />
              <Button
                type="button"
                size="sm"
                variant="outline-danger"
                className="ilb-pdf-remove-btn"
                onClick={onClearPdfAnatel}
                disabled={!pdfOficioAnatel || isExtractingSei}
                title={t('blockdomi.removePdfFile')}
                aria-label={t('blockdomi.removePdfFile')}
              >
                <i className="bi bi-trash" aria-hidden />
              </Button>
            </div>
          </div>
        </div>
        <label className="form-label small mb-1 mt-2">
          {t('blockdomi.linkOficioJusticaOptional')}
          <i
            className="bi bi-info-circle text-muted ms-1"
            style={{ cursor: 'help', fontSize: '0.85rem' }}
            title={t('blockdomi.separateLinksHelp')}
          />
        </label>
        <div className="ilb-pdf-field-group">
          <div className="ilb-pdf-url-file-row">
            <input
              type="text"
              className="form-control form-control-sm ilb-pdf-url"
              placeholder="https://exemplo1.com, https://exemplo2.com ou arquivo PDF"
              value={linkOficioJustica}
              onChange={(e) => onLinkOficioJusticaChange(e.target.value)}
            />
            <div className="ilb-pdf-file-cell">
              <input
                ref={pdfJusticaInputRef}
                type="file"
                className="form-control form-control-sm ilb-pdf-file"
                accept=".pdf,application/pdf"
                onChange={(e) => onPdfJusticaFileChange(e.target.files?.[0] ?? null)}
              />
              <Button
                type="button"
                size="sm"
                variant="outline-danger"
                className="ilb-pdf-remove-btn"
                onClick={onClearPdfJustica}
                disabled={!pdfOficioJustica}
                title={t('blockdomi.removePdfFile')}
                aria-label={t('blockdomi.removePdfFile')}
              >
                <i className="bi bi-trash" aria-hidden />
              </Button>
            </div>
          </div>
        </div>
        <label className="form-label small mb-1 mt-2">{t('blockdomi.linkPlanilhaDominiosOptional')}</label>
        <div className="ilb-pdf-field-group">
          <div className="ilb-pdf-url-file-row">
            <input
              type="text"
              className="form-control form-control-sm ilb-pdf-url"
              placeholder="https://... ou arquivo PDF"
              value={linkPlanilhaDominios}
              onChange={(e) => onLinkPlanilhaDominiosChange(e.target.value)}
            />
            <div className="ilb-pdf-file-cell">
              <input
                ref={pdfFileInputRef}
                type="file"
                className="form-control form-control-sm ilb-pdf-file"
                accept=".pdf,application/pdf"
                onChange={(e) => onPdfMainFileChange(e.target.files?.[0] ?? null)}
              />
              <Button
                type="button"
                size="sm"
                variant="outline-danger"
                className="ilb-pdf-remove-btn"
                onClick={onClearPdfMain}
                disabled={!pdfFile || isExtractingPdf}
                title={t('blockdomi.removePdfFile')}
                aria-label={t('blockdomi.removePdfFile')}
              >
                <i className="bi bi-trash" aria-hidden />
              </Button>
            </div>
          </div>
        </div>
        {hasPdfUrl && (
          <p className="text-muted form-hint small mt-1 mb-0">{t('blockdomi.extractFromPlanilhaUrlHelp')}</p>
        )}
        {isExtractingPdf && (
          <div className="mt-2">
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
            <div className="progress" style={{ height: 4 }}>
              <div
                className="progress-bar progress-bar-striped progress-bar-animated"
                style={{
                  width:
                    pdfExtractProgress && pdfExtractProgress.total > 0
                      ? `${Math.round((pdfExtractProgress.current / pdfExtractProgress.total) * 100)}%`
                      : '0%'
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);

export default ImportarListaBlockdomiOficioSection;
