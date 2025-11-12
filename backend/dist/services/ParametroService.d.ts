export declare class ParametroService {
    static getParametro(chave: string): Promise<string | null>;
    static getParametroBoolean(chave: string): Promise<boolean>;
    static getParametroNumber(chave: string): Promise<number>;
    static isAutoParcelasEnabled(): Promise<boolean>;
    static getNumeroParcelasPadrao(): Promise<number>;
    static isGeracaoAutomaticaCarneEnabled(): Promise<boolean>;
    static isManterCarneClienteEnabled(): Promise<boolean>;
}
export default ParametroService;
//# sourceMappingURL=ParametroService.d.ts.map