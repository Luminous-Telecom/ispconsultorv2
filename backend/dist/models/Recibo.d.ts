import { Model, Optional } from 'sequelize';
interface ModeloReciboAttributes {
    id: number;
    nome: string;
    conteudo: string;
    descricao?: string;
    ativo: boolean;
    tamanho_maximo: number;
    tipos_permitidos: string;
    retencao_dias: number;
    auto_backup: boolean;
    criptografia: boolean;
    created_at?: Date;
    updated_at?: Date;
}
type ModeloReciboCreationAttributes = Optional<ModeloReciboAttributes, 'id' | 'created_at' | 'updated_at'>;
export declare class ModeloRecibo extends Model<ModeloReciboAttributes, ModeloReciboCreationAttributes> implements ModeloReciboAttributes {
    id: number;
    nome: string;
    conteudo: string;
    descricao?: string;
    ativo: boolean;
    tamanho_maximo: number;
    tipos_permitidos: string;
    retencao_dias: number;
    auto_backup: boolean;
    criptografia: boolean;
    readonly created_at: Date;
    readonly updated_at: Date;
}
export {};
//# sourceMappingURL=Recibo.d.ts.map