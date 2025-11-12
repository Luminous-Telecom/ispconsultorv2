import { Model } from 'sequelize';
export interface ModeloTermoAdesaoAttributes {
    id: number;
    modelo_contrato_id: number;
    modelo: string;
    created_at: Date;
    updated_at: Date;
}
export interface ModeloTermoAdesaoCreationAttributes {
    modelo_contrato_id: number;
    modelo: string;
}
export declare class ModeloTermoAdesao extends Model<ModeloTermoAdesaoAttributes, ModeloTermoAdesaoCreationAttributes> implements ModeloTermoAdesaoAttributes {
    id: number;
    modelo_contrato_id: number;
    modelo: string;
    readonly created_at: Date;
    readonly updated_at: Date;
}
export default ModeloTermoAdesao;
//# sourceMappingURL=ConteudoTermoAdesao.d.ts.map