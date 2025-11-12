import { Model, Optional } from 'sequelize';
interface ServidorEmailAttributes {
    id: number;
    host: string;
    porta: number;
    usuario: string;
    senha: string;
    ssl: boolean;
    tls: boolean;
    ativo: boolean;
    nome_remetente: string;
    email_remetente: string;
    timeout: number;
    tentativas: number;
    intervalo_tentativas: number;
    created_at?: Date;
    updated_at?: Date;
}
type ServidorEmailCreationAttributes = Optional<ServidorEmailAttributes, 'id' | 'created_at' | 'updated_at'>;
export declare class ServidorEmail extends Model<ServidorEmailAttributes, ServidorEmailCreationAttributes> implements ServidorEmailAttributes {
    id: number;
    host: string;
    porta: number;
    usuario: string;
    senha: string;
    ssl: boolean;
    tls: boolean;
    ativo: boolean;
    nome_remetente: string;
    email_remetente: string;
    timeout: number;
    tentativas: number;
    intervalo_tentativas: number;
    readonly created_at: Date;
    readonly updated_at: Date;
}
export {};
//# sourceMappingURL=ServidorEmail.d.ts.map