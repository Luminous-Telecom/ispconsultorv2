import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import DraggableModal from '@/components/common/DraggableModal';
import { Button } from '@/components/ui';
import { isValidIPv4, isValidIPv6 } from '@/utils/validators';
import { sanitizeDominio } from '@/utils/stringUtils';
import PdfExtractService from '@/services/pdfExtract';
import { DominioService } from '@/services/dominioService';
import { IPv4Service } from '@/services/ipv4Service';
import { IPv6Service } from '@/services/ipv6Service';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { useI18n } from '@/contexts/I18nContext';
import { useLoading } from '@/contexts/LoadingContext';
import DominiosExtraidosVisualizacaoModal, {
  type DominiosExtraidosVisualizacaoMetadata
} from '@/components/modals/blockdomi/DominiosExtraidosVisualizacaoModal';

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

export function classifyLines(text: string): ClassifiedList {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
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

  for (const line of lines) {
    const { type, value } = classifyLine(line);
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
  const [classified, setClassified] = useState<ClassifiedList | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCadastrando, setIsCadastrando] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const pdfFileInputRef = useRef<HTMLInputElement>(null);
  const [visualizacaoExtrados, setVisualizacaoExtrados] = useState<{
    show: boolean;
    dominios: string[];
    listaFiltrada: string[];
    metadata: DominiosExtraidosVisualizacaoMetadata;
  }>({ show: false, dominios: [], listaFiltrada: [], metadata: {} });

  const prevShowRef = useRef(false);
  useEffect(() => {
    if (show && !prevShowRef.current) {
      setRawText('');
      setNomeOficio('');
      setDataInicioBloqueio('');
      setDataFimBloqueio('');
      setLinkOficioAnatel('');
      setLinkOficioJustica('');
      setLinkPlanilhaDominios('');
      setClassified(null);
      setPdfFile(null);
      setVisualizacaoExtrados({ show: false, dominios: [], listaFiltrada: [], metadata: {} });
      if (pdfFileInputRef.current) {
        pdfFileInputRef.current.value = '';
      }
      const today = new Date();
      const hojeStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      setDataInicioBloqueio(hojeStr);
      if (pdfUrlToExtract?.trim()) {
        setLinkPlanilhaDominios(pdfUrlToExtract.trim());
      }
    }
    prevShowRef.current = !!show;
  }, [show, pdfUrlToExtract]);

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

  const handleExtractFromPdf = useCallback(async () => {
    if (pdfFile) {
      setIsExtractingPdf(true);
      setExtractionLoading(true);
      await new Promise((r) => setTimeout(r, 0));
      try {
        const result = await PdfExtractService.extractFromPdf(pdfFile);
        
        if (result.success && result.data) {
          const listBruto = result.data.dominios_bruto ?? result.data.dominios;
          const listFiltrada = result.data.dominios ?? [];
          const dataInicio = result.data.data_inicio_bloqueio ?? dataInicioBloqueio;
          const dataFim = result.data.data_fim_bloqueio ?? dataFimBloqueio;
          if (dataInicio) setDataInicioBloqueio(dataInicio);
          if (dataFim) setDataFimBloqueio(dataFim);
          setVisualizacaoExtrados(({
            show: true,
            dominios: listBruto,
            listaFiltrada: listFiltrada,
            metadata: {
              nomeOficio,
              dataInicioBloqueio: dataInicio,
              dataFimBloqueio: dataFim,
              linkOficioAnatel: linkOficioAnatel,
              linkOficioJustica: linkOficioJustica,
              linkPlanilhaDominios: linkPlanilhaDominios.trim() || undefined
            }
          }));
          setRawText(listBruto.join('\n'));
          setClassified(null);
          success(`${result.data.total_bruto ?? result.data.total} itens extraídos. Abrindo visualização.`);
        } else {
          error(t('blockdomi.pdfExtractError'));
        }
        setPdfFile(null);
        if (pdfFileInputRef.current) pdfFileInputRef.current.value = '';
      } catch (e) {
        error((e as Error)?.message ?? 'Erro ao extrair PDF.');
      } finally {
        setIsExtractingPdf(false);
        setExtractionLoading(false);
      }
      return;
    }
    error(t('blockdomi.importFromPdfIntro'));
  }, [pdfFile, success, error, t, setExtractionLoading, nomeOficio, dataInicioBloqueio, dataFimBloqueio, linkOficioAnatel, linkOficioJustica, linkPlanilhaDominios]);

  const handleExtractFromPdfUrl = useCallback(async () => {
    const url = linkPlanilhaDominios.trim() || pdfUrlToExtract?.trim();
    if (!url) {
      error(t('blockdomi.pdfUrlOrLinkRequired'));
      return;
    }
    setIsExtractingPdf(true);
    setExtractionLoading(true);
    await new Promise((r) => setTimeout(r, 0));
    try {
      const result = await PdfExtractService.extractFromPdfUrl(url);
      if (result.success && result.data) {
        const listBruto = result.data.dominios_bruto ?? result.data.dominios;
        const listFiltrada = result.data.dominios ?? [];
        const dataInicio = result.data.data_inicio_bloqueio ?? dataInicioBloqueio;
        const dataFim = result.data.data_fim_bloqueio ?? dataFimBloqueio;
        if (dataInicio) setDataInicioBloqueio(dataInicio);
        if (dataFim) setDataFimBloqueio(dataFim);
        setVisualizacaoExtrados(({
          show: true,
          dominios: listBruto,
          listaFiltrada: listFiltrada,
          metadata: {
            nomeOficio,
            dataInicioBloqueio: dataInicio,
            dataFimBloqueio: dataFim,
            linkOficioAnatel: linkOficioAnatel,
            linkOficioJustica: linkOficioJustica,
            linkPlanilhaDominios: linkPlanilhaDominios.trim() || undefined
          }
        }));
        setRawText(listBruto.join('\n'));
        setClassified(null);
        success(`${result.data.total_bruto ?? result.data.total} itens extraídos. Abrindo visualização.`);
      } else {
        error(t('blockdomi.pdfExtractError'));
      }
    } catch (e) {
      error((e as Error)?.message ?? 'Erro ao extrair PDF da URL.');
    } finally {
      setIsExtractingPdf(false);
      setExtractionLoading(false);
    }
  }, [linkPlanilhaDominios, pdfUrlToExtract, success, error, t, setExtractionLoading, nomeOficio, dataInicioBloqueio, dataFimBloqueio, linkOficioAnatel, linkOficioJustica]);

  const hasPdfUrl = Boolean(linkPlanilhaDominios.trim() || pdfUrlToExtract?.trim());

  const totalValid = useMemo(() => {
    if (!classified) return 0;
    return classified.dominios.length + classified.ipv4.length + classified.ipv6.length;
  }, [classified]);

  const handleCadastrar = useCallback(async () => {
    if (!classified || totalValid === 0) return;
    setIsCadastrando(true);
    try {
      const nomeOficioVal = nomeOficio.trim() || null;
      const today = new Date();
      const hojeStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const dataInicioVal = dataInicioBloqueio.trim() || hojeStr;
      const dataFimVal = dataFimBloqueio.trim() || null;
      const linkAnatelVal = linkOficioAnatel.trim() || null;
      const linkJusticaVal = linkOficioJustica.trim() || null;
      const linkPlanilhaVal = linkPlanilhaDominios.trim() || null;

      const metadata = { nome_oficio: nomeOficioVal, data_inicio_bloqueio: dataInicioVal, data_fim_bloqueio: dataFimVal, link_oficio_anatel: linkAnatelVal, link_oficio_justica: linkJusticaVal, link_planilha_dominios: linkPlanilhaVal };
      const emptyBulk = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };
      const [domRes, ipv4Res, ipv6Res] = await Promise.all([
        classified.dominios.length > 0 ? DominioService.bulkCreate(({ items: classified.dominios, ...metadata })) : Promise.resolve(emptyBulk),
        classified.ipv4.length > 0 ? IPv4Service.bulkCreate(({ items: classified.ipv4, ...metadata })) : Promise.resolve(emptyBulk),
        classified.ipv6.length > 0 ? IPv6Service.bulkCreate(({ items: classified.ipv6, ...metadata })) : Promise.resolve(emptyBulk)
      ]);
      const errs = [...domRes.errors, ...ipv4Res.errors, ...ipv6Res.errors];
      const parts: string[] = [];
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
      setNomeOficio('');
      setDataFimBloqueio('');
      setLinkPlanilhaDominios('');
      setClassified(null);
    } catch (e) {
      error((e as Error)?.message ?? 'Erro ao cadastrar.');
    } finally {
      setIsCadastrando(false);
    }
  }, [classified, totalValid, nomeOficio, dataInicioBloqueio, dataFimBloqueio, linkOficioAnatel, linkOficioJustica, linkPlanilhaDominios, success, error, onSuccess, queryClient, t]);

  const domainCount = useMemo(() => {
    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    return lines.length;
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
    return rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  }, [rawText]);

  const dominiosFiltrados = useMemo(() => {
    const seen = new Set<string>();
    const result: { raw: string; fixed: string }[] = [];
    for (const line of dominiosBruto) {
      if (seen.has(line)) continue;
      seen.add(line);
      const { type, value } = classifyLine(line);
      if (type === 'invalido') continue;
      if (line !== value) result.push({ raw: line, fixed: value });
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

  const content = (
    <div className="p-3 importar-lista-blockdomi">
        <p className="ilb-intro">
          {t('blockdomi.importIntro')}
        </p>

        <div className="ilb-section">
          <div className="row g-2 mb-2">
            <div className="col-12 col-md-6">
              <label className="form-label small mb-1">{t('blockdomi.nomeOficioOptional')}</label>
              <div className="ilb-input-wrapper">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder={t('blockdomi.placeholderOficio')}
                  value={nomeOficio}
                  onChange={(e) => setNomeOficio(e.target.value)}
                />
              </div>
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label small mb-1">{t('blockdomi.linkOficioAnatelOptional')}</label>
              <div className="ilb-input-wrapper">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="https://..."
                  value={linkOficioAnatel}
                  onChange={(e) => setLinkOficioAnatel(e.target.value)}
                />
              </div>
            </div>
            <div className="col-12">
              <label className="form-label small mb-1">{t('blockdomi.linkOficioJusticaOptional')}</label>
              <div className="ilb-input-wrapper">
                <textarea
                  className="form-control form-control-sm"
                  rows={2}
                  placeholder="https://exemplo1.com, https://exemplo2.com"
                  value={linkOficioJustica}
                  onChange={(e) => setLinkOficioJustica(e.target.value)}
                />
              </div>
              <span className="text-muted small">{t('blockdomi.separateLinksHelp')}</span>
            </div>
            <div className="col-12">
              <label className="form-label small mb-1">{t('blockdomi.linkPlanilhaDominiosOptional')}</label>
              <div className="ilb-input-wrapper">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="https://..."
                  value={linkPlanilhaDominios}
                  onChange={(e) => setLinkPlanilhaDominios(e.target.value)}
                />
              </div>
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label small mb-1">{t('blockdomi.dataInicioBloqueio')}</label>
              <div className="ilb-input-wrapper">
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={dataInicioBloqueio}
                  onChange={(e) => setDataInicioBloqueio(e.target.value)}
                />
              </div>
              <span className="text-muted small">{t('blockdomi.emptyEqualsToday')}</span>
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label small mb-1">{t('blockdomi.dataFimBloqueioOptional')}</label>
              <div className="ilb-input-wrapper">
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={dataFimBloqueio}
                  onChange={(e) => setDataFimBloqueio(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="ilb-section">
          <div className="card ilb-pdf-card mb-0">
            <div className="card-header">
              <i className="bi bi-file-earmark-pdf"></i>
              {t('blockdomi.importFromPdf')}
            </div>
            <div className="card-body">
              <p className="text-muted small mb-2">{t('blockdomi.importFromPdfIntro')}</p>
              <div className="mb-2">
                <label className="form-label small mb-1">{t('blockdomi.pdfFile')}</label>
                <input
                  ref={pdfFileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="form-control form-control-sm"
                  onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="d-flex flex-wrap gap-2 align-items-center">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleExtractFromPdf}
                  disabled={isExtractingPdf || !pdfFile}
                  leftIcon={<i className="bi bi-file-earmark-arrow-down"></i>}
                >
                  {t('blockdomi.extractDomainsFromPdf')}
                </Button>
                {hasPdfUrl && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleExtractFromPdfUrl}
                    disabled={isExtractingPdf}
                    leftIcon={<i className="bi bi-link-45deg"></i>}
                  >
                    {t('blockdomi.extractFromPlanilhaUrl')}
                  </Button>
                )}
                {isExtractingPdf && (
                  <span className="ilb-processing">
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                    <span>{t('blockdomi.extractingPdf')}</span>
                  </span>
                )}
              </div>
              {hasPdfUrl && (
                <p className="text-muted small mt-1 mb-0">{t('blockdomi.extractFromPlanilhaUrlHelp')}</p>
              )}
            </div>
          </div>
        </div>

        <div className="ilb-section">
          <div className={`ilb-editor-wrapper ${rawText.trim() ? 'has-content' : ''}`}>
            <div className="ilb-editor-header">
              <span>{t('blockdomi.inputListLabel')}</span>
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
              leftIcon={<i className="bi bi-clipboard"></i>}
            >
              {t('blockdomi.paste')}
            </Button>
            <Button
              type="button"
              variant="outline-secondary"
              size="sm"
              onClick={handleClear}
              disabled={!rawText.trim()}
              leftIcon={<i className="bi bi-trash"></i>}
            >
              {t('ui.clear')}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleAnalisar}
              disabled={!rawText.trim() || isAnalyzing}
              leftIcon={<i className="bi bi-search"></i>}
            >
              {t('blockdomi.analyze')}
            </Button>
            {classified && (
              <Button
                type="button"
                variant="success"
                size="sm"
                onClick={handleCadastrar}
                disabled={totalValid === 0 || isCadastrando}
                leftIcon={<i className="bi bi-cloud-upload"></i>}
              >
                {t('blockdomi.register')}
              </Button>
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
                            {item.raw} <span className="text-muted">&gt;</span> {item.fixed}
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
        </div>

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

  const handleCloseVisualizacaoExtrados = useCallback(() => {
    setVisualizacaoExtrados({ show: false, dominios: [], listaFiltrada: [], metadata: {} });
    setRawText('');
    setNomeOficio('');
    setClassified(null);
    setLinkPlanilhaDominios('');
    const today = new Date();
    const hojeStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setDataInicioBloqueio(hojeStr);
    setDataFimBloqueio('');
  }, []);

  const visualizacaoModal = (
    <DominiosExtraidosVisualizacaoModal
      show={visualizacaoExtrados.show}
      onClose={handleCloseVisualizacaoExtrados}
      onSuccess={onSuccess}
        dominiosExtraidos={visualizacaoExtrados.dominios}
        listaFiltrada={visualizacaoExtrados.listaFiltrada}
        metadata={visualizacaoExtrados.metadata}
    />
  );

  if (skipWrapper) {
    return (
      <>
        {content}
        {visualizacaoModal}
      </>
    );
  }

  return (
    <>
      <DraggableModal
        show={show}
        onClose={onClose}
        title={t('blockdomi.titleImport')}
        size="xl"
      >
        {content}
      </DraggableModal>
      {visualizacaoModal}
    </>
  );
};

export default ImportarListaBlockdomiModal;
