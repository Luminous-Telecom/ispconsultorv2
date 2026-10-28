export type BackupManualTipo = 'database' | 'arquivos' | 'logs' | 'completo';

export interface BackupProgressEvent {
  step: string;
  progress: number;
  message: string;
  logs?: string[];
  success?: boolean;
  error?: string;
}

export interface BackupPhaseRange {
  database: [number, number];
  arquivos: [number, number];
  logs: [number, number];
  pack: [number, number];
}

export function clampBackupProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function progressWithin(start: number, end: number, ratio: number): number {
  const span = Math.max(0, end - start);
  const clamped = Math.min(1, Math.max(0, ratio));
  return clampBackupProgress(start + span * clamped);
}

/** Sobe com os eventos e para um ponto antes do fim da faixa. */
export function asymptoticProgress(start: number, end: number, events: number): number {
  const safeEnd = Math.max(start, end - 1);
  const ratio = 1 - Math.exp(-Math.max(0, events) / 8);
  return progressWithin(start, safeEnd, ratio);
}

export function redactBackupLogLine(raw: string, secrets: string[]): string | null {
  const line = raw.replace(/\s+/g, ' ').trim();
  if (!line) return null;
  for (const secret of secrets) {
    if (secret && secret.length >= 3 && line.includes(secret)) return null;
  }
  if (/password|senha/i.test(line)) return null;
  return line.length > 240 ? `${line.slice(0, 237)}...` : line;
}

export function tableNameFromDumpLine(line: string): string | null {
  const quoted = line.match(/table\s+`([^`]+)`/i);
  if (quoted?.[1]) return quoted[1];
  const plain = line.match(/table\s+([A-Za-z0-9_]+)/i);
  return plain?.[1] ?? null;
}

export function phaseRanges(tipo: BackupManualTipo): BackupPhaseRange {
  if (tipo === 'completo') {
    return { database: [5, 42], arquivos: [42, 78], logs: [78, 88], pack: [88, 96] };
  }
  if (tipo === 'database') {
    return { database: [8, 92], arquivos: [0, 0], logs: [0, 0], pack: [92, 98] };
  }
  if (tipo === 'arquivos') {
    return { database: [0, 0], arquivos: [8, 92], logs: [0, 0], pack: [92, 98] };
  }
  return { database: [0, 0], arquivos: [0, 0], logs: [15, 90], pack: [90, 98] };
}
