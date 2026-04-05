import React, { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SshDevice } from 'types';
import DraggableModal from 'components/common/DraggableModal';
import { getSocketToken } from 'services/core';
import { authService } from 'services/authService';
import '@xterm/xterm/css/xterm.css';

interface SshTerminalModalProps {
  show: boolean;
  onClose: () => void;
  device: SshDevice;
}

type TerminalStatus = 'connecting' | 'connected' | 'error' | 'closed';

function getSocketUrl(): string {
  if (process.env.NODE_ENV === 'development') return 'http://localhost:3001';
  return window.location.origin;
}

const SshTerminalModal: React.FC<SshTerminalModalProps> = ({ show, onClose, device }) => {
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

    // Aguarda 200ms para garantir que o DOM da modal está pronto
    const timer = setTimeout(async () => {
      if (!termRef.current) return;

      // ── Inicializa xterm ──────────────────────────────────────────────────
      const xterm = new Terminal({
        allowTransparency: false,
        theme: {
          background: '#0d1117',
          foreground: '#c9d1d9',
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
        fontSize: 13,
        fontFamily: '"Cascadia Code", "Fira Code", "Courier New", monospace',
        cursorBlink: true,
        scrollback: 5000,
        convertEol: true,
      });

      const fitAddon = new FitAddon();
      xterm.loadAddon(fitAddon);
      xterm.loadAddon(new WebLinksAddon());
      xterm.open(termRef.current);
      // Aguarda o layout renderizar antes de fit
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try { fitAddon.fit(); } catch { /* ignora */ }
        });
      });

      xtermRef.current = xterm;
      fitAddonRef.current = fitAddon;

      xterm.writeln('\x1b[1;34m╔═══════════════════════════════════════╗\x1b[0m');
      xterm.writeln(`\x1b[1;34m║  Equipamentos — Backnet                  ║\x1b[0m`);
      xterm.writeln(`\x1b[1;34m║  Device: \x1b[1;37m${device.name.slice(0, 28).padEnd(28)}\x1b[1;34m ║\x1b[0m`);
      xterm.writeln('\x1b[1;34m╚═══════════════════════════════════════╝\x1b[0m');
      xterm.writeln('');
      const useAgent = !!device.agent_id;
      const nsLabel = useAgent ? '/agent-terminal (via agente)' : '/ssh-terminal (direto)';
      xterm.writeln(`\x1b[90mConectando ao namespace ${nsLabel}...\x1b[0m`);

      // ── Token — tenta memória primeiro, depois recupera do servidor ────────
      let token = getSocketToken();
      if (!token) {
        xterm.writeln('\x1b[90mToken não encontrado em memória, recuperando do servidor...\x1b[0m');
        token = await authService.restoreSocketToken();
      }
      if (!token) {
        xterm.writeln('\x1b[1;31m[Erro] Sessão expirada. Faça login novamente.\x1b[0m');
        setStatusBoth('error');
        setErrorMsg('Sessão expirada. Faça login novamente.');
        return;
      }

      // ── Socket.IO — namespace conforme agent_id ───────────────────────────
      const namespace = useAgent ? '/agent-terminal' : '/ssh-terminal';
      const socket = io(`${getSocketUrl()}${namespace}`, {
        path: '/socket.io',
        auth: { token },
        transports: ['polling', 'websocket'],
        reconnection: false,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        if (process.env.REACT_APP_SSH_TERMINAL_LATENCY_DEBUG === 'true') {
          const tr = (socket as Socket & { io?: { engine?: { transport?: { name?: string } } } }).io
            ?.engine?.transport?.name;
          console.info('[SSH terminal] Socket.IO transporte:', tr ?? '(indisponível)');
        }
        xterm.writeln('\x1b[90mSocket conectado. Abrindo shell...\x1b[0m');
        if (useAgent) {
          // Proxy SSH via agente — backend descriptografa credenciais
          socket.emit('terminal:create:device', { deviceId: device.id });
        } else {
          // Conexão direta (sem agente)
          socket.emit('terminal:create', { deviceId: device.id });
        }
      });

      socket.on('terminal:created', ({ sessionId }: { sessionId: string }) => {
        sessionIdRef.current = sessionId;
        setStatusBoth('connected');
        xterm.writeln('\x1b[1;32m✓ Sessão iniciada.\x1b[0m\r\n');

        let latencyInputCount = 0;
        let latencyWindowStart = performance.now();

        xterm.onData((data) => {
          if (process.env.REACT_APP_SSH_TERMINAL_LATENCY_DEBUG === 'true') {
            latencyInputCount++;
            const now = performance.now();
            if (now - latencyWindowStart >= 3000) {
              console.info('[SSH terminal] eventos onData (~3s):', latencyInputCount);
              latencyInputCount = 0;
              latencyWindowStart = now;
            }
          }
          socket.emit('terminal:input', { sessionId, data });
        });

        xterm.onResize(({ cols, rows }) => {
          socket.emit('terminal:resize', { sessionId, cols, rows });
        });
      });

      socket.on('terminal:output', ({ data }: { data: string }) => {
        xterm.write(data);
      });

      socket.on('terminal:closed', ({ reason }: { reason: string }) => {
        xterm.writeln(`\r\n\x1b[1;33m[Sessão encerrada: ${reason}]\x1b[0m`);
        setStatusBoth('closed');
      });

      socket.on('terminal:error', ({ message }: { message: string }) => {
        xterm.writeln(`\r\n\x1b[1;31m[Erro: ${message}]\x1b[0m`);
        setStatusBoth('error');
        setErrorMsg(message);
      });

      socket.on('connect_error', (err) => {
        xterm.writeln(`\r\n\x1b[1;31m[Erro de conexão: ${err.message}]\x1b[0m`);
        setStatusBoth('error');
        setErrorMsg(err.message);
      });

      socket.on('disconnect', (reason) => {
        if (statusRef.current !== 'closed') {
          xterm.writeln(`\r\n\x1b[1;33m[Desconectado: ${reason}]\x1b[0m`);
          setStatusBoth('closed');
        }
      });

      // ── ResizeObserver — observa o container pai (que muda de tamanho com o modal)
      const resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => {
          try { fitAddon.fit(); } catch { /* ignora */ }
        });
      });
      const container = termRef.current?.parentElement;
      if (container) resizeObserver.observe(container);

      // ── Cleanup ───────────────────────────────────────────────────────────
      return () => {
        resizeObserver.disconnect();
        if (sessionIdRef.current) {
          socket.emit('terminal:close', { sessionId: sessionIdRef.current });
          sessionIdRef.current = null;
        }
        socket.disconnect();
        socketRef.current = null;
        xterm.dispose();
        xtermRef.current = null;
        fitAddonRef.current = null;
      };
    }, 200);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, device.id]);

  const handleClose = useCallback(() => {
    if (sessionIdRef.current && socketRef.current) {
      socketRef.current.emit('terminal:close', { sessionId: sessionIdRef.current });
      sessionIdRef.current = null;
    }
    onClose();
  }, [onClose]);

  const statusBadge = {
    connecting: <span className="badge bg-warning text-dark">Conectando...</span>,
    connected:  <span className="badge bg-success">Conectado</span>,
    error:      <span className="badge bg-danger">Erro</span>,
    closed:     <span className="badge bg-secondary">Encerrado</span>,
  }[status];

  return (
    <DraggableModal
      show={show}
      onClose={handleClose}
      title={`Terminal — ${device.name}`}
      size="xl"
      modalId={`ssh-terminal-${device.id}`}
      className="no-padding"
      headerActions={<div className="ms-2">{statusBadge}</div>}
    >
      <div className="terminal-modal-dark" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: '#0d1117', padding: '8px' }}>
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

export default SshTerminalModal;
