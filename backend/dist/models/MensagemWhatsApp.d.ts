import { Model, Optional } from 'sequelize';
interface MensagemWhatsAppAttributes {
    id: number;
    tipo: string;
    tipo_envio: 'desativado' | 'pdf';
    mensagem_padrao: string;
    interacao1?: string;
    interacao2?: string;
    interacao3?: string;
    ativo: boolean;
    created_at?: Date;
    updated_at?: Date;
}
type MensagemWhatsAppCreationAttributes = Optional<MensagemWhatsAppAttributes, 'id' | 'created_at' | 'updated_at'>;
export declare class MensagemWhatsApp extends Model<MensagemWhatsAppAttributes, MensagemWhatsAppCreationAttributes> implements MensagemWhatsAppAttributes {
    id: number;
    tipo: string;
    tipo_envio: 'desativado' | 'pdf';
    mensagem_padrao: string;
    interacao1?: string;
    interacao2?: string;
    interacao3?: string;
    ativo: boolean;
    readonly created_at: Date;
    readonly updated_at: Date;
}
export default MensagemWhatsApp;
//# sourceMappingURL=MensagemWhatsApp.d.ts.map