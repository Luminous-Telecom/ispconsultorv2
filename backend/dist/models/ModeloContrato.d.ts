import { Model, Optional } from 'sequelize';
interface ModeloContratoAttributes {
    id: number;
    nome: string;
    tipo: string;
    conteudo: string;
    conteudo_adesao?: string;
    conteudo_permanencia?: string;
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
type ModeloContratoCreationAttributes = Optional<ModeloContratoAttributes, 'id' | 'created_at' | 'updated_at'>;
export declare class ModeloContrato extends Model<ModeloContratoAttributes, ModeloContratoCreationAttributes> implements ModeloContratoAttributes {
    id: number;
    nome: string;
    tipo: string;
    conteudo: string;
    conteudo_adesao?: string;
    conteudo_permanencia?: string;
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
//# sourceMappingURL=ModeloContrato.d.ts.map