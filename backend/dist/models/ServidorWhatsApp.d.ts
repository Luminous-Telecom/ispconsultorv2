import { Model, Optional } from 'sequelize';
interface ServidorWhatsAppAttributes {
    id: number;
    evolution_api_url: string;
    evolution_api_key: string;
    instance_name: string;
    qr_code?: string;
    status_conexao: 'disconnected' | 'connecting' | 'connected' | 'qr_required';
    webhook_url?: string;
    webhook_events?: string;
    ativo: boolean;
    notificacoes_automaticas: boolean;
    timeout: number;
    tentativas: number;
    intervalo_tentativas: number;
    configuracao_extra?: string;
    created_at?: Date;
    updated_at?: Date;
}
export declare class ServidorWhatsApp extends Model<ServidorWhatsAppAttributes, Optional<ServidorWhatsAppAttributes, 'id' | 'created_at' | 'updated_at'>> implements ServidorWhatsAppAttributes {
    id: number;
    evolution_api_url: string;
    evolution_api_key: string;
    instance_name: string;
    qr_code?: string;
    status_conexao: 'disconnected' | 'connecting' | 'connected' | 'qr_required';
    webhook_url?: string;
    webhook_events?: string;
    ativo: boolean;
    notificacoes_automaticas: boolean;
    timeout: number;
    tentativas: number;
    intervalo_tentativas: number;
    configuracao_extra?: string;
    readonly created_at: Date;
    readonly updated_at: Date;
}
export {};
//# sourceMappingURL=ServidorWhatsApp.d.ts.map