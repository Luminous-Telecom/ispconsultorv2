import { Model, CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
export declare class DadosEmpresa extends Model<InferAttributes<DadosEmpresa>, InferCreationAttributes<DadosEmpresa>> {
    id: CreationOptional<number>;
    razao_social: string;
    nome_fantasia: string | null;
    cnpj: string;
    inscricao_estadual: string | null;
    inscricao_municipal: string | null;
    cep: string;
    endereco: string;
    numero: string;
    complemento: string | null;
    bairro: string;
    cidade: string;
    estado: string;
    telefone: string | null;
    celular: string | null;
    email: string;
    site: string | null;
    responsavel_nome: string;
    responsavel_cpf: string;
    responsavel_cargo: string | null;
    logo: string | null;
    created_at: CreationOptional<Date>;
    updated_at: CreationOptional<Date>;
}
//# sourceMappingURL=DadosEmpresa.d.ts.map