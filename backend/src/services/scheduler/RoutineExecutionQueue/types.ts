export interface RoutineJobData {
  source: 'erp' | 'saas';
  routineId: number;
  /** true = disparo manual; inativa ainda executa. false/omitido = CRON (só ativas). */
  manual?: boolean;
  usuario?: { id: number; nome: string | null; email: string | null };
  ipAddress?: string | null;
}

export type RoutineJobProcessor = (data: RoutineJobData) => Promise<void>;
