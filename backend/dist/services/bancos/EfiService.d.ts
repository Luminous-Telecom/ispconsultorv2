import { Banco } from '../../models/Banco';
import { Titulo } from '../../models/Titulo';
import type { ApiResponse, TituloWithRelations, IBancoService } from './types';
export declare class EfiService implements IBancoService {
    obterToken(banco: Banco): Promise<string | null>;
    gerarTitulo(titulo: TituloWithRelations, banco: Banco, token: string): Promise<ApiResponse>;
    private prepararDadosBoleto;
    private formatarTelefoneEFI;
    private formatarMensagemEFI;
    cancelarTitulo(titulo: Titulo, banco: Banco, token: string): Promise<ApiResponse>;
    liquidarTitulo(titulo: Titulo, banco: Banco, token: string): Promise<ApiResponse>;
    consultarStatus(titulo: Titulo, banco: Banco, token: string): Promise<ApiResponse>;
    private buildAuthHeaders;
    private getNestedValue;
}
//# sourceMappingURL=EfiService.d.ts.map