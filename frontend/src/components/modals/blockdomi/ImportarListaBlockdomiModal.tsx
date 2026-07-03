import React, { useRef } from 'react';
import DraggableModal from 'components/common/DraggableModal';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { useI18n } from 'contexts/I18nContext';
import { useLoading } from 'contexts/LoadingContext';
import type { ClassifiedList, ImportarListaBlockdomiModalProps } from './importarListaBlockdomiTypes';
import { useImportarListaBlockdomiState } from './useImportarListaBlockdomiState';
import { useImportarListaBlockdomiAnalyze } from './useImportarListaBlockdomiAnalyze';
import { useImportarListaBlockdomiPdfExtract } from './useImportarListaBlockdomiPdfExtract';
import { useImportarListaBlockdomiCadastrar } from './useImportarListaBlockdomiCadastrar';
import { useImportarListaBlockdomiVersao } from './useImportarListaBlockdomiVersao';
import { hasPlanilhaDominiosFonte } from './importarListaBlockdomiUtils';
import ImportarListaBlockdomiContent from './ImportarListaBlockdomiContent';

export {
  classifyLine,
  parseListItems,
  classifyLines,
  hasPlanilhaDominiosFonte,
} from './importarListaBlockdomiUtils';
export type { ClassifiedList } from './importarListaBlockdomiTypes';

const ImportarListaBlockdomiModal: React.FC<ImportarListaBlockdomiModalProps> = ({
  show,
  onClose,
  onSuccess,
  skipWrapper = false,
  pdfUrlToExtract,
}) => {
  const { t } = useI18n();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const { setExtractionLoading } = useLoading();

  const setClassifiedRef = useRef<(value: ClassifiedList | null) => void>(() => {});

  const state = useImportarListaBlockdomiState({
    show,
    pdfUrlToExtract,
    setClassifiedRef,
    showApiError,
    success,
    t,
  });

  const analyze = useImportarListaBlockdomiAnalyze({
    rawText: state.rawText,
    showApiError,
  });

  setClassifiedRef.current = analyze.setClassified;

  const pdf = useImportarListaBlockdomiPdfExtract({
    show,
    pdfFile: state.pdfFile,
    pdfOficioAnatel: state.pdfOficioAnatel,
    pdfOficioJustica: state.pdfOficioJustica,
    linkPlanilhaDominios: state.linkPlanilhaDominios,
    pdfUrlToExtract,
    pdfAnatelInputRef: state.pdfAnatelInputRef,
    pdfJusticaInputRef: state.pdfJusticaInputRef,
    pdfFileInputRef: state.pdfFileInputRef,
    pendingPdfFilesRef: state.pendingPdfFilesRef,
    setClassifiedRef,
    setPdfOficioAnatel: state.setPdfOficioAnatel,
    setPdfOficioJustica: state.setPdfOficioJustica,
    setPdfFile: state.setPdfFile,
    setLinkPlanilhaDominios: state.setLinkPlanilhaDominios,
    setColunasDisponiveis: state.setColunasDisponiveis,
    setColunasSeleccionadas: state.setColunasSeleccionadas,
    setRawText: state.setRawText,
    setNumeroSeiAnatel: state.setNumeroSeiAnatel,
    showApiError,
    success,
    t,
    setExtractionLoading,
  });

  const cadastrar = useImportarListaBlockdomiCadastrar({
    classified: analyze.classified,
    totalValid: analyze.totalValid,
    listaModo: state.listaModo,
    nomeOficio: state.nomeOficio,
    dataInicioBloqueio: state.dataInicioBloqueio,
    dataFimBloqueio: state.dataFimBloqueio,
    linkOficioAnatel: state.linkOficioAnatel,
    linkOficioJustica: state.linkOficioJustica,
    linkPlanilhaDominios: state.linkPlanilhaDominios,
    numeroSeiAnatel: state.numeroSeiAnatel,
    pdfOficioAnatel: state.pdfOficioAnatel,
    pdfOficioJustica: state.pdfOficioJustica,
    pdfFile: state.pdfFile,
    pendingPdfFilesRef: state.pendingPdfFilesRef,
    resetFormAfterCadastro: state.resetFormAfterCadastro,
    onClearPdfExtractProgress: pdf.clearPdfExtractProgress,
    onSuccess,
    showApiError,
    success,
    t,
  });

  const versao = useImportarListaBlockdomiVersao({ show, showApiError, success, t });

  const hasPlanilhaDominios = hasPlanilhaDominiosFonte(
    state.linkPlanilhaDominios,
    state.pdfFile,
    state.pendingPdfFilesRef.current.main
  );

  const canCadastrar =
    !!analyze.classified &&
    analyze.totalValid > 0 &&
    (state.listaModo === 'desbloqueio' ||
      Boolean(
        state.numeroSeiAnatel.trim() &&
          state.nomeOficio.trim() &&
          state.dataInicioBloqueio.trim() &&
          hasPlanilhaDominios
      ));

  const content = (
    <ImportarListaBlockdomiContent
      t={t}
      versaoAtual={versao.versaoAtual}
      isGerandoVersao={versao.isGerandoVersao}
      onGerarVersao={versao.handleGerarVersao}
      numeroSeiAnatel={state.numeroSeiAnatel}
      onNumeroSeiAnatelChange={state.setNumeroSeiAnatel}
      nomeOficio={state.nomeOficio}
      onNomeOficioChange={state.setNomeOficio}
      dataInicioBloqueio={state.dataInicioBloqueio}
      onDataInicioBloqueioChange={state.setDataInicioBloqueio}
      dataFimBloqueio={state.dataFimBloqueio}
      onDataFimBloqueioChange={state.setDataFimBloqueio}
      linkOficioAnatel={state.linkOficioAnatel}
      onLinkOficioAnatelChange={state.setLinkOficioAnatel}
      linkOficioJustica={state.linkOficioJustica}
      onLinkOficioJusticaChange={state.setLinkOficioJustica}
      linkPlanilhaDominios={state.linkPlanilhaDominios}
      onLinkPlanilhaDominiosChange={state.setLinkPlanilhaDominios}
      pdfAnatelInputRef={state.pdfAnatelInputRef}
      pdfJusticaInputRef={state.pdfJusticaInputRef}
      pdfFileInputRef={state.pdfFileInputRef}
      pdfOficioAnatel={state.pdfOficioAnatel}
      pdfOficioJustica={state.pdfOficioJustica}
      pdfFile={state.pdfFile}
      hasPdfUrl={state.hasPdfUrl}
      isExtractingSei={pdf.isExtractingSei}
      isExtractingPdf={pdf.isExtractingPdf}
      pdfExtractProgress={pdf.pdfExtractProgress}
      onExtractSeiAnatel={pdf.handleExtractSeiAnatel}
      onExtractFromPdf={pdf.handleExtractFromPdf}
      onExtractFromPdfUrl={pdf.handleExtractFromPdfUrl}
      onClearPdfAnatel={pdf.clearPdfAnatel}
      onClearPdfJustica={pdf.clearPdfJustica}
      onClearPdfMain={pdf.clearPdfMain}
      onPdfAnatelFileChange={pdf.handlePdfAnatelFileChange}
      onPdfJusticaFileChange={pdf.handlePdfJusticaFileChange}
      onPdfMainFileChange={pdf.handlePdfMainFileChange}
      colunasDisponiveis={state.colunasDisponiveis}
      colunasSeleccionadas={state.colunasSeleccionadas}
      onColunaToggle={state.handleColunaToggle}
      onColunasSelectAll={state.handleColunasSelectAll}
      onColunasSelectNone={state.handleColunasSelectNone}
      onColunasAplicar={state.handleColunasAplicar}
      rawText={state.rawText}
      domainCount={state.domainCount}
      onRawTextChange={state.handleRawTextChange}
      onPaste={state.handlePaste}
      onClear={state.handleClear}
      onAnalisar={analyze.handleAnalisar}
      isAnalyzing={analyze.isAnalyzing}
      classified={analyze.classified}
      listaModo={state.listaModo}
      onListaModoChange={state.setListaModo}
      onCadastrar={cadastrar.handleCadastrar}
      canCadastrar={canCadastrar}
      isCadastrando={cadastrar.isCadastrando}
      showFiltrosExtract={state.showFiltrosExtract}
      dominiosBruto={state.dominiosBruto}
      dominiosFiltrados={state.dominiosFiltrados}
      dominiosValidos={state.dominiosValidos}
      onCopied={state.handleCopySucceeded}
      onCopyFailed={state.handleCopyFailed}
    />
  );

  if (skipWrapper) {
    return <>{content}</>;
  }

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={t('blockdomi.titleImport')}
      size="xl"
    >
      {content}
    </DraggableModal>
  );
};

export default ImportarListaBlockdomiModal;
