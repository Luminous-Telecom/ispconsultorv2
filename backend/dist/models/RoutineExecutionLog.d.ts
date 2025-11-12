import { Model, Optional } from 'sequelize';
import type { JsonValue } from '../types';
export interface RoutineExecutionLogAttributes {
    id: number;
    routine_id: number;
    status: 'executando' | 'sucesso' | 'erro';
    data_inicio: Date;
    data_fim?: Date;
    duracao_ms?: number;
    resultado?: Record<string, JsonValue>;
    erro?: string;
    stack_trace?: string;
    created_at: Date;
}
export type RoutineExecutionLogCreationAttributes = Optional<RoutineExecutionLogAttributes, 'id' | 'created_at' | 'data_fim' | 'duracao_ms' | 'resultado' | 'erro' | 'stack_trace'>;
export declare class RoutineExecutionLog extends Model<RoutineExecutionLogAttributes, RoutineExecutionLogCreationAttributes> implements RoutineExecutionLogAttributes {
    id: number;
    routine_id: number;
    status: 'executando' | 'sucesso' | 'erro';
    data_inicio: Date;
    data_fim?: Date;
    duracao_ms?: number;
    resultado?: Record<string, JsonValue>;
    erro?: string;
    stack_trace?: string;
    readonly created_at: Date;
}
export default RoutineExecutionLog;
//# sourceMappingURL=RoutineExecutionLog.d.ts.map