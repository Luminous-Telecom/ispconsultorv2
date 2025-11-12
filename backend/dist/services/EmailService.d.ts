interface ConfiguracoesEnvios {
    antesVencimento?: number[];
    mesmoDia?: boolean;
    depoisVencimento?: number[];
}
export declare class EmailService {
    static enviarBoletos(config: ConfiguracoesEnvios): Promise<{
        sucesso: boolean;
        emailsEnviados: number;
        erros: number;
    }>;
    private static processarEnvio;
    private static enviarEmail;
}
export {};
//# sourceMappingURL=EmailService.d.ts.map