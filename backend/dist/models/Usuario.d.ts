import { Model, CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
export declare class Usuario extends Model<InferAttributes<Usuario>, InferCreationAttributes<Usuario>> {
    id: CreationOptional<number>;
    nome: string;
    email: string;
    password_hash: string;
    role: string;
    ativo: CreationOptional<boolean>;
    precisa_trocar_senha: CreationOptional<boolean>;
    ultimo_login: CreationOptional<Date | null>;
    created_at: CreationOptional<Date>;
    updated_at: CreationOptional<Date>;
}
export default Usuario;
//# sourceMappingURL=Usuario.d.ts.map