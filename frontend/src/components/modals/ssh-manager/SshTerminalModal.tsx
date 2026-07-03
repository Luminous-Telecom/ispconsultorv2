import React, { useCallback, useMemo } from 'react';
import type { Socket } from 'socket.io-client';
import type { Terminal } from '@xterm/xterm';
import { SshDevice } from 'types';
import { SocketTerminalModal } from 'components/common/terminal';

interface SshTerminalModalProps {
  show: boolean;
  onClose: () => void;
  device: SshDevice;
}

const SshTerminalModal: React.FC<SshTerminalModalProps> = ({ show, onClose, device }) => {
  const useAgent = !!device.agent_id;
  const namespace = useAgent ? '/agent-terminal' : '/ssh-terminal';

  const writeBanner = useCallback(
    (xterm: Terminal) => {
      xterm.writeln('\x1b[1;34m╔═══════════════════════════════════════╗\x1b[0m');
      xterm.writeln('\x1b[1;34m║  Equipamentos — ISP Consultor            ║\x1b[0m');
      xterm.writeln(
        `\x1b[1;34m║  Device: \x1b[1;37m${device.name.slice(0, 28).padEnd(28)}\x1b[1;34m ║\x1b[0m`
      );
      xterm.writeln('\x1b[1;34m╚═══════════════════════════════════════╝\x1b[0m');
      xterm.writeln('');
      const nsLabel = useAgent ? '/agent-terminal (via agente)' : '/ssh-terminal (direto)';
      xterm.writeln(`\x1b[90mConectando ao namespace ${nsLabel}...\x1b[0m`);
    },
    [device.name, useAgent]
  );

  const onSocketConnect = useCallback(
    (socket: Socket, xterm: Terminal) => {
      xterm.writeln('\x1b[90mSocket conectado. Abrindo shell...\x1b[0m');
      if (useAgent) {
        socket.emit('terminal:create:device', { deviceId: device.id });
      } else {
        socket.emit('terminal:create', { deviceId: device.id });
      }
    },
    [device.id, useAgent]
  );

  const sessionDeps = useMemo(() => [device.id, device.agent_id], [device.id, device.agent_id]);

  return (
    <SocketTerminalModal
      show={show}
      onClose={onClose}
      title={`Terminal — ${device.name}`}
      modalId={`ssh-terminal-${device.id}`}
      namespace={namespace}
      latencyLogLabel="SSH terminal"
      writeBanner={writeBanner}
      onSocketConnect={onSocketConnect}
      sessionDeps={sessionDeps}
    />
  );
};

export default SshTerminalModal;
