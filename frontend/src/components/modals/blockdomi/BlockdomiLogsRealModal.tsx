import React, { useRef, useEffect, useState, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { useBlockdomiLogs } from 'hooks/useBlockdomiLogs';
import { useI18n } from 'contexts/I18nContext';
import DraggableModal from 'components/common/DraggableModal';
import SearchBar from 'components/ui/SearchBar';
import { Loading } from 'components/ui';
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
  const status = item.em_andamento && item.status_http == null ? '…' : (item.status_http ?? '-');
  const estado = item.status_http === 200
    ? 'OK'
    : item.em_andamento && item.status_http == null
      ? 'em andamento'
      : 'ERRO';
  const duracao = item.duracao_ms != null ? ` | ${item.duracao_ms} ms` : '';
  const msg = item.mensagem_erro ? ` | ${item.mensagem_erro}` : '';
  return `[${time}] ${ip} | ${item.metodo} ${item.rota} | ${status} ${estado}${duracao}${msg}`;
}

function getBlockdomiLogLineClass(item: BlockdomiLogAcessoItem): string {
  if (item.status_http === 200) return 'terminal-log-line--success';
  if (item.em_andamento && item.status_http == null) return 'terminal-log-line--info';
  return 'terminal-log-line--danger';
}

function matchesSearch(item: BlockdomiLogAcessoItem, q: string, field?: string): boolean {
  if (!q.trim()) return true;
  const lower = q.toLowerCase();
  const getVal = (f: string) => {
    if (f === 'id') return String(item.id ?? '').toLowerCase();
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
  const [searchField, setSearchField] = useState('ip');

  const { data: logsData, isLoading } = useBlockdomiLogs(
    { limit: INITIAL_LIMIT, page: 1, sortColumn: 'id', sortDirection: 'desc' },
    { enabled: show }
  );

  const filteredLines = useMemo(
    () => lines.filter((item) => matchesSearch(item, search, searchField || 'ip')),
    [lines, search, searchField]
  );

  useEffect(() => {
    if (!show) {
      initialLoadedRef.current = false;
      setLines([]);
      setSearch('');
      setSearchField('ip');
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
        transports: ['polling', 'websocket'],
      });
      socket.on('connect', () => socket?.emit('subscribe-blockdomi-logs'));
      socket.on('blockdomi:log', (log: BlockdomiLogAcessoItem) => {
        setLines((prev) => {
          const index = prev.findIndex((line) => line.id === log.id);
          if (index === -1) return [...prev, log];
          const next = [...prev];
          next[index] = log;
          return next;
        });
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

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={t('blockdomi.logsReal')}
      size="xl"
      modalId="blockdomi-logs-real-modal"
      className="no-padding list-modal-no-body-scroll"
    >
      <div className="logs-real-layout">
        <div className="border-bottom table-header-custom">
          <div className="table-pagination-header">
            <div className="table-pagination-header__start">
              <SearchBar
                id="blockdomi-logs-real-search"
                variant="table"
                value={search}
                onChange={setSearch}
                onSearch={setSearch}
                onSearchFieldChange={setSearchField}
                placeholder={t('layout.searchPlaceholder')}
                searchField={searchField}
                searchFields={[
                  { key: 'id', label: t('table.id') },
                  { key: 'ip', label: t('blockdomi.logsIp') },
                  { key: 'rota', label: t('blockdomi.logsRota') },
                  { key: 'mensagem_erro', label: t('blockdomi.logsMensagemErro') },
                ]}
                autoComplete="off"
              />
            </div>
          </div>
        </div>
        <div ref={containerRef} className="terminal-log-panel logs-real-layout__panel">
          {isLoading && lines.length === 0 ? (
            <Loading variant="inline" size="sm" />
          ) : null}
          {lines.length === 0 && !isLoading ? (
            <span className="terminal-log-line--muted">{t('blockdomi.logsEmpty')}</span>
          ) : null}
          {filteredLines.map((item) => (
            <div key={item.id} className={`logs-real-layout__line ${getBlockdomiLogLineClass(item)}`}>
              {formatLogLine(item)}
            </div>
          ))}
        </div>
      </div>
    </DraggableModal>
  );
};

export default BlockdomiLogsRealModal;
