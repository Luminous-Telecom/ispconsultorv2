import React, { useEffect, useRef, useState } from 'react';
import { useI18n } from 'contexts/I18nContext';
import { CircularProgress } from 'components/ui';
import { API_CONFIG } from 'config/api';
import { clearSystemUpdateDriver, isSystemUpdateDriver } from 'utils/systemUpdateDriver';

const POLL_MS = 2000;

interface SystemUpdateStatus {
  active: boolean;
  progress: number;
  kind: 'system' | null;
  phase: 'idle' | 'running' | 'failed';
}

function parseStatus(body: unknown): SystemUpdateStatus | null {
  if (!body || typeof body !== 'object') return null;
  const record = body as { data?: unknown };
  const data = (record.data && typeof record.data === 'object' ? record.data : body) as Partial<SystemUpdateStatus>;
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
    let cancelled = false;
    let timer = 0;

    const schedule = () => {
      if (cancelled || reloadingRef.current) return;
      timer = window.setTimeout(() => {
        void poll();
      }, POLL_MS);
    };

    const reloadAfterRestart = () => {
      if (reloadingRef.current) return;
      reloadingRef.current = true;
      window.location.reload();
    };

    const poll = async () => {
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/sistema/atualizacao-status`, {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('status');
        const status = parseStatus(await response.json());
        if (cancelled || !status) {
          schedule();
          return;
        }

        if (isSystemUpdateDriver()) {
          if (!status.active) clearSystemUpdateDriver();
          setVisible(false);
          schedule();
          return;
        }

        if (status.active && status.phase === 'running') {
          if (status.kind === 'system') sawSystemRef.current = true;
          setPercent(status.progress);
          setVisible(true);
          schedule();
          return;
        }

        if (status.phase === 'failed') {
          sawSystemRef.current = false;
          setVisible(false);
          schedule();
          return;
        }

        if (sawSystemRef.current && status.phase === 'idle') {
          reloadAfterRestart();
          return;
        }

        setVisible(false);
        schedule();
      } catch {
        if (sawSystemRef.current) setVisible(true);
        schedule();
      }
    };

    void poll();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
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
