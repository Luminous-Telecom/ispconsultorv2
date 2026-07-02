import React, { useRef, useEffect, useState, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { useBlockdomiLogs } from 'hooks/useBlockdomiLogs';
import { useI18n } from 'contexts/I18nContext';
import DraggableModal from 'components/common/DraggableModal';
import SearchBar from 'components/ui/SearchBar';
import { getSocketToken } from 'services/core';
import type { BlockdomiLogAcessoItem } from 'services/blockdomiLogAcessoService';

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

function matchesSearch(item: BlockdomiLogAcessoItem, q: string, field?: string): boolean {
  if (!q.trim()) return true;
  const lower = q.toLowerCase();
  const getVal = (f: string) => {
    if (f === 'ip') return (item.ip ?? '').toLowerCase();
    if (f === 'rota') return (item.rota ?? '').toLowerCase();
    if (f === 'metodo') return (item.metodo ?? '').toLowerCase();
    if (f === 'mensagem_erro') return (item.mensagem_erro ?? '').toLowerCase();
    if (f === 'status_http') return String(item.status_http ?? '').toLowerCase();
    if (f === 'created_at') return (item.created_at_formatada ?? item.created_at ?? '').toString().toLowerCase();
    return '';
  };
  if (field) return getVal(field).includes(lower);
  return ['ip', 'rota', 'metodo', 'mensagem_erro', 'status_http', 'created_at'].some((f) => getVal(f).includes(lower));
}

const BlockdomiLogsRealModal: React.FC<BlockdomiLogsRealModalProps> = ({ show, onClose }) => {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const initialLoadedRef = useRef(false);
  const [lines, setLines] = useState<BlockdomiLogAcessoItem[]>([]);
  const [search, setSearch] = useState('');
  const [searchField, setSearchField] = useState('');

  const { data: logsData, isLoading } = useBlockdomiLogs(
    { limit: INITIAL_LIMIT, page: 1, sortColumn: 'id', sortDirection: 'desc' },
    { enabled: show }
  );

  const filteredLines = useMemo(
    () => lines.filter((item) => matchesSearch(item, search, searchField || undefined)),
    [lines, search, searchField]
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
      <div className="form-modal-simple p-3 flex-fill-min-h-0">
        <div className="row g-2 mb-2">
          <div className="col-12">
            <SearchBar
              id="blockdomi-logs-real-search"
              variant="table"
              value={search}
              onChange={setSearch}
              onSearch={setSearch}
              onSearchFieldChange={setSearchField}
              placeholder={t('layout.searchPlaceholder')}
              searchField={searchField || 'ip'}
              searchFields={[
                { key: 'ip', label: t('blockdomi.logsIp') },
                { key: 'rota', label: t('blockdomi.logsRota') },
                { key: 'metodo', label: t('blockdomi.logsMetodo') },
                { key: 'mensagem_erro', label: t('blockdomi.logsMensagemErro') },
                { key: 'status_http', label: t('blockdomi.logsStatus') },
              ]}
            />
          </div>
        </div>
        <div ref={containerRef} className="p-3 rounded bg-dark text-light blockdomi-logs-panel">
        {isLoading && lines.length === 0 && (
          <span className="text-info">{t('ui.loading')}...</span>
        )}
        {lines.length === 0 && !isLoading && (
          <span className="text-muted">{t('blockdomi.logsEmpty')}</span>
        )}
        {filteredLines.map((item) => (
          <div
            key={item.id}
            className={`${item.sucesso ? 'text-success' : 'text-danger'} lh-15`}
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
