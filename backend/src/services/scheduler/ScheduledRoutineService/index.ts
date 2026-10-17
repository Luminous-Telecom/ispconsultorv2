import {
  createScheduledRoutineService,
  type ListScheduledRoutinesFilters,
  type ListScheduledRoutinesResponse
} from '../../../utils/createScheduledRoutineService';

class SistemaScheduledRoutineTable {
  static tableName = 'sistema_scheduled_routines';
}

const service = createScheduledRoutineService<Record<string, unknown>>(
  SistemaScheduledRoutineTable as unknown as Parameters<typeof createScheduledRoutineService<Record<string, unknown>>>[0],
  {
  additionalSortColumns: ['cron_expression', 'descricao', 'frequencia', 'dia_execucao', 'empresa_id', 'hora_execucao'],
});

export type { ListScheduledRoutinesFilters, ListScheduledRoutinesResponse };

export class ScheduledRoutineService {
  static list = service.list;
  static getById = service.getById;
  static create = service.create;
  static update = service.update;
  static delete = service.delete;
}
