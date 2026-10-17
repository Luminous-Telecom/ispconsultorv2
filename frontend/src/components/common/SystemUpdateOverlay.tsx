import React, { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import { useI18n } from 'contexts/I18nContext';
import { CircularProgress } from 'components/ui';
import { getSocketUrl } from 'components/common/terminal/constants';
import { authService } from 'services/authService';
import { getAuthToken, getSocketToken } from 'services/core';
import { clearSystemUpdateDriver, isSystemUpdateDriver } from 'utils/systemUpdateDriver';

interface SystemUpdateStatus {
  active: boolean;
  progress: number;
  kind: 'system' | null;
  phase: 'idle' | 'running' | 'failed';
}

function parseStatus(body: unknown): SystemUpdateStatus | null {
  if (!body || typeof body !== 'object') return null;
  const data = body as Partial<SystemUpdateStatus>;
  if (typeof data.active !== 'boolean') return null;
  return {
    active: data.active,
    progress: typeof data.progress === 'number' ? data.progress : 0,
    kind: data.kind === 'system' ? data.kind : null,
    phase: data.phase === 'running' || data.phase === 'failed' ? data.phase : 'idle',
  };
}

const SystemUpdateOverlay: React.FC = () => {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const [percent, setPercent] = useState(0);
  const sawSystemRef = useRef(false);
  const reloadingRef = useRef(false);

  useEffect(() => {
    if (!getAuthToken()) return undefined;

    let cancelled = false;
    let socket: Socket | null = null;

    const applyStatus = (body: unknown) => {
      const status = parseStatus(body);
      if (cancelled || reloadingRef.current || !status) return;

      if (isSystemUpdateDriver()) {
        if (!status.active) clearSystemUpdateDriver();
        setVisible(false);
        return;
      }

      if (status.active && status.phase === 'running') {
        if (status.kind === 'system') sawSystemRef.current = true;
        setPercent(status.progress);
        setVisible(true);
        return;
      }

      if (status.phase === 'failed') {
        sawSystemRef.current = false;
        setVisible(false);
        return;
      }

      if (sawSystemRef.current && status.phase === 'idle') {
        reloadingRef.current = true;
        window.location.reload();
        return;
      }

      setVisible(false);
    };

    const connect = async () => {
      let token = getSocketToken();
      if (!token) token = await authService.restoreSocketToken();
      if (cancelled || !token) return;

      socket = io(`${getSocketUrl()}/sistema-atualizacao`, {
        path: '/socket.io',
        auth: { token },
        transports: ['websocket'],
      });
      socket.on('system-update:status', applyStatus);
    };

    void connect();

    return () => {
      cancelled = true;
      socket?.off('system-update:status', applyStatus);
      socket?.disconnect();
    };
  }, []);

  if (!visible) return null;

  const message = t('updates.inProgressWait');

  return (
    <div
      className="system-update-overlay modal-backdrop-layer--strong"
      role="alertdialog"
      aria-modal="true"
      aria-busy="true"
      aria-label={message}
    >
      <div className="system-update-overlay__card">
        <CircularProgress percent={percent} label={message} />
        <p className="system-update-overlay__title">{message}</p>
      </div>
    </div>
  );
};

export default SystemUpdateOverlay;
