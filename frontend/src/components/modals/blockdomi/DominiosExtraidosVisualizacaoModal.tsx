import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import DraggableModal from '@/components/common/DraggableModal';
import { Button } from '@/components/ui';
import {
  ClassifiedList,
  classifyLine,
  classifyLines
} from '@/components/modals/blockdomi/ImportarListaBlockdomiModal';
import { DominioService } from '@/services/dominioService';
import { IPv4Service } from '@/services/ipv4Service';
import { IPv6Service } from '@/services/ipv6Service';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { useI18n } from '@/contexts/I18nContext';

export interface DominiosExtraidosVisualizacaoMetadata {
  nomeOficio?: string;
  dataInicioBloqueio?: string;
  dataFimBloqueio?: string;
  linkOficioAnatel?: string;
  linkOficioJustica?: string;
  linkPlanilhaDominios?: string;
}

interface DominiosExtraidosVisualizacaoModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  dominiosExtraidos: string[];
  listaFiltrada?: string[];
  metadata?: DominiosExtraidosVisualizacaoMetadata;
}

const DominiosExtraidosVisualizacaoModal: React.FC<DominiosExtraidosVisualizacaoModalProps> = ({
  show,
  onClose,
  onSuccess,
  dominiosExtraidos,
  listaFiltrada = [],
  metadata = {}
}) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();
  const [classified, setClassified] = useState<ClassifiedList | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCadastrando, setIsCadastrando] = useState(false);
  const [nomeOficio, setNomeOficio] = useState(metadata.nomeOficio ?? '');
  const [dataInicioBloqueio, setDataInicioBloqueio] = useState(metadata.dataInicioBloqueio ?? '');
  const [dataFimBloqueio, setDataFimBloqueio] = useState(metadata.dataFimBloqueio ?? '');
  const [linkOficioAnatel, setLinkOficioAnatel] = useState(metadata.linkOficioAnatel ?? '');
  const [linkOficioJustica, setLinkOficioJustica] = useState(metadata.linkOficioJustica ?? '');
  const [linkPlanilhaDominios, setLinkPlanilhaDominios] = useState(metadata.linkPlanilhaDominios ?? '');

  useEffect(() => {
    if (!show) return;
    setClassified(null);
    setIsAnalyzing(false);
    setIsCadastrando(false);
    setNomeOficio(metadata.nomeOficio ?? '');
    setDataInicioBloqueio(metadata.dataInicioBloqueio ?? '');
    setDataFimBloqueio(metadata.dataFimBloqueio ?? '');
    setLinkOficioAnatel(metadata.linkOficioAnatel ?? '');
    setLinkOficioJustica(metadata.linkOficioJustica ?? '');
    setLinkPlanilhaDominios(metadata.linkPlanilhaDominios ?? '');
  }, [show, metadata.nomeOficio, metadata.dataInicioBloqueio, metadata.dataFimBloqueio, metadata.linkOficioAnatel, metadata.linkOficioJustica, metadata.linkPlanilhaDominios]);

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
    if (dominiosExtraidos.length === 0) return;
    setIsAnalyzing(true);
    setClassified(null);
    try {
      const rawText = dominiosExtraidos.join('\n');
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
  }, [dominiosExtraidos, fetchExisting, error]);

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
      const meta = {
        nome_oficio: nomeOficioVal,
        data_inicio_bloqueio: dataInicioVal,
        data_fim_bloqueio: dataFimVal,
        link_oficio_anatel: linkAnatelVal,
        link_oficio_justica: linkJusticaVal,
        link_planilha_dominios: linkPlanilhaVal
      };
      const emptyBulk = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };
      const [domRes, ipv4Res, ipv6Res] = await Promise.all([
        classified.dominios.length > 0 ? DominioService.bulkCreate(({ items: classified.dominios, ...meta })) : Promise.resolve(emptyBulk),
        classified.ipv4.length > 0 ? IPv4Service.bulkCreate(({ items: classified.ipv4, ...meta })) : Promise.resolve(emptyBulk),
        classified.ipv6.length > 0 ? IPv6Service.bulkCreate(({ items: classified.ipv6, ...meta })) : Promise.resolve(emptyBulk)
      ]);
      const errs = [...domRes.errors, ...ipv4Res.errors, ...ipv6Res.errors];
      const parts: string[] = [];
      if (domRes.created + domRes.updated > 0) parts.push(`Domínios: ${domRes.created} criado(s), ${domRes.updated} atualizado(s)`);
      if (ipv4Res.created + ipv4Res.updated > 0) parts.push(`IPv4: ${ipv4Res.created} criado(s), ${ipv4Res.updated} atualizado(s)`);
      if (ipv6Res.created + ipv6Res.updated > 0) parts.push(`IPv6: ${ipv6Res.created} criado(s), ${ipv6Res.updated} atualizado(s)`);
      const skipTotal = domRes.skipped + ipv4Res.skipped + ipv6Res.skipped;
      if (skipTotal > 0) parts.push(`${t('blockdomi.alreadyRegisteredIgnored')}: ${skipTotal}`);
      if (classified!.invalidos.length > 0) parts.push(`Inválidos: ${classified!.invalidos.length}`);
      success(parts.length > 0 ? parts.join('. ') + '.' : 'Importação concluída.');
      if (errs.length > 0) {
        error(errs.slice(0, 3).join('; ') + (errs.length > 3 ? ` e mais ${errs.length - 3} erro(s).` : ''));
      }
      queryClient.invalidateQueries({ queryKey: ['dominios'] });
      queryClient.invalidateQueries({ queryKey: ['ipv4'] });
      queryClient.invalidateQueries({ queryKey: ['ipv6'] });
      onSuccess?.();
      onClose();
    } catch (e) {
      error((e as Error)?.message ?? 'Erro ao cadastrar.');
    } finally {
      setIsCadastrando(false);
    }
  }, [classified, totalValid, nomeOficio, dataInicioBloqueio, dataFimBloqueio, linkOficioAnatel, linkOficioJustica, linkPlanilhaDominios, success, error, onSuccess, onClose, queryClient, t]);

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

  const renderList = (items: string[]) => (
    <ul className="list-unstyled mb-0 small">
      {items.map((item, i) => (
        <li key={i} className="text-nowrap overflow-x-auto" style={{ minHeight: '1.5em' }}>
          {item}
        </li>
      ))}
    </ul>
  );

  const totalBruto = dominiosExtraidos.length;

  // Bruto: exatamente como está na planilha
  // Filtrados: domínios que precisam de conserto, com antes/depois (ex: Teste.com/teste > teste.com)
  const dominiosFiltrados = useMemo(() => {
    const seen = new Set<string>();
    const result: { raw: string; fixed: string }[] = [];
    for (const line of dominiosExtraidos) {
      const trimmed = line.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);

      const { type, value } = classifyLine(trimmed);
      if (type === 'invalido') continue;

      // Forma final: valor já sanitizado (mantém path; não tratar path como "filtro")
      const formaFinal = value;

      if (trimmed !== formaFinal) result.push({ raw: trimmed, fixed: formaFinal });
    }
    return result;
  }, [dominiosExtraidos]);

  // Válidos: domínios já corrigidos (hostname só, sem path - ex: teste.com)
  const dominiosValidos = useMemo(() => {
    const normalizar = (s: string) => (s.includes('/') ? s.split('/')[0] : s);
    if (classified) {
      const dominiosNorm = classified.dominios.map(normalizar);
      const todos = [...dominiosNorm, ...classified.ipv4, ...classified.ipv6];
      const seen = new Set<string>();
      return todos.filter((x) => {
        if (seen.has(x)) return false;
        seen.add(x);
        return true;
      });
    }
    return listaFiltrada.map(normalizar).filter((x, i, arr) => arr.indexOf(x) === i);
  }, [classified, listaFiltrada]);

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={t('blockdomi.titleVisualizacaoExtrados')}
      size="xl"
    >
      <div className="p-4 dominios-extraidos-visualizacao">
        <div className="row g-3 dev-preview-cards">
          <div className="col-12 col-md-4">
            <div className="card h-100 dev-preview-card dev-card-raw">
              <div className="card-header py-2 d-flex justify-content-between align-items-center">
                <strong>{t('blockdomi.raw')}</strong>
                <span className="badge bg-secondary">{totalBruto}</span>
              </div>
              <div className="card-body py-2 overflow-auto user-select-text" style={{ maxHeight: 280 }}>
                {totalBruto === 0 ? (
                  <span className="text-muted small">{t('blockdomi.none')}</span>
                ) : (
                  renderList(dominiosExtraidos)
                )}
              </div>
              <div className="card-footer py-2">
                <Button
                  type="button"
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => handleCopy(dominiosExtraidos)}
                  disabled={totalBruto === 0}
                >
                  {t('buttons.copy')}
                </Button>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="card h-100 dev-preview-card dev-card-filtered">
              <div className="card-header py-2 d-flex justify-content-between align-items-center">
                <strong>{t('blockdomi.filtered')}</strong>
                <span className="badge bg-dark">{dominiosFiltrados.length}</span>
              </div>
              <div className="card-body py-2 overflow-auto user-select-text" style={{ maxHeight: 280 }}>
                {dominiosFiltrados.length === 0 ? (
                  <span className="text-muted small">{t('blockdomi.none')}</span>
                ) : (
                  <ul className="list-unstyled mb-0 small">
                    {dominiosFiltrados.map((item, i) => (
                      <li key={i} className="text-nowrap overflow-x-auto" style={{ minHeight: '1.5em' }}>
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
            <div className="card h-100 dev-preview-card dev-card-valid">
              <div className="card-header py-2 d-flex justify-content-between align-items-center">
                <strong>{t('blockdomi.valid')}</strong>
                {(dominiosValidos.length > 0) && <span className="badge bg-light text-dark">{dominiosValidos.length}</span>}
                {isAnalyzing && <span className="badge bg-warning text-dark">{t('blockdomi.classifying')}</span>}
              </div>
              <div className="card-body py-2 overflow-auto user-select-text" style={{ maxHeight: 280 }}>
                {isAnalyzing ? (
                  <p className="text-muted small mb-0">{t('blockdomi.classifying')}</p>
                ) : dominiosValidos.length === 0 ? (
                  <span className="text-muted small">{t('blockdomi.none')}</span>
                ) : (
                  renderList(dominiosValidos)
                )}
              </div>
              <div className="card-footer py-2 d-flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleAnalisar}
                  disabled={totalBruto === 0 || isAnalyzing}
                >
                  {t('blockdomi.analyze')}
                </Button>
                <Button
                  type="button"
                  variant="primary"
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

        {classified && !isAnalyzing && (
          <>
            <div className="row g-3 mb-3 dev-metadata-section">
              <div className="col-12">
                <label className="form-label small mb-1">{t('blockdomi.nomeOficioOptional')}</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder={t('blockdomi.placeholderOficio')}
                  value={nomeOficio}
                  onChange={(e) => setNomeOficio(e.target.value)}
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
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="https://..."
                  value={linkOficioJustica}
                  onChange={(e) => setLinkOficioJustica(e.target.value)}
                />
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
            </div>

            <div className="row g-3 mb-3 dev-class-cards">
              <div className="col-12 col-md-6 col-lg-4">
                <div className="card h-100 dev-class-card">
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
              <div className="col-12 col-md-6 col-lg-4">
                <div className="card h-100 dev-class-card">
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
              <div className="col-12 col-md-6 col-lg-4">
                <div className="card h-100 dev-class-card">
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
              <div className="col-12 col-md-6 col-lg-4">
                <div className="card h-100 dev-class-card">
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
              <div className="col-12 col-md-6 col-lg-4">
                <div className="card h-100 dev-class-card">
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
              <div className="col-12 col-md-6 col-lg-4">
                <div className="card h-100 dev-class-card">
                  <div className="card-header py-2 bg-warning text-dark">
                    {t('blockdomi.duplicates')} ({classified.duplicados.length})
                  </div>
                  <div className="card-body py-2 overflow-auto user-select-text" style={{ maxHeight: 200 }}>
                    {classified.duplicados.length === 0 ? (
                      <span className="text-muted small">{t('blockdomi.none')}</span>
                    ) : (
                      renderList(classified.duplicados)
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="d-flex gap-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleCadastrar}
                disabled={totalValid === 0 || isCadastrando}
              >
                {t('blockdomi.register')}
              </Button>
            </div>
          </>
        )}
      </div>
    </DraggableModal>
  );
};

export default DominiosExtraidosVisualizacaoModal;
