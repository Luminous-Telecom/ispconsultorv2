import { useState, useCallback, useEffect, useRef, type MutableRefObject, type RefObject } from 'react';
import PdfExtractService, { type PdfExtractPollProgress } from 'services/pdfExtract';
import { BlockdomiService } from 'services/blockdomiService';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import type { BlockdomiImportTranslateFn } from './importarListaBlockdomiTypes';
import type { ClassifiedList } from './importarListaBlockdomiTypes';
import type { PendingPdfFiles } from './importarListaBlockdomiTypes';
import { buildTextFromColunas } from './importarListaBlockdomiUtils';

interface UseImportarListaBlockdomiPdfExtractParams {
  show: boolean;
  pdfFile: File | null;
  pdfOficioAnatel: File | null;
  pdfOficioJustica: File | null;
  linkPlanilhaDominios: string;
  pdfUrlToExtract?: string;
  dataInicioBloqueio: string;
  dataFimBloqueio: string;
  pdfAnatelInputRef: RefObject<HTMLInputElement | null>;
  pdfJusticaInputRef: RefObject<HTMLInputElement | null>;
  pdfFileInputRef: RefObject<HTMLInputElement | null>;
  pendingPdfFilesRef: MutableRefObject<PendingPdfFiles>;
  setClassifiedRef: MutableRefObject<(value: ClassifiedList | null) => void>;
  setPdfOficioAnatel: (file: File | null) => void;
  setPdfOficioJustica: (file: File | null) => void;
  setPdfFile: (file: File | null) => void;
  setDataInicioBloqueio: (value: string) => void;
  setDataFimBloqueio: (value: string) => void;
  setLinkPlanilhaDominios: (value: string) => void;
  setColunasDisponiveis: (value: Record<string, string[]> | null) => void;
  setColunasSeleccionadas: (value: Set<string>) => void;
  setRawText: (value: string) => void;
  setNumeroSeiAnatel: (value: string) => void;
  showApiError: (error: unknown, fallback?: string) => void;
  success: (message: string) => void;
  t: BlockdomiImportTranslateFn;
  setExtractionLoading: (loading: boolean) => void;
}

export function useImportarListaBlockdomiPdfExtract({
  show,
  pdfFile,
  pdfOficioAnatel,
  pdfOficioJustica,
  linkPlanilhaDominios,
  pdfUrlToExtract,
  dataInicioBloqueio,
  dataFimBloqueio,
  pdfAnatelInputRef,
  pdfJusticaInputRef,
  pdfFileInputRef,
  pendingPdfFilesRef,
  setClassifiedRef,
  setPdfOficioAnatel,
  setPdfOficioJustica,
  setPdfFile,
  setDataInicioBloqueio,
  setDataFimBloqueio,
  setLinkPlanilhaDominios,
  setColunasDisponiveis,
  setColunasSeleccionadas,
  setRawText,
  setNumeroSeiAnatel,
  showApiError,
  success,
  t,
  setExtractionLoading,
}: UseImportarListaBlockdomiPdfExtractParams) {
  const [isExtractingSei, setIsExtractingSei] = useState(false);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [pdfExtractProgress, setPdfExtractProgress] = useState<{ current: number; total: number } | null>(null);
  const prevShowRef = useRef(false);

  useEffect(() => {
    if (show && !prevShowRef.current) {
      setPdfExtractProgress(null);
    }
    prevShowRef.current = !!show;
  }, [show]);

  const clearPdfExtractProgress = useCallback(() => {
    setPdfExtractProgress(null);
  }, []);

  const handlePdfPollProgress = useCallback((p: PdfExtractPollProgress) => {
    if (p.status === 'processing' && p.progress) {
      setPdfExtractProgress(p.progress);
    }
  }, []);

  const handleExtractSeiAnatel = useCallback(async () => {
    const file = pdfOficioAnatel;
    if (!file) {
      showApiError(t('blockdomi.seiExtractNoPdf'));
      return;
    }
    setIsExtractingSei(true);
    try {
      const { sei } = await BlockdomiService.extractSeiAnatelFromPdf(file);
      setNumeroSeiAnatel(sei);
      success(t('blockdomi.seiExtractSuccess'));
    } catch (e) {
      showApiError(e, CONTEXT_ERROR_MESSAGES.BLOCKDOMI_SEI_EXTRACT_ERROR);
    } finally {
      setIsExtractingSei(false);
    }
  }, [pdfOficioAnatel, showApiError, success, t, setNumeroSeiAnatel]);

  const clearPdfAnatel = useCallback(() => {
    setPdfOficioAnatel(null);
    pendingPdfFilesRef.current = { ...pendingPdfFilesRef.current, anatel: null };
    if (pdfAnatelInputRef.current) pdfAnatelInputRef.current.value = '';
  }, [pendingPdfFilesRef, pdfAnatelInputRef, setPdfOficioAnatel]);

  const clearPdfJustica = useCallback(() => {
    setPdfOficioJustica(null);
    pendingPdfFilesRef.current = { ...pendingPdfFilesRef.current, justica: null };
    if (pdfJusticaInputRef.current) pdfJusticaInputRef.current.value = '';
  }, [pendingPdfFilesRef, pdfJusticaInputRef, setPdfOficioJustica]);

  const clearPdfMain = useCallback(() => {
    setPdfFile(null);
    pendingPdfFilesRef.current = { ...pendingPdfFilesRef.current, main: null };
    if (pdfFileInputRef.current) pdfFileInputRef.current.value = '';
  }, [pendingPdfFilesRef, pdfFileInputRef, setPdfFile]);

  const handleExtractFromPdf = useCallback(async () => {
    if (!pdfFile) {
      showApiError(t('blockdomi.importFromPdfIntro'));
      return;
    }

    const filesToUpload = { main: pdfFile, anatel: pdfOficioAnatel, justica: pdfOficioJustica };

    setIsExtractingPdf(true);
    setPdfExtractProgress(null);
    setExtractionLoading(true);
    await new Promise((r) => setTimeout(r, 0));

    try {
      const result = await PdfExtractService.extractFromPdf(pdfFile, {
        onPollProgress: handlePdfPollProgress
      });

      if (result.success && result.data) {
        const listBruto = result.data.dominios_bruto ?? result.data.dominios;
        const dataInicio = result.data.data_inicio_bloqueio ?? dataInicioBloqueio;
        const dataFim = result.data.data_fim_bloqueio ?? dataFimBloqueio;
        if (dataInicio) setDataInicioBloqueio(dataInicio);
        if (dataFim) setDataFimBloqueio(dataFim);
        const colunas = result.data.colunas ?? null;
        if (colunas && Object.keys(colunas).length > 0) {
          const todas = new Set(Object.keys(colunas));
          setColunasDisponiveis(colunas);
          setColunasSeleccionadas(todas);
          setRawText(buildTextFromColunas(colunas, todas));
        } else {
          setColunasDisponiveis(null);
          setColunasSeleccionadas(new Set());
          setRawText(listBruto.join('\n'));
        }
        setClassifiedRef.current(null);
        pendingPdfFilesRef.current = {
          main: filesToUpload.main,
          anatel: filesToUpload.anatel ?? null,
          justica: filesToUpload.justica ?? null
        };
        success(t('blockdomi.pdfExtractSuccess'));
      } else {
        showApiError(t('blockdomi.pdfExtractError'));
      }
    } catch (e) {
      const msg = (e as Error)?.message ?? 'Erro ao extrair PDF.';
      showApiError(msg);
    } finally {
      setIsExtractingPdf(false);
      setExtractionLoading(false);
      setPdfExtractProgress(null);
    }
  }, [
    pdfFile,
    pdfOficioAnatel,
    pdfOficioJustica,
    success,
    showApiError,
    t,
    setExtractionLoading,
    dataInicioBloqueio,
    dataFimBloqueio,
    handlePdfPollProgress,
    setClassifiedRef,
    pendingPdfFilesRef,
    setDataInicioBloqueio,
    setDataFimBloqueio,
    setColunasDisponiveis,
    setColunasSeleccionadas,
    setRawText,
  ]);

  const handleExtractFromPdfUrl = useCallback(async () => {
    const urlResolved = (linkPlanilhaDominios.trim() || pdfUrlToExtract?.trim() || '').trim();
    if (!urlResolved) {
      showApiError(t('blockdomi.pdfUrlOrLinkRequired'));
      return;
    }
    setIsExtractingPdf(true);
    setPdfExtractProgress(null);
    setExtractionLoading(true);
    await new Promise((r) => setTimeout(r, 0));
    try {
      const result = await PdfExtractService.extractFromPdfUrl(urlResolved, {
        onPollProgress: handlePdfPollProgress
      });
      if (result.success && result.data) {
        setLinkPlanilhaDominios(urlResolved);
        const listBruto = result.data.dominios_bruto ?? result.data.dominios;
        const dataInicio = result.data.data_inicio_bloqueio ?? dataInicioBloqueio;
        const dataFim = result.data.data_fim_bloqueio ?? dataFimBloqueio;
        if (dataInicio) setDataInicioBloqueio(dataInicio);
        if (dataFim) setDataFimBloqueio(dataFim);
        const colunas = result.data.colunas ?? null;
        if (colunas && Object.keys(colunas).length > 0) {
          const todas = new Set(Object.keys(colunas));
          setColunasDisponiveis(colunas);
          setColunasSeleccionadas(todas);
          setRawText(buildTextFromColunas(colunas, todas));
        } else {
          setColunasDisponiveis(null);
          setColunasSeleccionadas(new Set());
          setRawText(listBruto.join('\n'));
        }
        setClassifiedRef.current(null);
        pendingPdfFilesRef.current = { ...pendingPdfFilesRef.current, main: null };
        success(t('blockdomi.pdfExtractSuccess'));
      } else {
        showApiError(t('blockdomi.pdfExtractError'));
      }
    } catch (e) {
      showApiError(e, CONTEXT_ERROR_MESSAGES.BLOCKDOMI_PDF_EXTRACT_ERROR);
    } finally {
      setIsExtractingPdf(false);
      setExtractionLoading(false);
      setPdfExtractProgress(null);
    }
  }, [
    linkPlanilhaDominios,
    pdfUrlToExtract,
    success,
    showApiError,
    t,
    setExtractionLoading,
    dataInicioBloqueio,
    dataFimBloqueio,
    handlePdfPollProgress,
    setClassifiedRef,
    pendingPdfFilesRef,
    setLinkPlanilhaDominios,
    setDataInicioBloqueio,
    setDataFimBloqueio,
    setColunasDisponiveis,
    setColunasSeleccionadas,
    setRawText,
  ]);

  const handlePdfAnatelFileChange = useCallback(
    (file: File | null) => {
      setPdfOficioAnatel(file);
      pendingPdfFilesRef.current = { ...pendingPdfFilesRef.current, anatel: null };
    },
    [pendingPdfFilesRef, setPdfOficioAnatel]
  );

  const handlePdfJusticaFileChange = useCallback(
    (file: File | null) => {
      setPdfOficioJustica(file);
      pendingPdfFilesRef.current = { ...pendingPdfFilesRef.current, justica: null };
    },
    [pendingPdfFilesRef, setPdfOficioJustica]
  );

  const handlePdfMainFileChange = useCallback(
    (file: File | null) => {
      setPdfFile(file);
      pendingPdfFilesRef.current = { ...pendingPdfFilesRef.current, main: null };
    },
    [pendingPdfFilesRef, setPdfFile]
  );

  return {
    isExtractingSei,
    isExtractingPdf,
    pdfExtractProgress,
    clearPdfExtractProgress,
    handleExtractSeiAnatel,
    handleExtractFromPdf,
    handleExtractFromPdfUrl,
    clearPdfAnatel,
    clearPdfJustica,
    clearPdfMain,
    handlePdfAnatelFileChange,
    handlePdfJusticaFileChange,
    handlePdfMainFileChange,
  };
}
