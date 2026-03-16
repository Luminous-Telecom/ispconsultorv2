export interface RoutineJobData {
  source: 'erp' | 'saas';
  routineId: number;
  usuario?: { id: number; nome: string | null; email: string | null };
  ipAddress?: string | null;
}

export type RoutineJobProcessor = (data: RoutineJobData) => Promise<void>;
