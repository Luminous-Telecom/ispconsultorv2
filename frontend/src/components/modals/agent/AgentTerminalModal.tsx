import React, { useCallback, useMemo } from 'react';
import type { Socket } from 'socket.io-client';
import type { Terminal } from '@xterm/xterm';
import type { FitAddon } from '@xterm/addon-fit';
import { SYSTEM_NAME } from 'constants/systemBrand';
import { Agent } from 'types';
import { SocketTerminalModal } from 'components/common/terminal';

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

const AgentTerminalModal: React.FC<AgentTerminalModalProps> = ({
  show,
  onClose,
  agent,
  proxyHost,
  proxyPort,
  proxyUser,
  proxyPassword,
}) => {
  const bannerTitle = proxyHost ? `${agent.name} → ${proxyHost}` : agent.name;

  const title = proxyHost
    ? `Terminal — ${agent.name} → ${proxyHost}`
    : `Terminal — ${agent.name}`;

  const writeBanner = useCallback(
    (xterm: Terminal) => {
      xterm.writeln('\x1b[1;36m╔══════════════════════════════════════╗\x1b[0m');
      xterm.writeln(`\x1b[1;36m║\x1b[0m  ${`${SYSTEM_NAME} Agent Terminal`.padEnd(36)}\x1b[1;36m║\x1b[0m`);
      xterm.writeln(`\x1b[1;36m║\x1b[0m  ${bannerTitle.padEnd(36)}\x1b[1;36m║\x1b[0m`);
      xterm.writeln('\x1b[1;36m╚══════════════════════════════════════╝\x1b[0m');
      xterm.writeln('');
      xterm.writeln('\x1b[90mConectando ao agente...\x1b[0m');
    },
    [bannerTitle]
  );

  const onSocketConnect = useCallback(
    (socket: Socket, xterm: Terminal, fitAddon: FitAddon) => {
      xterm.writeln('\x1b[90mSessão estabelecida, abrindo shell...\x1b[0m');
      const { cols, rows } = fitAddon.proposeDimensions() ?? { cols: 80, rows: 24 };
      socket.emit('terminal:create', {
        agentId: agent.id,
        cols,
        rows,
        ...(proxyHost ? { proxyHost, proxyPort, proxyUser, proxyPassword } : {}),
      });
    },
    [agent.id, proxyHost, proxyPort, proxyUser, proxyPassword]
  );

  const sessionDeps = useMemo(
    () => [agent.id, agent.name, proxyHost, proxyPort, proxyUser, proxyPassword],
    [agent.id, agent.name, proxyHost, proxyPort, proxyUser, proxyPassword]
  );

  return (
    <SocketTerminalModal
      show={show}
      onClose={onClose}
      title={title}
      modalId={`agent-terminal-${agent.id}`}
      namespace="/agent-terminal"
      latencyLogLabel="Agent terminal"
      writeBanner={writeBanner}
      onSocketConnect={onSocketConnect}
      sessionDeps={sessionDeps}
    />
  );
};

export default AgentTerminalModal;
