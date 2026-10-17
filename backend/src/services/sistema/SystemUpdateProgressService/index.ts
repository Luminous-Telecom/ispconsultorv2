export type SystemUpdateKind = 'system';
export type SystemUpdatePhase = 'idle' | 'running' | 'failed';

export interface SystemUpdateStatus {
  active: boolean;
  progress: number;
  kind: SystemUpdateKind | null;
  phase: SystemUpdatePhase;
}

const IDLE_STATUS: SystemUpdateStatus = {
  active: false,
  progress: 0,
  kind: null,
  phase: 'idle',
};

let status: SystemUpdateStatus = { ...IDLE_STATUS };

type SystemUpdateStatusListener = (status: SystemUpdateStatus) => void;

const listeners = new Set<SystemUpdateStatusListener>();

export function subscribeSystemUpdateStatus(listener: SystemUpdateStatusListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function publish(): void {
  const snapshot = { ...status };
  for (const listener of listeners) {
    try {
      listener(snapshot);
    } catch {
      // Um assinante não pode interromper a atualização.
    }
  }
}

function clampProgress(progress: number): number {
  if (!Number.isFinite(progress)) return 0;
  return Math.max(0, Math.min(100, Math.round(progress)));
}

/** Estado em memória da atualização iniciada pelo painel SaaS. */
export class SystemUpdateProgressService {
  static begin(kind: SystemUpdateKind): void {
    status = { active: true, progress: 0, kind, phase: 'running' };
    publish();
  }

  static report(progress: number): void {
    status = {
      ...status,
      active: true,
      progress: clampProgress(progress),
      phase: 'running',
    };
    publish();
  }

  static fail(): void {
    status = {
      active: false,
      progress: 0,
      kind: status.kind,
      phase: 'failed',
    };
    publish();
  }

  static end(): void {
    status = { ...IDLE_STATUS };
    publish();
  }

  static getSnapshot(): SystemUpdateStatus {
    return { ...status };
  }

  static reset(): void {
    status = { ...IDLE_STATUS };
  }
}
