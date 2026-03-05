import {
  createSchedulerService,
  type RotinaAgendada,
  type RoutineExecutionLog,
  type CreateRotinaData,
  type UpdateRotinaData,
  type SchedulerResponse,
} from './createSchedulerService';

export type { RotinaAgendada, RoutineExecutionLog, CreateRotinaData, UpdateRotinaData, SchedulerResponse };

export const SchedulerService = createSchedulerService('/scheduler', {
  hasToggle: true,
  hasExecute: true,
  hasLogs: true,
});
