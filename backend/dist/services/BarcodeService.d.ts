export declare class BarcodeService {
    static calcularDVCodigoBanco(codigo: string): string;
    static validarCodigoBarrasFebraban(codigoBarras: string): boolean;
    static generateFebrabanBarcodeSvg(codigoBarras: string): string;
    static formatarLinhaDigitavel(linha: string | null | undefined): string | null;
    private static calcularModulo10;
}
//# sourceMappingURL=BarcodeService.d.ts.map