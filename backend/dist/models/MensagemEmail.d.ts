import { Model, Optional } from 'sequelize';
interface MensagemEmailAttributes {
    id: number;
    tipo: string;
    tipo_envio: 'desativado' | 'pdf';
    mensagem_padrao: string;
    ativo: boolean;
    created_at?: Date;
    updated_at?: Date;
}
type MensagemEmailCreationAttributes = Optional<MensagemEmailAttributes, 'id' | 'created_at' | 'updated_at'>;
export declare class MensagemEmail extends Model<MensagemEmailAttributes, MensagemEmailCreationAttributes> implements MensagemEmailAttributes {
    id: number;
    tipo: string;
    tipo_envio: 'desativado' | 'pdf';
    mensagem_padrao: string;
    ativo: boolean;
    readonly created_at: Date;
    readonly updated_at: Date;
}
export default MensagemEmail;
//# sourceMappingURL=MensagemEmail.d.ts.map