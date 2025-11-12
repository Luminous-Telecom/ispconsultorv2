import { Model, CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
export declare class ModeloTermo extends Model<InferAttributes<ModeloTermo>, InferCreationAttributes<ModeloTermo>> {
    id: CreationOptional<number>;
    nome: string;
    descricao: string | null;
    tipo_termo: 'adesao' | 'permanencia' | 'cancelamento' | 'alteracao';
    conteudo: string;
    ativo: boolean;
    created_at: CreationOptional<Date>;
    updated_at: CreationOptional<Date>;
    static findByTipo(tipo: string): Promise<ModeloTermo[]>;
    static findAtivos(): Promise<ModeloTermo[]>;
}
//# sourceMappingURL=ModeloTermo.d.ts.map