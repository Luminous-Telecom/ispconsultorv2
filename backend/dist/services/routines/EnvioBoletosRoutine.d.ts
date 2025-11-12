export interface EnvioBoletosConfig {
    antesVencimento?: number[];
    mesmoDia?: boolean;
    depoisVencimento?: number[];
    canais?: ('whatsapp' | 'email')[];
}
export declare class EnvioBoletosRoutine {
    execute(config?: EnvioBoletosConfig): Promise<{
        success: boolean;
        message: string;
        data: {
            parcelasProcessadas: number;
            boletosEnviados: number;
            erros: number;
            detalhes: {
                whatsapp?: {
                    enviadas: number;
                    erros: number;
                };
                email?: {
                    enviadas: number;
                    erros: number;
                };
            };
        };
    }>;
}
//# sourceMappingURL=EnvioBoletosRoutine.d.ts.map