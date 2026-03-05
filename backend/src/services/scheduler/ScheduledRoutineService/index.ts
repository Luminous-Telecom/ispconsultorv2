import { ScheduledRoutine } from '../../../models/sistema/ScheduledRoutine';
import {
  createScheduledRoutineService,
  type ListScheduledRoutinesFilters,
  type ListScheduledRoutinesResponse
} from '../../../utils/createScheduledRoutineService';

const service = createScheduledRoutineService<ScheduledRoutine>(ScheduledRoutine);

export type { ListScheduledRoutinesFilters, ListScheduledRoutinesResponse };

export class ScheduledRoutineService {
  static list = service.list;
  static getById = service.getById;
  static create = service.create;
  static update = service.update;
  static delete = service.delete;
}
