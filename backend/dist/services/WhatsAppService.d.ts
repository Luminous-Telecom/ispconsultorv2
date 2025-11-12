interface ConfiguracoesEnvios {
    antesVencimento?: number[];
    mesmoDia?: boolean;
    depoisVencimento?: number[];
}
export declare class WhatsAppService {
    static enviarBoletos(config: ConfiguracoesEnvios): Promise<{
        sucesso: boolean;
        mensagensEnviadas: number;
        erros: number;
    }>;
    private static processarEnvio;
    private static formatarTelefone;
    private static getBaseUrl;
    private static fazerRequisicao;
    private static enviarMensagem;
    private static enviarPdfBase64;
    private static enviarMensagensInteracao;
    private static delay;
}
export {};
//# sourceMappingURL=WhatsAppService.d.ts.map