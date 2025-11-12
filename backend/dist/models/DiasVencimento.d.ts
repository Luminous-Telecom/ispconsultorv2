import { Model, Optional } from 'sequelize';
interface DiasVencimentoAttributes {
    id: number;
    dia?: number;
    dia_padrao: number;
    ativo: boolean;
    created_at?: Date;
    updated_at?: Date;
}
type DiasVencimentoCreationAttributes = Optional<DiasVencimentoAttributes, 'id' | 'created_at' | 'updated_at'>;
export declare class DiasVencimento extends Model<DiasVencimentoAttributes, DiasVencimentoCreationAttributes> implements DiasVencimentoAttributes {
    id: number;
    dia?: number;
    dia_padrao: number;
    ativo: boolean;
    readonly created_at: Date;
    readonly updated_at: Date;
}
export {};
//# sourceMappingURL=DiasVencimento.d.ts.map