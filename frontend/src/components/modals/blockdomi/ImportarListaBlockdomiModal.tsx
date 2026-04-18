import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DraggableModal from 'components/common/DraggableModal';
import { Button } from 'components/ui';
import { isValidIPv4, isValidIPv6 } from 'utils/validators';
import { sanitizeDominio } from 'utils/stringUtils';
import PdfExtractService, { type PdfExtractPollProgress } from 'services/pdfExtract';
import { DominioService } from 'services/dominioService';
import { IPv4Service } from 'services/ipv4Service';
import { IPv6Service } from 'services/ipv6Service';
import { BlockdomiService } from 'services/blockdomiService';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useI18n } from 'contexts/I18nContext';
import { useLoading } from 'contexts/LoadingContext';

export interface ClassifiedList {
  dominios: string[];
  ipv4: string[];
  ipv6: string[];
  invalidos: string[];
  duplicados: string[];
  jaCadastrados: string[];
}

interface ImportarListaBlockdomiModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  skipWrapper?: boolean;
  pdfUrlToExtract?: string;
}

export function classifyLine(line: string): { type: 'dominio' | 'ipv4' | 'ipv6' | 'invalido'; value: string } {
  const trimmed = line.trim();
  if (!trimmed) return { type: 'invalido', value: trimmed };

  if (isValidIPv4(trimmed)) return { type: 'ipv4', value: trimmed };
  if (isValidIPv6(trimmed)) return { type: 'ipv6', value: trimmed };

  const dominioLimpo = sanitizeDominio(trimmed);
  if (dominioLimpo) return { type: 'dominio', value: dominioLimpo };

  return { type: 'invalido', value: trimmed };
}

/**
 * Extrai itens da lista: divide por quebra de linha E por espaços na mesma linha.
 * Ex: "a.com b.com c.com" vira ["a.com", "b.com", "c.com"]
 */
export function parseListItems(text: string): string[] {
  return text
    .split(/\r?\n/)
    .flatMap((line) => line.split(/\s+/).map((t) => t.trim()).filter(Boolean));
}

export function classifyLines(text: string): ClassifiedList {
  const items = parseListItems(text);
  const dominios: string[] = [];
  const ipv4: string[] = [];
  const ipv6: string[] = [];
  const invalidos: string[] = [];
  const duplicados: string[] = [];
  const seenDominios = new Set<string>();
  const seenIPv4 = new Set<string>();
  const seenIPv6 = new Set<string>();
  const seenInvalidos = new Set<string>();
  const seenDuplicados = new Set<string>();

  for (const item of items) {
    const { type, value } = classifyLine(item);
    if (type === 'dominio') {
      if (!seenDominios.has(value)) {
        seenDominios.add(value);
        dominios.push(value);
      } else if (!seenDuplicados.has(value)) {
        seenDuplicados.add(value);
        duplicados.push(value);
      }
    } else if (type === 'ipv4') {
      if (!seenIPv4.has(value)) {
        seenIPv4.add(value);
        ipv4.push(value);
      } else if (!seenDuplicados.has(value)) {
        seenDuplicados.add(value);
        duplicados.push(value);
      }
    } else if (type === 'ipv6') {
      if (!seenIPv6.has(value)) {
        seenIPv6.add(value);
        ipv6.push(value);
      } else if (!seenDuplicados.has(value)) {
        seenDuplicados.add(value);
        duplicados.push(value);
      }
    } else {
      if (!seenInvalidos.has(value)) {
        seenInvalidos.add(value);
        invalidos.push(value);
      }
    }
  }

  return { dominios, ipv4, ipv6, invalidos, duplicados, jaCadastrados: [] };
}

/** PDFs escolhidos na extração; upload só em handleCadastrar para não ocupar armazenamento à toa. */
type PendingPdfFiles = { main: File | null; anatel: File | null; justica: File | null };
const emptyPendingPdfFiles = (): PendingPdfFiles => ({ main: null, anatel: null, justica: null });

const ImportarListaBlockdomiModal: React.FC<ImportarListaBlockdomiModalProps> = ({
  show,
  onClose,
  onSuccess,
  skipWrapper = false,
  pdfUrlToExtract
}) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();
  const { setExtractionLoading } = useLoading();
  const [rawText, setRawText] = useState('');
  const [nomeOficio, setNomeOficio] = useState('');
  const [dataInicioBloqueio, setDataInicioBloqueio] = useState('');
  const [dataFimBloqueio, setDataFimBloqueio] = useState('');
  const [linkOficioAnatel, setLinkOficioAnatel] = useState('');
  const [linkOficioJustica, setLinkOficioJustica] = useState('');
  const [linkPlanilhaDominios, setLinkPlanilhaDominios] = useState('');
  const [pdfOficioAnatel, setPdfOficioAnatel] = useState<File | null>(null);
  const [pdfOficioJustica, setPdfOficioJustica] = useState<File | null>(null);
  const pdfAnatelInputRef = useRef<HTMLInputElement>(null);
  const pdfJusticaInputRef = useRef<HTMLInputElement>(null);
  const [classified, setClassified] = useState<ClassifiedList | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCadastrando, setIsCadastrando] = useState(false);
  const [listaModo, setListaModo] = useState<'bloqueio' | 'desbloqueio'>('bloqueio');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [pdfExtractProgress, setPdfExtractProgress] = useState<{ current: number; total: number } | null>(null);
  const [colunasDisponiveis, setColunasDisponiveis] = useState<Record<string, string[]> | null>(null);
  const [colunasSeleccionadas, setColunasSeleccionadas] = useState<Set<string>>(new Set());
  const pdfFileInputRef = useRef<HTMLInputElement>(null);
  const pendingPdfFilesRef = useRef<PendingPdfFiles>(emptyPendingPdfFiles());

  const prevShowRef = useRef(false);
  useEffect(() => {
    if (show && !prevShowRef.current) {
      setRawText('');
      setClassified(null);
      setPdfFile(null);
      setPdfOficioAnatel(null);
      setPdfOficioJustica(null);
      [pdfFileInputRef, pdfAnatelInputRef, pdfJusticaInputRef].forEach((ref) => {
        if (ref.current) ref.current.value = '';
      });
      setPdfExtractProgress(null);
      setColunasDisponiveis(null);
      setColunasSeleccionadas(new Set());
      pendingPdfFilesRef.current = emptyPendingPdfFiles();
      setListaModo('bloqueio');
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
  }, [show, pdfUrlToExtract]);

  const handlePdfPollProgress = useCallback((p: PdfExtractPollProgress) => {
    if (p.status === 'processing' && p.progress) {
      setPdfExtractProgress(p.progress);
    }
  }, []);

  const fetchExisting = useCallback(async () => {
    const fetchAll = async <T,>(
      listFn: (f: { limit: number; page: number }) => Promise<{ data?: T[]; pagination?: { last_page: number } }>,
      key: keyof T & string
    ): Promise<Set<string>> => {
      const set = new Set<string>();
      let page = 1;
      while (true) {
        const res = await listFn({ limit: 5000, page });
        const arr = res?.data ?? [];
        arr.forEach((d) => set.add(String((d as Record<string, unknown>)[key] ?? '')));
        if (page >= (res?.pagination?.last_page ?? 1)) break;
        page++;
      }
      return set;
    };
    const [existingDominios, existingIPv4, existingIPv6] = await Promise.all([
      fetchAll(DominioService.list.bind(DominioService), 'dominio'),
      fetchAll(IPv4Service.list.bind(IPv4Service), 'ip'),
      fetchAll(IPv6Service.list.bind(IPv6Service), 'ip')
    ]);
    return { existingDominios, existingIPv4, existingIPv6 };
  }, []);

  const handleAnalisar = useCallback(async () => {
    setIsAnalyzing(true);
    setClassified(null);
    try {
      const result = classifyLines(rawText);
      const { existingDominios, existingIPv4, existingIPv6 } = await fetchExisting();
      const jaCadastrados: string[] = [
        ...result.dominios.filter((d) => existingDominios.has(d)),
        ...result.ipv4.filter((ip) => existingIPv4.has(ip)),
        ...result.ipv6.filter((ip) => existingIPv6.has(ip))
      ];
      setClassified({ ...result, jaCadastrados });
    } catch (e) {
      setClassified(null);
      error((e as Error)?.message ?? 'Erro ao analisar.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [rawText, fetchExisting, error]);

  const buildTextFromColunas = useCallback(
    (colunas: Record<string, string[]>, selecionadas: Set<string>): string => {
      const merged = new Set<string>();
      Array.from(selecionadas).forEach((key) => {
        (colunas[key] ?? []).forEach((item) => merged.add(item));
      });
      return Array.from(merged).join('\n');
    },
    []
  );

  const handleColunaToggle = useCallback(
    (header: string) => {
      setColunasSeleccionadas((prev) => {
        const next = new Set(prev);
        if (next.has(header)) next.delete(header);
        else next.add(header);
        return next;
      });
    },
    []
  );

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
    setClassified(null);
  }, [colunasDisponiveis, colunasSeleccionadas, buildTextFromColunas]);

  const handleExtractFromPdf = useCallback(async () => {
    if (!pdfFile) {
      error(t('blockdomi.importFromPdfIntro'));
      return;
    }

    // Referências para upload em handleCadastrar (podem coincidir com o estado visível após a extração)
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
        setClassified(null);
        pendingPdfFilesRef.current = {
          main: filesToUpload.main,
          anatel: filesToUpload.anatel ?? null,
          justica: filesToUpload.justica ?? null
        };
        success(t('blockdomi.pdfExtractSuccess'));
      } else {
        error(t('blockdomi.pdfExtractError'));
      }
    } catch (e) {
      const msg = (e as Error)?.message ?? 'Erro ao extrair PDF.';
      error(msg);
    } finally {
      setIsExtractingPdf(false);
      setExtractionLoading(false);
      setPdfExtractProgress(null);
    }
  }, [pdfFile, pdfOficioAnatel, pdfOficioJustica, success, error, t, setExtractionLoading, dataInicioBloqueio, dataFimBloqueio, handlePdfPollProgress, buildTextFromColunas]);

  const handleExtractFromPdfUrl = useCallback(async () => {
    const urlResolved = (linkPlanilhaDominios.trim() || pdfUrlToExtract?.trim() || '').trim();
    if (!urlResolved) {
      error(t('blockdomi.pdfUrlOrLinkRequired'));
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
        setClassified(null);
        pendingPdfFilesRef.current = { ...pendingPdfFilesRef.current, main: null };
        success(t('blockdomi.pdfExtractSuccess'));
      } else {
        error(t('blockdomi.pdfExtractError'));
      }
    } catch (e) {
      error((e as Error)?.message ?? 'Erro ao extrair PDF da URL.');
    } finally {
      setIsExtractingPdf(false);
      setExtractionLoading(false);
      setPdfExtractProgress(null);
    }
  }, [linkPlanilhaDominios, pdfUrlToExtract, success, error, t, setExtractionLoading, dataInicioBloqueio, dataFimBloqueio, handlePdfPollProgress, buildTextFromColunas]);

  const hasPdfUrl = Boolean(linkPlanilhaDominios.trim() || pdfUrlToExtract?.trim());

  const totalValid = useMemo(() => {
    if (!classified) return 0;
    return classified.dominios.length + classified.ipv4.length + classified.ipv6.length;
  }, [classified]);

  const handleCadastrar = useCallback(async () => {
    if (!classified || totalValid === 0) return;
    if (listaModo === 'desbloqueio' && !window.confirm(t('blockdomi.removerListaConfirm'))) {
      return;
    }
    setIsCadastrando(true);
    try {
      if (listaModo === 'desbloqueio') {
        const result = await BlockdomiService.removerLista({
          dominios: classified.dominios,
          ipv4: classified.ipv4,
          ipv6: classified.ipv6
        });
        const parts: string[] = [];
        if (result.dominios.deleted > 0) parts.push(`Domínios: ${result.dominios.deleted} removido(s)`);
        if (result.ipv4.deleted > 0) parts.push(`IPv4: ${result.ipv4.deleted} removido(s)`);
        if (result.ipv6.deleted > 0) parts.push(`IPv6: ${result.ipv6.deleted} removido(s)`);
        const nf = result.dominios.notFound + result.ipv4.notFound + result.ipv6.notFound;
        if (nf > 0) parts.push(`${nf} não encontrado(s) no cadastro`);
        success(parts.length > 0 ? parts.join('. ') + '.' : 'Nenhum item removido.');
        queryClient.invalidateQueries({ queryKey: ['dominios'] });
        queryClient.invalidateQueries({ queryKey: ['ipv4'] });
        queryClient.invalidateQueries({ queryKey: ['ipv6'] });
        onSuccess?.();
        setRawText('');
        setClassified(null);
        setNomeOficio('');
        const today = new Date();
        const hojeStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        setDataInicioBloqueio(hojeStr);
        setDataFimBloqueio('');
        setLinkOficioAnatel('');
        setLinkOficioJustica('');
        setLinkPlanilhaDominios('');
        setPdfOficioAnatel(null);
        setPdfOficioJustica(null);
        setPdfFile(null);
        pendingPdfFilesRef.current = emptyPendingPdfFiles();
        [pdfFileInputRef, pdfAnatelInputRef, pdfJusticaInputRef].forEach((ref) => {
          if (ref.current) ref.current.value = '';
        });
        setColunasDisponiveis(null);
        setColunasSeleccionadas(new Set());
        setPdfExtractProgress(null);
        return;
      }

      const nomeOficioVal = nomeOficio.trim() || null;
      const today = new Date();
      const hojeStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const dataInicioVal = dataInicioBloqueio.trim() || hojeStr;
      const dataFimVal = dataFimBloqueio.trim() || null;

      let linkAnatelVal = linkOficioAnatel.trim() || null;
      let linkJusticaVal = linkOficioJustica.trim() || null;
      let linkPlanilhaVal = linkPlanilhaDominios.trim() || null;

      const pend = pendingPdfFilesRef.current;
      if (pend.anatel) {
        const { url } = await BlockdomiService.uploadOficioPdf(pend.anatel);
        linkAnatelVal = url;
      } else if (pdfOficioAnatel) {
        const { url } = await BlockdomiService.uploadOficioPdf(pdfOficioAnatel);
        linkAnatelVal = url;
      }
      if (pend.justica) {
        const { url } = await BlockdomiService.uploadOficioPdf(pend.justica);
        linkJusticaVal = url;
      } else if (pdfOficioJustica) {
        const { url } = await BlockdomiService.uploadOficioPdf(pdfOficioJustica);
        linkJusticaVal = url;
      }
      if (pend.main) {
        const { url } = await BlockdomiService.uploadOficioPdf(pend.main);
        linkPlanilhaVal = url;
      } else if (pdfFile) {
        const { url } = await BlockdomiService.uploadOficioPdf(pdfFile);
        linkPlanilhaVal = url;
      }

      const result = await BlockdomiService.importarLista({
        dominios: classified.dominios,
        ipv4: classified.ipv4,
        ipv6: classified.ipv6,
        nome_oficio: nomeOficioVal,
        data_inicio_bloqueio: dataInicioVal,
        data_fim_bloqueio: dataFimVal,
        link_oficio_anatel: linkAnatelVal,
        link_oficio_justica: linkJusticaVal,
        link_planilha_dominios: linkPlanilhaVal
      });
      const { versao_lista: versaoLista, dominios: domRes, ipv4: ipv4Res, ipv6: ipv6Res } = result;
      const errs = [...domRes.errors, ...ipv4Res.errors, ...ipv6Res.errors];
      const parts: string[] = [`Lista versão ${versaoLista}`];
      if (domRes.created + domRes.updated > 0) parts.push(`Domínios: ${domRes.created} criado(s), ${domRes.updated} atualizado(s)`);
      if (ipv4Res.created + ipv4Res.updated > 0) parts.push(`IPv4: ${ipv4Res.created} criado(s), ${ipv4Res.updated} atualizado(s)`);
      if (ipv6Res.created + ipv6Res.updated > 0) parts.push(`IPv6: ${ipv6Res.created} criado(s), ${ipv6Res.updated} atualizado(s)`);
      const skipTotal = domRes.skipped + ipv4Res.skipped + ipv6Res.skipped;
      if (skipTotal > 0) parts.push(`${t('blockdomi.alreadyRegisteredIgnored')}: ${skipTotal}`);
      if (classified.invalidos.length > 0) parts.push(`Inválidos: ${classified.invalidos.length}`);
      success(parts.length > 0 ? parts.join('. ') + '.' : 'Importação concluída.');
      if (errs.length > 0) {
        error(errs.slice(0, 3).join('; ') + (errs.length > 3 ? ` e mais ${errs.length - 3} erro(s).` : ''));
      }
      queryClient.invalidateQueries({ queryKey: ['dominios'] });
      queryClient.invalidateQueries({ queryKey: ['ipv4'] });
      queryClient.invalidateQueries({ queryKey: ['ipv6'] });
      onSuccess?.();
      setRawText('');
      setClassified(null);
      setNomeOficio('');
      setDataInicioBloqueio(hojeStr);
      setDataFimBloqueio('');
      setLinkOficioAnatel('');
      setLinkOficioJustica('');
      setLinkPlanilhaDominios('');
      setPdfOficioAnatel(null);
      setPdfOficioJustica(null);
      setPdfFile(null);
      pendingPdfFilesRef.current = emptyPendingPdfFiles();
      [pdfFileInputRef, pdfAnatelInputRef, pdfJusticaInputRef].forEach((ref) => {
        if (ref.current) ref.current.value = '';
      });
      setColunasDisponiveis(null);
      setColunasSeleccionadas(new Set());
      setPdfExtractProgress(null);
    } catch (e) {
      error((e as Error)?.message ?? 'Erro ao cadastrar.');
    } finally {
      setIsCadastrando(false);
    }
  }, [classified, totalValid, listaModo, nomeOficio, dataInicioBloqueio, dataFimBloqueio, linkOficioAnatel, linkOficioJustica, linkPlanilhaDominios, pdfOficioAnatel, pdfOficioJustica, pdfFile, success, error, onSuccess, queryClient, t]);

  const domainCount = useMemo(() => {
    return parseListItems(rawText).length;
  }, [rawText]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setRawText((prev) => (prev ? `${prev}\n${text}` : text));
      setClassified(null);
    } catch {
      error(t('blockdomi.copyFailed'));
    }
  }, [error, t]);

  const handleClear = useCallback(() => {
    setRawText('');
    setClassified(null);
  }, []);

  const handleCopy = useCallback(
    (items: string[]) => {
      if (items.length === 0) return;
      const texto = items.join('\n');
      navigator.clipboard.writeText(texto).then(
        () => success(t('blockdomi.copiedToClipboard')),
        () => error(t('blockdomi.copyFailed'))
      );
    },
    [success, error, t]
  );

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

  const renderList = (items: string[]) => (
    <ul className="list-unstyled mb-0 small">
      {items.map((item, i) => (
        <li key={i} className="text-nowrap overflow-x-auto ilb-list-item">
          {item}
        </li>
      ))}
    </ul>
  );

  const [isGerandoVersao, setIsGerandoVersao] = useState(false);

  const { data: versaoAtual = '' } = useQuery({
    queryKey: ['blockdomi', 'versao-atual'],
    queryFn: () => BlockdomiService.getVersaoAtual(),
    enabled: show,
  });

  const handleGerarVersao = useCallback(async () => {
    setIsGerandoVersao(true);
    try {
      const result = await BlockdomiService.gerarVersao();
      success(`${t('blockdomi.versao')} ${result.numero} ${t('blockdomi.versaoGerada')}`);
      queryClient.invalidateQueries({ queryKey: ['blockdomi', 'versao-atual'] });
    } catch (e) {
      error((e as Error)?.message ?? 'Erro ao gerar versão.');
    } finally {
      setIsGerandoVersao(false);
    }
  }, [success, error, t, queryClient]);

  const content = (
    <div className="p-4 importar-lista-blockdomi">
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <span className="text-muted small me-2">
            {t('blockdomi.versao')} atual: <strong>{versaoAtual || '-'}</strong>
          </span>
          <Button variant="secondary" size="sm" onClick={handleGerarVersao} disabled={isGerandoVersao}>
            {t('blockdomi.gerarVersao')}
          </Button>
        </div>

        <div className="row g-3 mb-3">
            <div className="col-12">
              <div className="row g-2 mb-2 w-100">
                <div className="col-12 col-md-6">
                  <label className="form-label small mb-1">{t('blockdomi.nomeOficioOptional')}</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder={t('blockdomi.placeholderOficio')}
                    value={nomeOficio}
                    onChange={(e) => setNomeOficio(e.target.value)}
                  />
                </div>
                <div className="col-6 col-md-3">
                  <label className="form-label small mb-1">{t('blockdomi.dataInicioBloqueio')}</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={dataInicioBloqueio}
                    onChange={(e) => setDataInicioBloqueio(e.target.value)}
                  />
                </div>
                <div className="col-6 col-md-3">
                  <label className="form-label small mb-1">{t('blockdomi.dataFimBloqueioOptional')}</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={dataFimBloqueio}
                    onChange={(e) => setDataFimBloqueio(e.target.value)}
                  />
                </div>
              </div>
              <div className="pt-3 mt-3 border-top border-secondary pb-3 mb-3 border-bottom border-secondary">
              <label className="form-label small mb-1 mt-2">{t('blockdomi.linkOficioAnatelOptional')}</label>
              <div className="input-group input-group-sm mb-1">
                <input
                  type="text"
                  className="form-control"
                  placeholder="https://... ou arquivo PDF"
                  value={linkOficioAnatel}
                  onChange={(e) => setLinkOficioAnatel(e.target.value)}
                />
                <input
                  ref={pdfAnatelInputRef}
                  type="file"
                  className="form-control"
                  accept=".pdf,application/pdf"
                  onChange={(e) => {
                    setPdfOficioAnatel(e.target.files?.[0] ?? null);
                    pendingPdfFilesRef.current = { ...pendingPdfFilesRef.current, anatel: null };
                  }}
                />
              </div>
              <label className="form-label small mb-1 mt-2">
                {t('blockdomi.linkOficioJusticaOptional')}
                <i
                  className="bi bi-info-circle text-muted ms-1"
                  style={{ cursor: 'help', fontSize: '0.85rem' }}
                  title={t('blockdomi.separateLinksHelp')}
                />
              </label>
              <div className="input-group input-group-sm mb-1">
                <input
                  type="text"
                  className="form-control"
                  placeholder="https://exemplo1.com, https://exemplo2.com ou arquivo PDF"
                  value={linkOficioJustica}
                  onChange={(e) => setLinkOficioJustica(e.target.value)}
                />
                <input
                  ref={pdfJusticaInputRef}
                  type="file"
                  className="form-control"
                  accept=".pdf,application/pdf"
                  onChange={(e) => {
                    setPdfOficioJustica(e.target.files?.[0] ?? null);
                    pendingPdfFilesRef.current = { ...pendingPdfFilesRef.current, justica: null };
                  }}
                />
              </div>
              <label className="form-label small mb-1 mt-2">{t('blockdomi.linkPlanilhaDominiosOptional')}</label>
              <div className="input-group input-group-sm mb-1 align-items-stretch">
                <input
                  type="text"
                  className="form-control"
                  placeholder="https://... ou arquivo PDF"
                  value={linkPlanilhaDominios}
                  onChange={(e) => setLinkPlanilhaDominios(e.target.value)}
                />
                <input
                  ref={pdfFileInputRef}
                  type="file"
                  className="form-control"
                  accept=".pdf,application/pdf"
                  onChange={(e) => {
                    setPdfFile(e.target.files?.[0] ?? null);
                    pendingPdfFilesRef.current = { ...pendingPdfFilesRef.current, main: null };
                  }}
                />
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="rounded-0 py-0"
                  onClick={handleExtractFromPdf}
                  disabled={isExtractingPdf || !pdfFile}
                >
                  {t('blockdomi.extractDomainsFromPdf')}
                </Button>
                {hasPdfUrl && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="rounded-0 py-0"
                    onClick={handleExtractFromPdfUrl}
                    disabled={isExtractingPdf}
                  >
                    {t('blockdomi.extractFromPlanilhaUrl')}
                  </Button>
                )}
                {isExtractingPdf && (
                  <span className="input-group-text ilb-processing border-0 bg-transparent">
                    <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                    <span className="small">{t('blockdomi.extractingPdf')}</span>
                  </span>
                )}
              </div>
              {hasPdfUrl && (
                <p className="text-muted small mt-1 mb-0">{t('blockdomi.extractFromPlanilhaUrlHelp')}</p>
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

        {colunasDisponiveis && Object.keys(colunasDisponiveis).length > 0 && (
          <div className="mb-3 border rounded" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <div className="d-flex align-items-center justify-content-between px-2 pt-2 pb-1">
              <span className="small fw-semibold">{t('blockdomi.colunasDetectadas')}</span>
              <div className="d-flex gap-2 align-items-center">
                <button type="button" className="btn btn-link btn-sm p-0 text-muted" style={{ fontSize: '0.75rem' }} onClick={handleColunasSelectAll}>
                  {t('blockdomi.colunasSelecAll')}
                </button>
                <button type="button" className="btn btn-link btn-sm p-0 text-muted" style={{ fontSize: '0.75rem' }} onClick={handleColunasSelectNone}>
                  {t('blockdomi.colunasSelecNone')}
                </button>
                <button type="button" className="btn btn-primary btn-sm py-0 px-2" style={{ fontSize: '0.75rem' }} onClick={handleColunasAplicar}>
                  {t('blockdomi.colunasAplicar')}
                </button>
              </div>
            </div>
            <div className="d-flex flex-wrap gap-2 p-2">
              {Object.entries(colunasDisponiveis).map(([header, items]) => {
                const selecionada = colunasSeleccionadas.has(header);
                return (
                  <div
                    key={header}
                    className="rounded"
                    style={{
                      minWidth: 160,
                      maxWidth: 260,
                      flex: '1 1 160px',
                      border: '1px solid',
                      borderColor: selecionada ? 'var(--bs-primary)' : 'var(--border-color)',
                      backgroundColor: 'var(--bg-primary)',
                      overflow: 'hidden',
                      transition: 'border-color 0.15s'
                    }}
                  >
                    <label
                      className="d-flex align-items-center gap-2 px-2 py-1"
                      style={{
                        cursor: 'pointer',
                        backgroundColor: selecionada ? 'var(--bs-primary)' : 'var(--bg-tertiary)',
                        color: selecionada ? '#fff' : 'var(--text-primary)',
                        userSelect: 'none',
                        transition: 'background-color 0.15s, color 0.15s',
                        margin: 0
                      }}
                    >
                      <input
                        type="checkbox"
                        className="form-check-input m-0 flex-shrink-0"
                        style={{ width: '0.8rem', height: '0.8rem' }}
                        checked={selecionada}
                        onChange={() => handleColunaToggle(header)}
                      />
                      <span className="small fw-semibold text-truncate flex-grow-1" title={header}>{header}</span>
                      <span className="small flex-shrink-0" style={{ opacity: 0.8 }}>{items.length}</span>
                    </label>
                    <div
                      style={{
                        maxHeight: 120,
                        overflowY: 'auto',
                        padding: '4px 8px',
                        fontFamily: 'monospace',
                        fontSize: '0.7rem',
                        color: 'var(--text-muted)',
                        lineHeight: 1.6
                      }}
                    >
                      {items.length === 0 ? (
                        <span style={{ opacity: 0.5 }}>{t('blockdomi.none')}</span>
                      ) : (
                        items.map((item, i) => (
                          <div key={i} className="text-truncate" title={item}>{item}</div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
                onChange={(e) => {
                  setRawText(e.target.value);
                  setClassified(null);
                }}
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
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handlePaste}
            >
              {t('blockdomi.paste')}
            </Button>
            <Button
              type="button"
              variant="outline-secondary"
              size="sm"
              onClick={handleClear}
              disabled={!rawText.trim()}
            >
              {t('ui.clear')}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleAnalisar}
              disabled={!rawText.trim() || isAnalyzing}
            >
              {t('blockdomi.analyze')}
            </Button>
            {classified && (
              <>
                <div className="btn-group btn-group-sm" role="group" aria-label={t('blockdomi.modoListaBloqueio')}>
                  <Button
                    type="button"
                    variant={listaModo === 'bloqueio' ? 'primary' : 'outline-primary'}
                    size="sm"
                    onClick={() => setListaModo('bloqueio')}
                  >
                    {t('blockdomi.modoListaBloqueio')}
                  </Button>
                  <Button
                    type="button"
                    variant={listaModo === 'desbloqueio' ? 'danger' : 'outline-danger'}
                    size="sm"
                    onClick={() => setListaModo('desbloqueio')}
                  >
                    {t('blockdomi.modoListaDesbloqueio')}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant={listaModo === 'desbloqueio' ? 'danger' : 'primary'}
                  size="sm"
                  onClick={handleCadastrar}
                  disabled={totalValid === 0 || isCadastrando}
                >
                  {listaModo === 'desbloqueio' ? t('blockdomi.registerRemover') : t('blockdomi.register')}
                </Button>
              </>
            )}
          </div>

          {showFiltrosExtract && (
            <div className="row g-2 mb-2 mt-1">
              <div className="col-12 col-md-4">
                <div className="card h-100 ilb-filtro-card">
                  <div className="card-header py-2 bg-light d-flex justify-content-between align-items-center">
                    <strong>{t('blockdomi.raw')}</strong>
                    <span className="badge bg-secondary">{dominiosBruto.length}</span>
                  </div>
                  <div className="card-body py-2 overflow-auto user-select-text ilb-filtro-body">
                    {dominiosBruto.length === 0 ? (
                      <span className="text-muted small">{t('blockdomi.none')}</span>
                    ) : (
                      renderList(dominiosBruto)
                    )}
                  </div>
                  <div className="card-footer py-2">
                    <Button
                      type="button"
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => handleCopy(dominiosBruto)}
                      disabled={dominiosBruto.length === 0}
                    >
                      {t('buttons.copy')}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div className="card h-100 ilb-filtro-card border-warning">
                  <div className="card-header py-2 bg-warning text-dark d-flex justify-content-between align-items-center">
                    <strong>{t('blockdomi.filtered')}</strong>
                    <span className="badge bg-dark">{dominiosFiltrados.length}</span>
                  </div>
                  <div className="card-body py-2 overflow-auto user-select-text ilb-filtro-body">
                    {dominiosFiltrados.length === 0 ? (
                      <span className="text-muted small">{t('blockdomi.none')}</span>
                    ) : (
                      <ul className="list-unstyled mb-0 small">
                        {dominiosFiltrados.map((item, i) => (
                          <li key={i} className="text-nowrap overflow-x-auto ilb-list-item">
                            {item.raw} <span className="text-muted">{'>'}</span> {item.fixed}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="card-footer py-2">
                    <Button
                      type="button"
                      variant="outline-dark"
                      size="sm"
                      onClick={() => handleCopy(dominiosFiltrados.map((x) => x.fixed))}
                      disabled={dominiosFiltrados.length === 0}
                    >
                      {t('buttons.copy')}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div className="card h-100 ilb-filtro-card border-success">
                  <div className="card-header py-2 bg-success text-white d-flex justify-content-between align-items-center">
                    <strong>{t('blockdomi.valid')}</strong>
                    <span className="badge bg-light text-dark">{dominiosValidos.length}</span>
                  </div>
                  <div className="card-body py-2 overflow-auto user-select-text ilb-filtro-body">
                    {dominiosValidos.length === 0 ? (
                      <span className="text-muted small">{t('blockdomi.none')}</span>
                    ) : (
                      renderList(dominiosValidos)
                    )}
                  </div>
                  <div className="card-footer py-2">
                    <Button
                      type="button"
                      variant="outline-light"
                      size="sm"
                      onClick={() => handleCopy(dominiosValidos)}
                      disabled={dominiosValidos.length === 0}
                    >
                      {t('buttons.copy')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

        {isAnalyzing && (
          <div className="ilb-processing mt-1">
            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
            <span>{t('blockdomi.classifying')}</span>
          </div>
        )}

        {classified && !isAnalyzing && (
          <div className="ilb-classification-cards">
            <div className="card ilb-class-card">
              <div className="card-header bg-primary text-white">
                {t('blockdomi.domains')} ({classified.dominios.length})
              </div>
              <div className="card-body overflow-auto user-select-text">
                {classified.dominios.length === 0 ? (
                  <span className="text-muted small">{t('blockdomi.none')}</span>
                ) : (
                  renderList(classified.dominios)
                )}
              </div>
            </div>
            <div className="card ilb-class-card">
              <div className="card-header bg-info text-white">
                IPv4 ({classified.ipv4.length})
              </div>
              <div className="card-body overflow-auto user-select-text">
                {classified.ipv4.length === 0 ? (
                  <span className="text-muted small">{t('blockdomi.none')}</span>
                ) : (
                  renderList(classified.ipv4)
                )}
              </div>
            </div>
            <div className="card ilb-class-card">
              <div className="card-header bg-secondary text-white">
                IPv6 ({classified.ipv6.length})
              </div>
              <div className="card-body overflow-auto user-select-text">
                {classified.ipv6.length === 0 ? (
                  <span className="text-muted small">{t('blockdomi.none')}</span>
                ) : (
                  renderList(classified.ipv6)
                )}
              </div>
            </div>
            <div className="card ilb-class-card">
              <div className="card-header bg-dark text-white">
                {t('blockdomi.alreadyRegistered')} ({classified.jaCadastrados.length})
              </div>
              <div className="card-body overflow-auto user-select-text">
                {classified.jaCadastrados.length === 0 ? (
                  <span className="text-muted small">{t('blockdomi.none')}</span>
                ) : (
                  renderList(classified.jaCadastrados)
                )}
              </div>
            </div>
            <div className="card ilb-class-card">
              <div className="card-header bg-danger text-white">
                {t('blockdomi.invalid')} ({classified.invalidos.length})
              </div>
              <div className="card-body overflow-auto user-select-text">
                {classified.invalidos.length === 0 ? (
                  <span className="text-muted small">{t('blockdomi.none')}</span>
                ) : (
                  renderList(classified.invalidos)
                )}
              </div>
            </div>
          </div>
        )}
      </div>
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
