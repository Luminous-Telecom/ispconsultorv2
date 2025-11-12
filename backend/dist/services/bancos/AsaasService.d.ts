import { Banco } from '../../models/Banco';
import { Titulo } from '../../models/Titulo';
import type { ApiResponse, TituloWithRelations, IBancoService } from './types';
export declare class AsaasService implements IBancoService {
    obterToken(banco: Banco): Promise<string | null>;
    gerarTitulo(titulo: TituloWithRelations, banco: Banco, token: string): Promise<ApiResponse>;
    cancelarTitulo(titulo: Titulo, banco: Banco, token: string): Promise<ApiResponse>;
    liquidarTitulo(titulo: Titulo, banco: Banco, token: string): Promise<ApiResponse>;
    consultarStatus(titulo: Titulo, banco: Banco, token: string): Promise<ApiResponse>;
    configurarWebhook(banco: Banco, token: string): Promise<ApiResponse>;
    private obterOuCriarCliente;
    private montarPayloadPagamento;
    private buildAuthHeaders;
    private sanitizeDigits;
    private normalizePhone;
    private roundTwoDecimals;
    private static extrairMensagemErro;
}
//# sourceMappingURL=AsaasService.d.ts.map