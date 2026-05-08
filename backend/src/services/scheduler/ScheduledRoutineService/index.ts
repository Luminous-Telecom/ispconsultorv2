import { ScheduledRoutine } from '../../../models/sistema/ScheduledRoutine';
import {
  createScheduledRoutineService,
  type ListScheduledRoutinesFilters,
  type ListScheduledRoutinesResponse
} from '../../../utils/createScheduledRoutineService';

const service = createScheduledRoutineService<ScheduledRoutine>(ScheduledRoutine, {
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
