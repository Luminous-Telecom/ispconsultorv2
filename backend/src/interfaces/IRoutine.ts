import { JsonValue } from '../types';

export interface RoutineResult {
  success: boolean;
  message: string;
  data?: Record<string, JsonValue>;
}

export interface IRoutine {
  execute(config: Record<string, JsonValue>): Promise<RoutineResult>;
}

