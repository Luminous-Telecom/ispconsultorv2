import {
  createSchedulerService,
  type RotinaAgendada,
  type CreateRotinaData,
  type UpdateRotinaData,
  type SchedulerResponse,
} from './createSchedulerService';

export type { RotinaAgendada, CreateRotinaData, UpdateRotinaData };

export type SchedulerListResponse = SchedulerResponse;

export const SchedulerService = createSchedulerService('/scheduler', {
  hasToggle: true,
  hasExecute: true,
  hasLogs: true,
});
