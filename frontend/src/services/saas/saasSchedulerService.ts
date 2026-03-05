import {
  createSchedulerService,
  type RotinaAgendada,
  type CreateRotinaData,
  type UpdateRotinaData,
  type SchedulerResponse,
} from '../createSchedulerService';

export type { RotinaAgendada, CreateRotinaData, UpdateRotinaData };

export type SaasSchedulerResponse = SchedulerResponse;

export const SaasSchedulerService = createSchedulerService('/saas/scheduler', {
  hasExecute: true,
});
