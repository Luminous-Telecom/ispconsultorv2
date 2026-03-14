import React, { useRef, useEffect, useState, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { useBlockdomiLogs } from '@/hooks/useBlockdomiLogs';
import { useI18n } from '@/contexts/I18nContext';
import DraggableModal from '@/components/common/DraggableModal';
import SearchBar from '@/components/ui/SearchBar';
import { getSocketToken } from '@/services/core';
import type { BlockdomiLogAcessoItem } from '@/services/blockdomiLogAcessoService';

const INITIAL_LIMIT = 80;

/** Em dev conecta direto ao backend (porta 3001) para evitar proxy não repassar auth do Socket.IO. */
function getSocketUrl(): string {
  if (typeof window === 'undefined') return '';
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3001';
  }
  return window.location.origin;
}

interface BlockdomiLogsRealModalProps {
  show: boolean;
  onClose: () => void;
}

function formatLogLine(item: BlockdomiLogAcessoItem): string {
  const time = item.created_at_formatada ?? item.created_at ?? '-';
  const ip = item.ip ?? '-';
  const status = item.status_http ?? '-';
  const ok = item.sucesso ? 'OK' : 'ERRO';
  const msg = item.mensagem_erro ? ` | ${item.mensagem_erro}` : '';
  return `[${time}] ${ip} | ${item.metodo} ${item.rota} | ${status} ${ok}${msg}`;
}

function matchesSearch(item: BlockdomiLogAcessoItem, q: string): boolean {
  if (!q.trim()) return true;
  const lower = q.toLowerCase();
  const ip = (item.ip ?? '').toLowerCase();
  const rota = (item.rota ?? '').toLowerCase();
  const metodo = (item.metodo ?? '').toLowerCase();
  const msg = (item.mensagem_erro ?? '').toLowerCase();
  const status = String(item.status_http ?? '').toLowerCase();
  const time = (item.created_at_formatada ?? item.created_at ?? '').toString().toLowerCase();
  return ip.includes(lower) || rota.includes(lower) || metodo.includes(lower) ||
    msg.includes(lower) || status.includes(lower) || time.includes(lower);
}

const BlockdomiLogsRealModal: React.FC<BlockdomiLogsRealModalProps> = ({ show, onClose }) => {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const initialLoadedRef = useRef(false);
  const [lines, setLines] = useState<BlockdomiLogAcessoItem[]>([]);
  const [search, setSearch] = useState('');

  const { data: logsData, isLoading } = useBlockdomiLogs(
    { limit: INITIAL_LIMIT, page: 1, sortColumn: 'id', sortDirection: 'desc' },
    { enabled: show }
  );

  const filteredLines = useMemo(
    () => lines.filter((item) => matchesSearch(item, search)),
    [lines, search]
  );

  useEffect(() => {
    if (!show) {
      initialLoadedRef.current = false;
      setLines([]);
      setSearch('');
      return;
    }
    if (initialLoadedRef.current || !logsData?.data?.length) return;
    initialLoadedRef.current = true;
    setLines([...logsData.data].reverse());
  }, [show, logsData?.data]);

  useEffect(() => {
    if (!show) return;
    const token = getSocketToken();
    if (!token) return;
    let socket: Socket | null = null;
    const timer = setTimeout(() => {
      socket = io(getSocketUrl(), {
        path: '/socket.io',
        auth: { token },
        transports: ['polling', 'websocket']
      });
      socket.on('connect', () => socket?.emit('subscribe-blockdomi-logs'));
      socket.on('blockdomi:log', (log: BlockdomiLogAcessoItem) => {
        setLines((prev) => [...prev, log]);
      });
    }, 150);
    return () => {
      clearTimeout(timer);
      if (socket) {
        socket.off('blockdomi:log');
        socket.disconnect();
      }
    };
  }, [show]);

  useEffect(() => {
    if (!containerRef.current || !show) return;
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [filteredLines.length, show]);

  const title = t('blockdomi.logsReal');

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={title}
      size="xl"
      modalId="blockdomi-logs-real-modal"
    >
      <div className="p-3 d-flex flex-column gap-2" style={{ minHeight: 0, flex: 1 }}>
        <SearchBar
          id="blockdomi-logs-real-search"
          variant="table"
          value={search}
          onChange={setSearch}
          onSearch={setSearch}
          placeholder={t('layout.searchPlaceholder')}
          searchFields={[]}
          className="flex-shrink-0"
        />
        <div
          ref={containerRef}
          className="p-3 rounded bg-dark text-light"
          style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: '13px',
            minHeight: '300px',
            flex: 1,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all'
          }}
        >
        {isLoading && lines.length === 0 && (
          <span className="text-info">{t('ui.loading')}...</span>
        )}
        {lines.length === 0 && !isLoading && (
          <span className="text-muted">{t('blockdomi.logsEmpty')}</span>
        )}
        {filteredLines.map((item) => (
          <div
            key={item.id}
            className={item.sucesso ? 'text-success' : 'text-danger'}
            style={{ lineHeight: 1.5 }}
          >
            {formatLogLine(item)}
          </div>
        ))}
        </div>
      </div>
    </DraggableModal>
  );
};

export default BlockdomiLogsRealModal;
