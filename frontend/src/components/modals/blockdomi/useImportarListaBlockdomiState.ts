import { useState, useCallback, useMemo, useEffect, useRef, type MutableRefObject } from 'react';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import type { ClassifiedList } from './importarListaBlockdomiTypes';
import type { BlockdomiImportTranslateFn, PendingPdfFiles } from './importarListaBlockdomiTypes';
import {
  buildTextFromColunas,
  classifyLine,
  classifyLines,
  emptyPendingPdfFiles,
  parseListItems,
} from './importarListaBlockdomiUtils';
import { useCopyToClipboard } from 'hooks/useCopyToClipboard';

interface UseImportarListaBlockdomiStateParams {
  show: boolean;
  pdfUrlToExtract?: string;
  setClassifiedRef: MutableRefObject<(value: ClassifiedList | null) => void>;
  showApiError: (error: unknown, fallback?: string) => void;
  success: (message: string) => void;
  t: BlockdomiImportTranslateFn;
}

export function useImportarListaBlockdomiState({
  show,
  pdfUrlToExtract,
  setClassifiedRef,
  showApiError,
  success,
  t,
}: UseImportarListaBlockdomiStateParams) {
  const { readText } = useCopyToClipboard();
  const [rawText, setRawText] = useState('');
  const [nomeOficio, setNomeOficio] = useState('');
  const [dataInicioBloqueio, setDataInicioBloqueio] = useState('');
  const [dataFimBloqueio, setDataFimBloqueio] = useState('');
  const [linkOficioAnatel, setLinkOficioAnatel] = useState('');
  const [linkOficioJustica, setLinkOficioJustica] = useState('');
  const [linkPlanilhaDominios, setLinkPlanilhaDominios] = useState('');
  const [numeroSeiAnatel, setNumeroSeiAnatel] = useState('');
  const [listaModo, setListaModo] = useState<'bloqueio' | 'desbloqueio'>('bloqueio');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfOficioAnatel, setPdfOficioAnatel] = useState<File | null>(null);
  const [pdfOficioJustica, setPdfOficioJustica] = useState<File | null>(null);
  const [colunasDisponiveis, setColunasDisponiveis] = useState<Record<string, string[]> | null>(null);
  const [colunasSeleccionadas, setColunasSeleccionadas] = useState<Set<string>>(new Set());

  const pdfAnatelInputRef = useRef<HTMLInputElement>(null);
  const pdfJusticaInputRef = useRef<HTMLInputElement>(null);
  const pdfFileInputRef = useRef<HTMLInputElement>(null);
  const pendingPdfFilesRef = useRef<PendingPdfFiles>(emptyPendingPdfFiles());
  const prevShowRef = useRef(false);

  useEffect(() => {
    if (show && !prevShowRef.current) {
      setRawText('');
      setClassifiedRef.current(null);
      setPdfFile(null);
      setPdfOficioAnatel(null);
      setPdfOficioJustica(null);
      [pdfFileInputRef, pdfAnatelInputRef, pdfJusticaInputRef].forEach((ref) => {
        if (ref.current) ref.current.value = '';
      });
      setColunasDisponiveis(null);
      setColunasSeleccionadas(new Set());
      pendingPdfFilesRef.current = emptyPendingPdfFiles();
      setListaModo('bloqueio');
      setNumeroSeiAnatel('');
      setDataInicioBloqueio((prev) => {
        if (prev === '') {
          const today = new Date();
          return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        }
        return prev;
      });
      if (pdfUrlToExtract?.trim()) {
        setLinkPlanilhaDominios((prev) => (prev === '' ? pdfUrlToExtract.trim() : prev));
      }
    }
    prevShowRef.current = !!show;
  }, [show, pdfUrlToExtract, setClassifiedRef]);

  const hasPdfUrl = Boolean(linkPlanilhaDominios.trim() || pdfUrlToExtract?.trim());

  const domainCount = useMemo(() => {
    return parseListItems(rawText).length;
  }, [rawText]);

  const dominiosBruto = useMemo(() => {
    return parseListItems(rawText);
  }, [rawText]);

  const dominiosFiltrados = useMemo(() => {
    const seen = new Set<string>();
    const result: { raw: string; fixed: string }[] = [];
    for (const item of dominiosBruto) {
      if (seen.has(item)) continue;
      seen.add(item);
      const { type, value } = classifyLine(item);
      if (type === 'invalido') continue;
      if (item !== value) result.push({ raw: item, fixed: value });
    }
    return result;
  }, [dominiosBruto]);

  const dominiosValidos = useMemo(() => {
    const normalizar = (s: string) => (s.includes('/') ? s.split('/')[0] : s);
    const result = classifyLines(rawText);
    const dominiosNorm = result.dominios.map(normalizar);
    const todos = [...dominiosNorm, ...result.ipv4, ...result.ipv6];
    const seen = new Set<string>();
    return todos.filter((x) => {
      if (seen.has(x)) return false;
      seen.add(x);
      return true;
    });
  }, [rawText]);

  const showFiltrosExtract = rawText.trim().length > 0;

  const handlePaste = useCallback(async () => {
    const text = await readText();
    if (text == null) {
      showApiError(CONTEXT_ERROR_MESSAGES.BLOCKDOMI_COPY_ERROR);
      return;
    }
    setRawText((prev) => (prev ? `${prev}\n${text}` : text));
    setClassifiedRef.current(null);
  }, [readText, setClassifiedRef, showApiError]);

  const handleClear = useCallback(() => {
    setRawText('');
    setClassifiedRef.current(null);
  }, [setClassifiedRef]);

  const handleCopySucceeded = useCallback(() => {
    success(t('blockdomi.copiedToClipboard'));
  }, [success, t]);

  const handleCopyFailed = useCallback(() => {
    showApiError(CONTEXT_ERROR_MESSAGES.BLOCKDOMI_COPY_ERROR);
  }, [showApiError]);

  const handleColunaToggle = useCallback((header: string) => {
    setColunasSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(header)) next.delete(header);
      else next.add(header);
      return next;
    });
  }, []);

  const handleColunasSelectAll = useCallback(() => {
    if (!colunasDisponiveis) return;
    setColunasSeleccionadas(new Set(Object.keys(colunasDisponiveis)));
  }, [colunasDisponiveis]);

  const handleColunasSelectNone = useCallback(() => {
    setColunasSeleccionadas(new Set());
  }, []);

  const handleColunasAplicar = useCallback(() => {
    if (!colunasDisponiveis) return;
    setRawText(buildTextFromColunas(colunasDisponiveis, colunasSeleccionadas));
    setClassifiedRef.current(null);
  }, [colunasDisponiveis, colunasSeleccionadas, setClassifiedRef]);

  const handleRawTextChange = useCallback(
    (value: string) => {
      setRawText(value);
      setClassifiedRef.current(null);
    },
    [setClassifiedRef]
  );

  const resetFormAfterCadastro = useCallback(() => {
    setRawText('');
    setClassifiedRef.current(null);
    setNomeOficio('');
    const today = new Date();
    const hojeStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setDataInicioBloqueio(hojeStr);
    setDataFimBloqueio('');
    setLinkOficioAnatel('');
    setLinkOficioJustica('');
    setLinkPlanilhaDominios('');
    setNumeroSeiAnatel('');
    setPdfOficioAnatel(null);
    setPdfOficioJustica(null);
    setPdfFile(null);
    pendingPdfFilesRef.current = emptyPendingPdfFiles();
    [pdfFileInputRef, pdfAnatelInputRef, pdfJusticaInputRef].forEach((ref) => {
      if (ref.current) ref.current.value = '';
    });
    setColunasDisponiveis(null);
    setColunasSeleccionadas(new Set());
  }, [setClassifiedRef]);

  return {
    rawText,
    setRawText,
    nomeOficio,
    setNomeOficio,
    dataInicioBloqueio,
    setDataInicioBloqueio,
    dataFimBloqueio,
    setDataFimBloqueio,
    linkOficioAnatel,
    setLinkOficioAnatel,
    linkOficioJustica,
    setLinkOficioJustica,
    linkPlanilhaDominios,
    setLinkPlanilhaDominios,
    numeroSeiAnatel,
    setNumeroSeiAnatel,
    listaModo,
    setListaModo,
    pdfFile,
    setPdfFile,
    pdfOficioAnatel,
    setPdfOficioAnatel,
    pdfOficioJustica,
    setPdfOficioJustica,
    colunasDisponiveis,
    setColunasDisponiveis,
    colunasSeleccionadas,
    setColunasSeleccionadas,
    pdfAnatelInputRef,
    pdfJusticaInputRef,
    pdfFileInputRef,
    pendingPdfFilesRef,
    hasPdfUrl,
    domainCount,
    dominiosBruto,
    dominiosFiltrados,
    dominiosValidos,
    showFiltrosExtract,
    handlePaste,
    handleClear,
    handleCopySucceeded,
    handleCopyFailed,
    handleColunaToggle,
    handleColunasSelectAll,
    handleColunasSelectNone,
    handleColunasAplicar,
    handleRawTextChange,
    resetFormAfterCadastro,
  };
}
