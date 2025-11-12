import { Model, Optional } from 'sequelize';
import type { JsonValue } from '../types';
export interface ScheduledRoutineAttributes {
    id: number;
    nome: string;
    tipo: 'geracao_titulos' | 'envio_boletos' | 'remessa_bancaria' | 'verificar_vencimentos' | 'outros';
    descricao?: string;
    configuracao: Record<string, JsonValue>;
    frequencia: 'diaria' | 'semanal' | 'mensal' | 'anual' | 'personalizada';
    dia_execucao?: number;
    hora_execucao: string;
    dia_semana?: number;
    cron_expression?: string;
    ativo: boolean;
    proxima_execucao: Date;
    ultima_execucao?: Date;
    total_execucoes: number;
    execucoes_com_sucesso: number;
    execucoes_com_erro: number;
    created_at: Date;
    updated_at: Date;
}
export type ScheduledRoutineCreationAttributes = Optional<ScheduledRoutineAttributes, 'id' | 'created_at' | 'updated_at' | 'ultima_execucao' | 'total_execucoes' | 'execucoes_com_sucesso' | 'execucoes_com_erro'>;
export declare class ScheduledRoutine extends Model<ScheduledRoutineAttributes, ScheduledRoutineCreationAttributes> implements ScheduledRoutineAttributes {
    id: number;
    nome: string;
    tipo: 'geracao_titulos' | 'envio_boletos' | 'remessa_bancaria' | 'verificar_vencimentos' | 'outros';
    descricao?: string;
    configuracao: Record<string, JsonValue>;
    frequencia: 'diaria' | 'semanal' | 'mensal' | 'anual' | 'personalizada';
    dia_execucao?: number;
    hora_execucao: string;
    dia_semana?: number;
    cron_expression?: string;
    ativo: boolean;
    proxima_execucao: Date;
    ultima_execucao?: Date;
    total_execucoes: number;
    execucoes_com_sucesso: number;
    execucoes_com_erro: number;
    readonly created_at: Date;
    readonly updated_at: Date;
}
export default ScheduledRoutine;
//# sourceMappingURL=ScheduledRoutine.d.ts.map