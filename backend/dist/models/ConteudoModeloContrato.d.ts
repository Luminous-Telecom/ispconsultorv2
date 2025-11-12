import { Model } from 'sequelize';
export interface ModeloContratoConteudoAttributes {
    id: number;
    modelo_contrato_id: number;
    modelo: string;
    created_at: Date;
    updated_at: Date;
}
export interface ModeloContratoConteudoCreationAttributes {
    modelo_contrato_id: number;
    modelo: string;
}
export declare class ModeloContratoConteudo extends Model<ModeloContratoConteudoAttributes, ModeloContratoConteudoCreationAttributes> implements ModeloContratoConteudoAttributes {
    id: number;
    modelo_contrato_id: number;
    modelo: string;
    readonly created_at: Date;
    readonly updated_at: Date;
}
export default ModeloContratoConteudo;
//# sourceMappingURL=ConteudoModeloContrato.d.ts.map