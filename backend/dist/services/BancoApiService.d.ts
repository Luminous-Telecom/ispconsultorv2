import { Banco } from '../models/Banco';
import { Titulo } from '../models/Titulo';
import { Cliente } from '../models/Cliente';
import { Plano } from '../models/Plano';
import type { JsonValue } from '../types';
export interface BancoConfig {
    nome: string;
    codigo: string;
    api_url: string;
    sandbox_url: string;
    cobranca_base_url: string;
    api_base_url: string;
    api_endpoints: {
        auth: string;
        boleto: string;
        consultar: string;
        cancelar: string;
        liquidar: string;
        listar_cobrancas: string;
        notification: string;
        webhook?: string;
    };
    api_response_mapping: {
        boleto: {
            id: string;
            url: string;
            barcode: string;
            linha_digitavel: string;
            pdf: string;
            pix_qrcode: string;
            pix_qrcode_image: string;
        };
        status: {
            status: string;
        };
    };
    auth_config: {
        grant_type: string;
        auth_type: string;
    };
    auth_type: 'basic' | 'bearer';
    client_id_field: string;
    client_secret_field: string;
    token: string;
    notification: string;
}
interface ApiResponseData {
    charge_id?: string;
    [key: string]: JsonValue | undefined;
}
export interface ApiResponse {
    success: boolean;
    message?: string;
    data?: ApiResponseData;
    status?: string;
}
interface TituloWithRelations extends Titulo {
    banco?: Banco;
    cliente?: Cliente;
    plano?: Plano;
}
export declare class BancoApiService {
    private static readonly BANCO_CONFIGS;
    private static asaasService;
    private static efiService;
    private static getBancoConfig;
    static getCodigoBanco(tipoBanco: string): string | null;
    private static verificarCredenciais;
    static testarAutenticacao(banco: Banco): Promise<ApiResponse>;
    private static obterToken;
    private static buildAuthHeaders;
    private static getNestedValue;
    static gerarTitulo(titulo: TituloWithRelations): Promise<ApiResponse>;
    static consultarStatus(titulo: TituloWithRelations): Promise<ApiResponse>;
    static consultarNotificacaoPorToken(banco: Banco, notificationToken: string): Promise<ApiResponse>;
    static cancelarTitulo(titulo: TituloWithRelations): Promise<ApiResponse>;
    static liquidarTitulo(titulo: TituloWithRelations): Promise<ApiResponse>;
}
export {};
//# sourceMappingURL=BancoApiService.d.ts.map