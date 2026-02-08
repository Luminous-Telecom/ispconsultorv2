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
      const today = new Date();
      setDataInicioBloqueio(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
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

  const renderList = (items: string[]) => (
    <ul className="list-unstyled mb-0 small">
      {items.map((item, i) => (
        <li key={i} className="text-nowrap overflow-x-auto" style={{ minHeight: '1.5em' }}>
          {item}
        </li>
      ))}
    </ul>
  );

  const content = (
    <div className="p-3">
        <p className="text-muted small mb-2">
          {t('blockdomi.importIntro')}
        </p>
        <div className="mb-2">
          <label className="form-label small mb-1">{t('blockdomi.nomeOficioOptional')}</label>
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder={t('blockdomi.placeholderOficio')}
            value={nomeOficio}
            onChange={(e) => setNomeOficio(e.target.value)}
          />
        </div>
        <div className="row g-2 mb-2">
          <div className="col-12">
            <label className="form-label small mb-1">{t('blockdomi.linkOficioAnatelOptional')}</label>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="https://..."
              value={linkOficioAnatel}
              onChange={(e) => setLinkOficioAnatel(e.target.value)}
            />
          </div>
          <div className="col-12">
            <label className="form-label small mb-1">{t('blockdomi.linkOficioJusticaOptional')}</label>
            <textarea
              className="form-control form-control-sm"
              rows={2}
              placeholder="https://exemplo1.com, https://exemplo2.com"
              value={linkOficioJustica}
              onChange={(e) => setLinkOficioJustica(e.target.value)}
            />
            <span className="text-muted small">Separe múltiplos links com vírgula</span>
          </div>
          <div className="col-12">
            <label className="form-label small mb-1">{t('blockdomi.linkPlanilhaDominiosOptional')}</label>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="https://..."
              value={linkPlanilhaDominios}
              onChange={(e) => setLinkPlanilhaDominios(e.target.value)}
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label small mb-1">{t('blockdomi.dataInicioBloqueio')}</label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={dataInicioBloqueio}
              onChange={(e) => setDataInicioBloqueio(e.target.value)}
            />
            <span className="text-muted small">{t('blockdomi.emptyEqualsToday')}</span>
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label small mb-1">{t('blockdomi.dataFimBloqueioOptional')}</label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={dataFimBloqueio}
              onChange={(e) => setDataFimBloqueio(e.target.value)}
            />
          </div>
        </div>

        <div className="card mb-3">
          <div className="card-header py-2 bg-light">
            <strong>{t('blockdomi.importFromPdf')}</strong>
          </div>
          <div className="card-body py-2">
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
                >
                  {t('blockdomi.extractFromPlanilhaUrl')}
                </Button>
              )}
              {isExtractingPdf && (
                <span className="d-inline-flex align-items-center gap-2 text-primary">
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  <span className="small">{t('blockdomi.extractingPdf')}</span>
                </span>
              )}
            </div>
            {hasPdfUrl && (
              <p className="text-muted small mt-1 mb-0">{t('blockdomi.extractFromPlanilhaUrlHelp')}</p>
            )}
          </div>
        </div>

        <textarea
          className="form-control font-monospace small"
          rows={6}
          placeholder="meusite.com&#10;10.0.0.1&#10;2001:db8::1&#10;https://outro.dominio.com/caminho"
          value={rawText}
          onChange={(e) => {
            setRawText(e.target.value);
            setClassified(null);
          }}
        />
        <div className="d-flex gap-2 mt-2">
          <Button type="button" variant="primary" size="sm" onClick={handleAnalisar} disabled={!rawText.trim() || isAnalyzing}>
            {t('blockdomi.analyze')}
          </Button>
          {classified && (
            <Button
              type="button"
              variant="success"
              size="sm"
              onClick={handleCadastrar}
              disabled={totalValid === 0 || isCadastrando}
            >
              {t('blockdomi.register')}
            </Button>
          )}
        </div>

        {isAnalyzing && <p className="mt-2 text-muted small">{t('blockdomi.classifying')}</p>}

        {classified && !isAnalyzing && (
          <div className="row g-3 mt-2">
            <div className="col-12 col-md-6 col-lg-3">
              <div className="card h-100">
                <div className="card-header py-2 bg-primary text-white">
                  {t('blockdomi.domains')} ({classified.dominios.length})
                </div>
                <div className="card-body py-2 overflow-auto user-select-text" style={{ maxHeight: 200 }}>
                  {classified.dominios.length === 0 ? (
                    <span className="text-muted small">{t('blockdomi.none')}</span>
                  ) : (
                    renderList(classified.dominios)
                  )}
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <div className="card h-100">
                <div className="card-header py-2 bg-info text-white">
                  IPv4 ({classified.ipv4.length})
                </div>
                <div className="card-body py-2 overflow-auto user-select-text" style={{ maxHeight: 200 }}>
                  {classified.ipv4.length === 0 ? (
                    <span className="text-muted small">{t('blockdomi.none')}</span>
                  ) : (
                    renderList(classified.ipv4)
                  )}
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <div className="card h-100">
                <div className="card-header py-2 bg-secondary text-white">
                  IPv6 ({classified.ipv6.length})
                </div>
                <div className="card-body py-2 overflow-auto user-select-text" style={{ maxHeight: 200 }}>
                  {classified.ipv6.length === 0 ? (
                    <span className="text-muted small">{t('blockdomi.none')}</span>
                  ) : (
                    renderList(classified.ipv6)
                  )}
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <div className="card h-100">
                <div className="card-header py-2 bg-dark text-white">
                  {t('blockdomi.alreadyRegistered')} ({classified.jaCadastrados.length})
                </div>
                <div className="card-body py-2 overflow-auto user-select-text" style={{ maxHeight: 200 }}>
                  {classified.jaCadastrados.length === 0 ? (
                    <span className="text-muted small">{t('blockdomi.none')}</span>
                  ) : (
                    renderList(classified.jaCadastrados)
                  )}
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <div className="card h-100">
                <div className="card-header py-2 bg-danger text-white">
                  {t('blockdomi.invalid')} ({classified.invalidos.length})
                </div>
                <div className="card-body py-2 overflow-auto user-select-text" style={{ maxHeight: 200 }}>
                  {classified.invalidos.length === 0 ? (
                    <span className="text-muted small">{t('blockdomi.none')}</span>
                  ) : (
                    renderList(classified.invalidos)
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  );

  const handleCloseVisualizacaoExtrados = useCallback(() => {
    setVisualizacaoExtrados({ show: false, dominios: [], listaFiltrada: [], metadata: {} });
    setRawText('');
    setClassified(null);
    setLinkPlanilhaDominios('');
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
