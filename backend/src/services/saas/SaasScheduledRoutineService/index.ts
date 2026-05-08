import SaasScheduledRoutine from '../../../models/saas/SaasScheduledRoutine';
import {
  createScheduledRoutineService,
  type ListScheduledRoutinesFilters,
  type ListScheduledRoutinesResponse
} from '../../../utils/createScheduledRoutineService';

const service = createScheduledRoutineService<SaasScheduledRoutine>(SaasScheduledRoutine, {
  searchFields: ['nome', 'tipo', 'alvo'],
  additionalSortColumns: ['alvo', 'minuto', 'hora', 'dia_mes', 'mes', 'dia_semana'],
});

export type { ListScheduledRoutinesFilters };
export type ListSaasScheduledRoutinesResponse = ListScheduledRoutinesResponse<SaasScheduledRoutine>;

export class SaasScheduledRoutineService {
  static list = service.list;
  static getById = service.getById;
  static create = service.create;
  static update = service.update;
  static delete = service.delete;
}
