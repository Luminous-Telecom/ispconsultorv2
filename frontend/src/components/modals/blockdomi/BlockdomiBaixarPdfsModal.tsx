import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import DraggableModal from 'components/common/DraggableModal';
import { getSocketUrl } from 'components/common/terminal/constants';
import { DynamicProgressBar, FecharButton, Loading } from 'components/ui';
import { useI18n } from 'contexts/I18nContext';
import { authService } from 'services/authService';
import { getSocketToken } from 'services/core';
import type { StatusBaixarPdfsBlockdomi } from 'services/dominioService';

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
    resultado: data.resultado ?? null,
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
    },
  };
}

export function BlockdomiBaixarPdfsProgresso({
  status,
  onClose,
}: {
  status: StatusBaixarPdfsBlockdomi | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const percent = status ? percentualBaixarPdfs(status) : 0;
  const emAndamento = !status || status.estado === 'executando' || status.estado === 'ocioso';
  const lendo = !status || status.progresso.fase === 'lendo';
  const resultado = status?.resultado;

  return (
    <div className="form-modal-simple">
      {emAndamento && lendo ? (
        <Loading variant="inline" message={t('blockdomi.downloadPdfsReading')} />
      ) : null}

      {status && !lendo ? (
        <div className="mb-3">
          <div className="progress">
            <DynamicProgressBar percent={percent}>{`${percent}%`}</DynamicProgressBar>
          </div>
          <p className="mb-1 mt-2">
            {t('blockdomi.downloadPdfsProgress', {
              processados: String(status.progresso.processados),
              total: String(status.progresso.total),
            })}
          </p>
          {status.progresso.atual ? <p className="mb-0 text-break">{status.progresso.atual}</p> : null}
        </div>
      ) : null}

      {status?.estado === 'concluido' && resultado ? (
        <p className="mb-3">
          {t('blockdomi.downloadPdfsDone', {
            baixados: String(resultado.pdfsBaixados),
            atualizados: String(resultado.registrosAtualizados),
            locais: String(resultado.pdfsJaLocais),
          })}
          {resultado.falhas > 0
            ? ` ${t('blockdomi.downloadPdfsPartial', { n: String(resultado.falhas) })}`
            : ''}
        </p>
      ) : null}

      {emAndamento && !lendo ? <p className="mb-3">{t('blockdomi.downloadPdfsStarted')}</p> : null}

      {status?.estado === 'erro' ? (
        <p className="mb-3">{status.erro || t('blockdomi.downloadPdfsError')}</p>
      ) : null}

      <FecharButton type="button" onClick={onClose} />
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
      <BlockdomiBaixarPdfsProgresso status={status} onClose={onClose} />
      {semAcompanhamento ? <p className="form-modal-simple mb-0">{t('blockdomi.downloadPdfsSocket')}</p> : null}
    </DraggableModal>
  );
};

export default BlockdomiBaixarPdfsModal;
