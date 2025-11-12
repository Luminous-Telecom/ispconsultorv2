export interface RemessaBancariaConfig {
    bancos_ids?: number[];
    incluir_vencidos?: boolean;
    incluir_pagos?: boolean;
    clientes_ids?: number[];
}
export declare class RemessaBancariaRoutine {
    execute(_config: RemessaBancariaConfig): Promise<{
        success: boolean;
        message: string;
        data: {
            parcelasProcessadas: number;
            remessasGeradas: number;
            erros: number;
        };
    }>;
}
//# sourceMappingURL=RemessaBancariaRoutine.d.ts.map