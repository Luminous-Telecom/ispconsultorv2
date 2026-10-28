import React, { useEffect, useRef } from 'react';
import { DynamicProgressBar } from 'components/ui';
import { useI18n } from 'contexts/I18nContext';

interface BackupRunPanelProps {
  active: boolean;
  progress: number;
  message: string;
  logs: string[];
}

function logLineClass(line: string): string {
  if (line.startsWith('✗') || line.startsWith('❌')) return 'terminal-log-line--danger';
  if (line.startsWith('✓') || line.startsWith('✅')) return 'terminal-log-line--success';
  return 'terminal-log-line--muted';
}

const BackupRunPanel: React.FC<BackupRunPanelProps> = ({ active, progress, message, logs }) => {
  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);
  const title = active ? t('backup.running') : t('backup.finished');

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.scrollTop = panel.scrollHeight;
  }, [logs]);

  return (
    <div className="backup-run-panel" role="status">
      <strong className="small">{title}</strong>
      <p className="mb-0 small mt-1">{message}</p>
      <div
        className="progress backup-run-bar"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={title}
      >
        <DynamicProgressBar percent={progress}>
          <span className="small fw-semibold">{progress}%</span>
        </DynamicProgressBar>
      </div>
      <div ref={panelRef} className="logs-update-panel backup-run-logs" role="log" aria-live="polite">
        {logs.map((line, index) => (
          <div key={`${index}-${line}`} className={logLineClass(line)}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BackupRunPanel;
