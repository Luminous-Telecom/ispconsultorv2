import { Model, Optional } from 'sequelize';
interface ModeloCartaAttributes {
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
type ModeloCartaCreationAttributes = Optional<ModeloCartaAttributes, 'id' | 'created_at' | 'updated_at'>;
export declare class ModeloCarta extends Model<ModeloCartaAttributes, ModeloCartaCreationAttributes> implements ModeloCartaAttributes {
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
//# sourceMappingURL=CartaCobranca.d.ts.map