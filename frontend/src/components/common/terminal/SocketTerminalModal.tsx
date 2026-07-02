import React, { useCallback, useMemo } from 'react';
import type { Socket } from 'socket.io-client';
import type { Terminal } from '@xterm/xterm';
import type { FitAddon } from '@xterm/addon-fit';
import DraggableModal from 'components/common/DraggableModal';
import '@xterm/xterm/css/xterm.css';
import { useSocketTerminalSession } from './useSocketTerminalSession';
import type { TerminalStatus } from './types';

const STATUS_BADGE: Record<TerminalStatus, React.ReactNode> = {
  connecting: <span className="badge bg-secondary">Conectando...</span>,
  connected: <span className="badge bg-success">Conectado</span>,
  error: <span className="badge bg-danger">Erro</span>,
  closed: <span className="badge bg-warning text-dark">Encerrado</span>,
};

export interface SocketTerminalModalProps {
  show: boolean;
  onClose: () => void;
  title: string;
  modalId: string;
  namespace: string;
  latencyLogLabel: string;
  writeBanner: (xterm: Terminal) => void;
  onSocketConnect: (socket: Socket, xterm: Terminal, fitAddon: FitAddon) => void;
  sessionDeps: readonly unknown[];
}

const SocketTerminalModal: React.FC<SocketTerminalModalProps> = ({
  show,
  onClose,
  title,
  modalId,
  namespace,
  latencyLogLabel,
  writeBanner,
  onSocketConnect,
  sessionDeps,
}) => {
  const { termRef, status, errorMsg, handleClose: closeSession } = useSocketTerminalSession({
    show,
    namespace,
    latencyLogLabel,
    writeBanner,
    onSocketConnect,
    sessionDeps,
  });

  const handleClose = useCallback(() => {
    closeSession(onClose);
  }, [closeSession, onClose]);

  const statusBadge = useMemo(() => STATUS_BADGE[status], [status]);

  return (
    <DraggableModal
      show={show}
      onClose={handleClose}
      title={title}
      size="xl"
      modalId={modalId}
      className="no-padding ms-2"
      headerActions={<div >{statusBadge}</div>}
    >
      <div className="terminal-modal-dark">
        {errorMsg && status === 'error' && (
          <div className="alert alert-danger m-2 py-2 small flex-shrink-0">
            <i className="bi bi-exclamation-triangle-fill me-1" />
            {errorMsg}
          </div>
        )}
        <div
          ref={termRef}
          className="terminal-host"
        />
      </div>
    </DraggableModal>
  );
};

export default SocketTerminalModal;
