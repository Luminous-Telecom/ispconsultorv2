import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { getSocketToken } from 'services/core';
import { authService } from 'services/authService';
import { logSshTerminalLatency } from 'utils/sshTerminalLatencyDebug';
import {
  getSocketUrl,
  TERMINAL_INIT_DELAY_MS,
  XTERM_OPTIONS,
} from './constants';
import type { TerminalStatus } from './types';

export interface UseSocketTerminalSessionOptions {
  show: boolean;
  namespace: string;
  latencyLogLabel: string;
  writeBanner: (xterm: Terminal) => void;
  onSocketConnect: (socket: Socket, xterm: Terminal, fitAddon: FitAddon) => void;
  /** Dependências que reiniciam a sessão quando alteradas (ex.: id do device). */
  sessionDeps: readonly unknown[];
}

export function useSocketTerminalSession({
  show,
  namespace,
  latencyLogLabel,
  writeBanner,
  onSocketConnect,
  sessionDeps,
}: UseSocketTerminalSessionOptions) {
  const termRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const statusRef = useRef<TerminalStatus>('connecting');

  const [status, setStatus] = useState<TerminalStatus>('connecting');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const setStatusBoth = useCallback((next: TerminalStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const onSocketConnectRef = useRef(onSocketConnect);
  onSocketConnectRef.current = onSocketConnect;

  const writeBannerRef = useRef(writeBanner);
  writeBannerRef.current = writeBanner;

  useEffect(() => {
    if (!show) return;

    setStatusBoth('connecting');
    setErrorMsg(null);

    const timer = setTimeout(async () => {
      if (!termRef.current) return;

      const xterm = new Terminal(XTERM_OPTIONS);
      const fitAddon = new FitAddon();
      xterm.loadAddon(fitAddon);
      xterm.loadAddon(new WebLinksAddon());
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

      writeBannerRef.current(xterm);

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

      const socket = io(`${getSocketUrl()}${namespace}`, {
        path: '/socket.io',
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: false,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        if (process.env.REACT_APP_SSH_TERMINAL_LATENCY_DEBUG === 'true') {
          const transport = (
            socket as Socket & { io?: { engine?: { transport?: { name?: string } } } }
          ).io?.engine?.transport?.name;
          logSshTerminalLatency(`[${latencyLogLabel}] Socket.IO transporte:`, transport ?? '(indisponível)');
        }
        onSocketConnectRef.current(socket, xterm, fitAddon);
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
              logSshTerminalLatency(`[${latencyLogLabel}] eventos onData (~3s):`, latencyInputCount);
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
    }, TERMINAL_INIT_DELAY_MS);

    return () => clearTimeout(timer);
    // sessionDeps são passadas explicitamente pelo chamador
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, namespace, latencyLogLabel, setStatusBoth, ...sessionDeps]);

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
  }, [show, setStatusBoth]);

  const handleClose = useCallback((onClose: () => void) => {
    if (sessionIdRef.current && socketRef.current?.connected) {
      socketRef.current.emit('terminal:close', { sessionId: sessionIdRef.current });
      sessionIdRef.current = null;
    }
    onClose();
  }, []);

  return {
    termRef,
    status,
    errorMsg,
    handleClose,
  };
}
