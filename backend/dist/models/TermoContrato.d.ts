import { Model, CreationOptional, InferAttributes, InferCreationAttributes, BelongsToGetAssociationMixin, BelongsToSetAssociationMixin, BelongsToCreateAssociationMixin } from 'sequelize';
import { Contrato } from './Contrato';
import { ModeloTermo } from './ModeloTermo';
export declare class TermoContrato extends Model<InferAttributes<TermoContrato>, InferCreationAttributes<TermoContrato>> {
    id: CreationOptional<number>;
    contrato_id: number;
    modelo_termo_id: number | null;
    tipo_termo: 'adesao' | 'permanencia' | 'cancelamento' | 'alteracao';
    conteudo: string;
    assinado: 'SIM' | 'NAO';
    data_aceite: Date | null;
    aceito_por: string | null;
    observacoes: string | null;
    ativo: boolean;
    created_at: CreationOptional<Date>;
    updated_at: CreationOptional<Date>;
    getContrato: BelongsToGetAssociationMixin<Contrato>;
    setContrato: BelongsToSetAssociationMixin<Contrato, number>;
    createContrato: BelongsToCreateAssociationMixin<Contrato>;
    getModeloTermo: BelongsToGetAssociationMixin<ModeloTermo>;
    setModeloTermo: BelongsToSetAssociationMixin<ModeloTermo, number>;
    createModeloTermo: BelongsToCreateAssociationMixin<ModeloTermo>;
    static findByContrato(contratoId: number): Promise<TermoContrato[]>;
    static findAtivosByContrato(contratoId: number): Promise<TermoContrato[]>;
    marcarComoAceito(aceitoPor: string): Promise<void>;
}
//# sourceMappingURL=TermoContrato.d.ts.map