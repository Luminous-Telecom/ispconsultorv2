import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import DraggableModal from 'components/common/DraggableModal';
import { getSocketUrl } from 'components/common/terminal/constants';
import { DynamicProgressBar, Loading } from 'components/ui';
import { useI18n } from 'contexts/I18nContext';
import { authService } from 'services/authService';
import { getSocketToken } from 'services/core';
import type { TranslationKeys } from 'i18n/translationKeys';
import type {
  BaixarPdfsBlockdomiResult,
  CodigoMotivoBaixarPdf,
  MotivoBaixarPdf,
  OcorrenciaBaixarPdf,
  StatusBaixarPdfsBlockdomi,
} from 'services/dominioService';

type Traduzir = (key: keyof TranslationKeys, params?: Record<string, unknown>) => string;

function textoSemControle(texto: string): string {
  let limpo = '';
  for (const char of texto) {
    if (char.charCodeAt(0) >= 32) limpo += char;
  }
  return limpo;
}

const CODIGOS_MOTIVO_BAIXAR_PDF = new Set<CodigoMotivoBaixarPdf>([
  'http',
  'timeout',
  'link_invalido',
  'tamanho',
  'nao_pdf',
  'rede',
  'desconhecido',
]);

export function lerMotivoBaixarPdf(value: unknown): MotivoBaixarPdf | null {
  if (!value || typeof value !== 'object') return null;
  const motivo = value as { codigo?: unknown; detalhe?: unknown };
  if (typeof motivo.codigo !== 'string' || !CODIGOS_MOTIVO_BAIXAR_PDF.has(motivo.codigo as CodigoMotivoBaixarPdf)) {
    return null;
  }
  const codigo = motivo.codigo as CodigoMotivoBaixarPdf;
  const bruto = typeof motivo.detalhe === 'string' ? textoSemControle(motivo.detalhe).trim().slice(0, 120) : '';
  const detalhe = codigo === 'http' ? (/^\d{3}$/.test(bruto) ? bruto : null) : (bruto || null);
  if (codigo === 'http' && !detalhe) return null;
  return { codigo, detalhe };
}

function lerOcorrenciasBaixarPdf(value: unknown): OcorrenciaBaixarPdf[] {
  if (!Array.isArray(value)) return [];
  const saida: OcorrenciaBaixarPdf[] = [];
  for (const item of value) {
    const motivo = lerMotivoBaixarPdf(item);
    const quantidade = item && typeof item === 'object' ? (item as { quantidade?: unknown }).quantidade : null;
    if (!motivo || typeof quantidade !== 'number' || !Number.isFinite(quantidade) || quantidade <= 0) continue;
    saida.push({ ...motivo, quantidade });
  }
  return saida;
}

function lerResultadoBaixarPdf(value: unknown): BaixarPdfsBlockdomiResult | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Partial<BaixarPdfsBlockdomiResult>;
  return {
    pdfsBaixados: typeof data.pdfsBaixados === 'number' ? data.pdfsBaixados : 0,
    pdfsJaLocais: typeof data.pdfsJaLocais === 'number' ? data.pdfsJaLocais : 0,
    registrosAtualizados: typeof data.registrosAtualizados === 'number' ? data.registrosAtualizados : 0,
    falhas: typeof data.falhas === 'number' ? data.falhas : 0,
    ignoradosNaoPdf: typeof data.ignoradosNaoPdf === 'number' ? data.ignoradosNaoPdf : 0,
    ocorrencias: lerOcorrenciasBaixarPdf(data.ocorrencias),
  };
}

export function textoMotivoBaixarPdf(motivo: MotivoBaixarPdf, t: Traduzir): string {
  const base = motivo.codigo === 'http'
    ? t('blockdomi.downloadPdfsReasonHttp', { status: motivo.detalhe ?? '' })
    : motivo.codigo === 'timeout'
      ? t('blockdomi.downloadPdfsReasonTimeout')
      : motivo.codigo === 'link_invalido'
        ? t('blockdomi.downloadPdfsReasonInvalid')
        : motivo.codigo === 'tamanho'
          ? t('blockdomi.downloadPdfsReasonSize')
          : motivo.codigo === 'nao_pdf'
            ? t('blockdomi.downloadPdfsReasonNotPdf')
            : motivo.codigo === 'rede'
              ? t('blockdomi.downloadPdfsReasonNetwork')
              : t('blockdomi.downloadPdfsReasonUnknown');
  if (motivo.codigo !== 'http' && motivo.detalhe) {
    return t('blockdomi.downloadPdfsReasonDetail', { motivo: base, detalhe: motivo.detalhe });
  }
  return base;
}

export function percentualBaixarPdfs(status: StatusBaixarPdfsBlockdomi): number {
  if (status.estado === 'concluido' || status.estado === 'erro') return 100;
  const total = status.progresso?.total ?? 0;
  if (total <= 0) return 0;
  return Math.min(100, Math.round((status.progresso.processados / total) * 100));
}

export function lerStatusBaixarPdfs(body: unknown): StatusBaixarPdfsBlockdomi | null {
  if (!body || typeof body !== 'object') return null;
  const data = body as Partial<StatusBaixarPdfsBlockdomi>;
  if (data.estado !== 'ocioso' && data.estado !== 'executando' && data.estado !== 'concluido' && data.estado !== 'erro') {
    return null;
  }
  const progresso = data.progresso;
  if (!progresso || (progresso.fase !== 'lendo' && progresso.fase !== 'baixando')) return null;
  if (typeof progresso.total !== 'number' || typeof progresso.processados !== 'number') return null;
  return {
    estado: data.estado,
    resultado: lerResultadoBaixarPdf(data.resultado),
    erro: typeof data.erro === 'string' ? data.erro : null,
    progresso: {
      fase: progresso.fase,
      total: progresso.total,
      processados: progresso.processados,
      pdfsBaixados: progresso.pdfsBaixados ?? 0,
      pdfsJaLocais: progresso.pdfsJaLocais ?? 0,
      registrosAtualizados: progresso.registrosAtualizados ?? 0,
      falhas: progresso.falhas ?? 0,
      ignoradosNaoPdf: progresso.ignoradosNaoPdf ?? 0,
      atual: progresso.atual ?? null,
      motivo: lerMotivoBaixarPdf(progresso.motivo),
    },
  };
}

export function BlockdomiBaixarPdfsProgresso({
  status,
  avisoSocket = false,
}: {
  status: StatusBaixarPdfsBlockdomi | null;
  avisoSocket?: boolean;
}) {
  const { t } = useI18n();
  const painelRef = useRef<HTMLDivElement>(null);
  const [linhas, setLinhas] = useState<Array<{ url: string; motivo: MotivoBaixarPdf | null }>>([]);
  const percent = status ? percentualBaixarPdfs(status) : 0;
  const emAndamento = !status || status.estado === 'executando' || status.estado === 'ocioso';
  const lendo = !status || status.progresso.fase === 'lendo';
  const resultado = status?.resultado;

  useEffect(() => {
    const atual = status?.progresso.atual ?? null;
    if (!atual) return;
    const motivo = status?.progresso.motivo ?? null;
    setLinhas((prev) => {
      const ultima = prev[prev.length - 1];
      if (
        ultima
        && ultima.url === atual
        && ultima.motivo?.codigo === motivo?.codigo
        && (ultima.motivo?.detalhe ?? null) === (motivo?.detalhe ?? null)
      ) {
        return prev;
      }
      return [...prev, { url: atual, motivo }];
    });
  }, [status]);

  useEffect(() => {
    const painel = painelRef.current;
    if (!painel) return;
    painel.scrollTop = painel.scrollHeight;
  }, [linhas, status?.estado, status?.progresso.fase, avisoSocket]);

  return (
    <div className="form-modal-simple blockdomi-pdfs-progress">
      <div className="blockdomi-pdfs-progress__head">
        {emAndamento ? (
          <Loading
            variant="inline"
            size="lg"
            showMessage={false}
            message={t('blockdomi.downloadPdfsProgressTitle')}
          />
        ) : null}
        <div className="blockdomi-pdfs-progress__bar">
          <div className="blockdomi-pdfs-progress__bar-row">
            <div className="progress">
              <DynamicProgressBar percent={percent} />
            </div>
            <span className="blockdomi-pdfs-progress__percent">{`${percent}%`}</span>
          </div>
          {status && !lendo ? (
            <p className="blockdomi-pdfs-progress__count">
              {t('blockdomi.downloadPdfsProgress', {
                processados: String(status.progresso.processados),
                total: String(status.progresso.total),
              })}
            </p>
          ) : null}
        </div>
      </div>

      <div
        ref={painelRef}
        className="terminal-log-panel blockdomi-pdfs-progress__logs"
        role="log"
      >
        {lendo ? <div>{t('blockdomi.downloadPdfsReading')}</div> : null}
        {emAndamento && !lendo ? (
          <div className="terminal-log-line--info">{t('blockdomi.downloadPdfsStarted')}</div>
        ) : null}
        {linhas.map((linha, index) => (
          <div
            key={`${index}-${linha.url}`}
            className={linha.motivo ? 'terminal-log-line--danger' : undefined}
          >
            {linha.motivo
              ? t('blockdomi.downloadPdfsFailLine', {
                url: linha.url,
                motivo: textoMotivoBaixarPdf(linha.motivo, t),
              })
              : linha.url}
          </div>
        ))}
        {status?.estado === 'concluido' && resultado ? (
          <div className="terminal-log-line--success">
            {t('blockdomi.downloadPdfsDone', {
              baixados: String(resultado.pdfsBaixados),
              atualizados: String(resultado.registrosAtualizados),
              locais: String(resultado.pdfsJaLocais),
            })}
            {resultado.falhas > 0
              ? ` ${t('blockdomi.downloadPdfsPartial', { n: String(resultado.falhas) })}`
              : ''}
          </div>
        ) : null}
        {status?.estado === 'concluido'
          ? (resultado?.ocorrencias ?? []).map((item) => (
            <div key={`${item.codigo}-${item.detalhe ?? ''}`} className="terminal-log-line--danger">
              {t('blockdomi.downloadPdfsFailReason', {
                motivo: textoMotivoBaixarPdf(item, t),
                n: String(item.quantidade),
              })}
            </div>
          ))
          : null}
        {status?.estado === 'erro' ? (
          <div className="terminal-log-line--danger">{status.erro || t('blockdomi.downloadPdfsError')}</div>
        ) : null}
        {avisoSocket ? (
          <div className="terminal-log-line--muted">{t('blockdomi.downloadPdfsSocket')}</div>
        ) : null}
      </div>
    </div>
  );
}

interface BlockdomiBaixarPdfsModalProps {
  show: boolean;
  inicial: StatusBaixarPdfsBlockdomi | null;
  onClose: () => void;
  onFinished: (status: StatusBaixarPdfsBlockdomi) => void;
}

const BlockdomiBaixarPdfsModal: React.FC<BlockdomiBaixarPdfsModalProps> = ({
  show,
  inicial,
  onClose,
  onFinished,
}) => {
  const { t } = useI18n();
  const [status, setStatus] = useState<StatusBaixarPdfsBlockdomi | null>(inicial);
  const [semAcompanhamento, setSemAcompanhamento] = useState(false);
  const avisouRef = useRef(false);

  useEffect(() => {
    if (!show) return;
    setStatus(inicial);
    setSemAcompanhamento(false);
    avisouRef.current = false;
  }, [show, inicial]);

  useEffect(() => {
    if (!show || !status) return;
    if (status.estado !== 'concluido' && status.estado !== 'erro') return;
    if (avisouRef.current) return;
    avisouRef.current = true;
    onFinished(status);
  }, [show, status, onFinished]);

  useEffect(() => {
    if (!show) return undefined;
    let cancelled = false;
    let socket: Socket | null = null;

    const apply = (body: unknown) => {
      const recebido = lerStatusBaixarPdfs(body);
      if (!cancelled && recebido) setStatus(recebido);
    };

    const connect = async () => {
      let token = getSocketToken();
      if (!token) token = await authService.restoreSocketToken();
      if (cancelled || !token) {
        if (!cancelled) setSemAcompanhamento(true);
        return;
      }
      socket = io(getSocketUrl(), {
        path: '/socket.io',
        auth: { token },
        transports: ['polling', 'websocket'],
      });
      socket.on('connect', () => socket?.emit('subscribe-blockdomi-pdfs'));
      socket.on('blockdomi:pdfs', apply);
    };

    void connect();

    return () => {
      cancelled = true;
      socket?.off('blockdomi:pdfs', apply);
      socket?.disconnect();
    };
  }, [show]);

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={t('blockdomi.downloadPdfsProgressTitle')}
      size="md"
      modalId="blockdomi-baixar-pdfs-modal"
    >
      <BlockdomiBaixarPdfsProgresso status={status} avisoSocket={semAcompanhamento} />
    </DraggableModal>
  );
};

export default BlockdomiBaixarPdfsModal;
