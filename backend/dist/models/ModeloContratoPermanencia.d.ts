import { Model } from 'sequelize';
export interface ModeloContratoPermanenciaAttributes {
    id: number;
    modelo_contrato_id: number;
    modelo: string;
    created_at: Date;
    updated_at: Date;
}
export interface ModeloContratoPermanenciaCreationAttributes {
    modelo_contrato_id: number;
    modelo: string;
}
export declare class ModeloContratoPermanencia extends Model<ModeloContratoPermanenciaAttributes, ModeloContratoPermanenciaCreationAttributes> implements ModeloContratoPermanenciaAttributes {
    id: number;
    modelo_contrato_id: number;
    modelo: string;
    readonly created_at: Date;
    readonly updated_at: Date;
}
export default ModeloContratoPermanencia;
//# sourceMappingURL=ModeloContratoPermanencia.d.ts.map