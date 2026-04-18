import React, { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Agent } from 'types';
import DraggableModal from 'components/common/DraggableModal';
import { getSocketToken } from 'services/core';
import { authService } from 'services/authService';
import { logSshTerminalLatency } from 'utils/sshTerminalLatencyDebug';
import '@xterm/xterm/css/xterm.css';

interface AgentTerminalModalProps {
  show: boolean;
  onClose: () => void;
  agent: Agent;
  /** Se fornecido, o agente faz proxy SSH para esse host na sua rede interna */
  proxyHost?: string;
  proxyPort?: number;
  proxyUser?: string;
  proxyPassword?: string;
}

type TerminalStatus = 'connecting' | 'connected' | 'error' | 'closed';

function getSocketUrl(): string {
  if (process.env.NODE_ENV === 'development') return 'http://localhost:3001';
  return window.location.origin;
}

const AgentTerminalModal: React.FC<AgentTerminalModalProps> = ({
  show, onClose, agent, proxyHost, proxyPort, proxyUser, proxyPassword,
}) => {
  const termRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const statusRef = useRef<TerminalStatus>('connecting');

  const [status, setStatus] = useState<TerminalStatus>('connecting');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const setStatusBoth = (s: TerminalStatus) => {
    statusRef.current = s;
    setStatus(s);
  };

  useEffect(() => {
    if (!show) return;

    setStatusBoth('connecting');
    setErrorMsg(null);

    const timer = setTimeout(async () => {
      if (!termRef.current) return;

      const xterm = new Terminal({
        allowTransparency: false,
        cursorBlink: true,
        fontSize: 14,
        fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
        convertEol: true,
        theme: {
          background: '#0d1117',
          foreground: '#e6edf3',
          cursor: '#58a6ff',
          selectionBackground: '#264f78',
          black: '#484f58',
          red: '#ff7b72',
          green: '#3fb950',
          yellow: '#d29922',
          blue: '#58a6ff',
          magenta: '#bc8cff',
          cyan: '#39c5cf',
          white: '#b1bac4',
          brightBlack: '#6e7681',
          brightRed: '#ffa198',
          brightGreen: '#56d364',
          brightYellow: '#e3b341',
          brightBlue: '#79c0ff',
          brightMagenta: '#d2a8ff',
          brightCyan: '#56d4dd',
          brightWhite: '#f0f6fc',
        },
      });

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();
      xterm.loadAddon(fitAddon);
      xterm.loadAddon(webLinksAddon);
      xterm.open(termRef.current);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            fitAddon.fit();
          } catch {
            /* ignora */
          }
        });
      });
      xtermRef.current = xterm;
      fitAddonRef.current = fitAddon;

      const title = proxyHost
        ? `${agent.name} → ${proxyHost}`
        : agent.name;
      xterm.writeln(`\x1b[1;36m╔══════════════════════════════════════╗\x1b[0m`);
      xterm.writeln(`\x1b[1;36m║\x1b[0m  Backnet Agent Terminal               \x1b[1;36m║\x1b[0m`);
      xterm.writeln(`\x1b[1;36m║\x1b[0m  ${title.padEnd(36)}\x1b[1;36m║\x1b[0m`);
      xterm.writeln(`\x1b[1;36m╚══════════════════════════════════════╝\x1b[0m`);
      xterm.writeln('');

      let token = getSocketToken();
      if (!token) {
        xterm.writeln('\x1b[90mRecuperando sessão...\x1b[0m');
        token = await authService.restoreSocketToken();
      }
      if (!token) {
        xterm.writeln('\x1b[1;31m[Erro] Sessão expirada. Faça login novamente.\x1b[0m');
        setStatusBoth('error');
        setErrorMsg('Sessão expirada.');
        return;
      }

      xterm.writeln('\x1b[90mConectando ao agente...\x1b[0m');

      const socket = io(`${getSocketUrl()}/agent-terminal`, {
        path: '/socket.io',
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: false,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        if (process.env.REACT_APP_SSH_TERMINAL_LATENCY_DEBUG === 'true') {
          const tr = (socket as Socket & { io?: { engine?: { transport?: { name?: string } } } }).io
            ?.engine?.transport?.name;
          logSshTerminalLatency('[Agent terminal] Socket.IO transporte:', tr ?? '(indisponível)');
        }
        xterm.writeln('\x1b[90mSessão estabelecida, abrindo shell...\x1b[0m');
        const { cols, rows } = fitAddon.proposeDimensions() ?? { cols: 80, rows: 24 };
        socket.emit('terminal:create', {
          agentId: agent.id,
          cols, rows,
          ...(proxyHost ? { proxyHost, proxyPort, proxyUser, proxyPassword } : {}),
        });
      });

      socket.on('terminal:created', ({ sessionId }: { sessionId: string }) => {
        sessionIdRef.current = sessionId;
        setStatusBoth('connected');
        xterm.writeln('\x1b[32m● Conectado\x1b[0m\r\n');
      });

      socket.on('terminal:output', ({ data }: { data: string }) => {
        xterm.write(data);
      });

      socket.on('terminal:closed', ({ reason }: { reason: string }) => {
        if (statusRef.current === 'closed') return;
        setStatusBoth('closed');
        xterm.writeln(`\r\n\x1b[33m[Sessão encerrada: ${reason}]\x1b[0m`);
      });

      socket.on('terminal:error', ({ message }: { message: string }) => {
        setStatusBoth('error');
        setErrorMsg(message);
        xterm.writeln(`\r\n\x1b[1;31m[Erro] ${message}\x1b[0m`);
      });

      socket.on('connect_error', (err) => {
        setStatusBoth('error');
        setErrorMsg(err.message);
        xterm.writeln(`\r\n\x1b[1;31m[Erro de conexão] ${err.message}\x1b[0m`);
      });

      socket.on('disconnect', () => {
        if (statusRef.current === 'closed') return;
        setStatusBoth('closed');
        xterm.writeln('\r\n\x1b[33m[Desconectado do servidor]\x1b[0m');
      });

      let latencyInputCount = 0;
      let latencyWindowStart = performance.now();

      xterm.onData((data) => {
        if (sessionIdRef.current && statusRef.current === 'connected') {
          if (process.env.REACT_APP_SSH_TERMINAL_LATENCY_DEBUG === 'true') {
            latencyInputCount++;
            const now = performance.now();
            if (now - latencyWindowStart >= 3000) {
              logSshTerminalLatency('[Agent terminal] eventos onData (~3s):', latencyInputCount);
              latencyInputCount = 0;
              latencyWindowStart = now;
            }
          }
          socket.emit('terminal:input', { sessionId: sessionIdRef.current, data });
        }
      });

      const resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => {
          try {
            fitAddon.fit();
          } catch {
            /* ignora */
          }
          if (sessionIdRef.current && socketRef.current?.connected) {
            const dims = fitAddon.proposeDimensions();
            if (dims) {
              socket.emit('terminal:resize', {
                sessionId: sessionIdRef.current,
                cols: dims.cols,
                rows: dims.rows,
              });
            }
          }
        });
      });
      const container = termRef.current?.parentElement;
      if (container) resizeObserver.observe(container);

      return () => resizeObserver.disconnect();
    }, 200);

    return () => clearTimeout(timer);
  }, [show, agent.id, agent.name, proxyHost, proxyPort, proxyUser, proxyPassword]);

  useEffect(() => {
    if (!show) {
      if (sessionIdRef.current && socketRef.current?.connected) {
        socketRef.current.emit('terminal:close', { sessionId: sessionIdRef.current });
      }
      socketRef.current?.disconnect();
      socketRef.current = null;
      xtermRef.current?.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
      sessionIdRef.current = null;
      setStatusBoth('connecting');
      setErrorMsg(null);
    }
  }, [show]);

  const handleClose = useCallback(() => {
    if (sessionIdRef.current && socketRef.current?.connected) {
      socketRef.current.emit('terminal:close', { sessionId: sessionIdRef.current });
      sessionIdRef.current = null;
    }
    onClose();
  }, [onClose]);

  const statusBadge = {
    connecting: <span className="badge bg-secondary">Conectando...</span>,
    connected: <span className="badge bg-success">Conectado</span>,
    error: <span className="badge bg-danger">Erro</span>,
    closed: <span className="badge bg-warning text-dark">Encerrado</span>,
  }[status];

  const title = proxyHost
    ? `Terminal — ${agent.name} → ${proxyHost}`
    : `Terminal — ${agent.name}`;

  return (
    <DraggableModal
      show={show}
      onClose={handleClose}
      title={title}
      size="xl"
      modalId={`agent-terminal-${agent.id}`}
      className="no-padding"
      headerActions={<div className="ms-2">{statusBadge}</div>}
    >
      <div
        className="terminal-modal-dark"
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          background: '#0d1117',
          padding: '8px',
        }}
      >
        {errorMsg && status === 'error' && (
          <div className="alert alert-danger m-2 py-2 small flex-shrink-0">
            <i className="bi bi-exclamation-triangle-fill me-1" />
            {errorMsg}
          </div>
        )}
        <div
          ref={termRef}
          style={{ flex: 1, minHeight: 0, width: '100%', overflow: 'hidden' }}
        />
      </div>
    </DraggableModal>
  );
};

export default AgentTerminalModal;
