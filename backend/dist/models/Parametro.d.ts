import { Model } from 'sequelize';
export interface ParametroAttributes {
    id: number;
    chave: string;
    valor: string;
    tipo: 'string' | 'number' | 'boolean' | 'json';
    descricao: string;
    categoria: string;
    ativo: boolean;
    created_at: Date;
    updated_at: Date;
}
export type ParametroCreationAttributes = Omit<ParametroAttributes, 'id' | 'created_at' | 'updated_at'>;
export declare class Parametro extends Model<ParametroAttributes, ParametroCreationAttributes> implements ParametroAttributes {
    id: number;
    chave: string;
    valor: string;
    tipo: 'string' | 'number' | 'boolean' | 'json';
    descricao: string;
    categoria: string;
    ativo: boolean;
    created_at: Date;
    updated_at: Date;
    static associate(): void;
}
export default Parametro;
//# sourceMappingURL=Parametro.d.ts.map