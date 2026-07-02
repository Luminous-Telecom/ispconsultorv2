import JsBarcode from 'jsbarcode';
import { createCanvas } from 'canvas';
import { logger } from '../../../utils/logger';

export class BarcodeService {

    public static calcularDVCodigoBanco(codigo: string): string {
        if (!codigo || codigo.length !== 3) return '0';

        const pesos = [2, 1, 2];
        let soma = 0;

        for (let i = 0; i < 3; i++) {
            let produto = parseInt(codigo[i]) * pesos[i];
            if (produto > 9) {
                produto = Math.floor(produto / 10) + (produto % 10);
            }
            soma += produto;
        }

        const resto = soma % 10;
        return resto === 0 ? '0' : (10 - resto).toString();
    }

    /** Retorna código de barras FEBRABAN (44 dígitos) a partir do código salvo ou da linha digitável. */
    public static resolveCodigoBarrasFebraban(
        codigoBarras?: string | null,
        linhaDigitavel?: string | null
    ): string | null {
        const codigo = codigoBarras?.replace(/\D/g, '');
        if (codigo?.length === 44) {
            return codigo;
        }

        return BarcodeService.converterLinhaDigitavelParaCodigoBarras(linhaDigitavel)
            ?? BarcodeService.converterLinhaDigitavelParaCodigoBarras(codigoBarras);
    }

    public static normalizarCodigosBoleto(
        codigoBarras?: unknown,
        linhaDigitavel?: unknown,
    ): { codigo_barras: string | null; linha_digitavel: string | null } {
        const codigoRaw = typeof codigoBarras === 'string' ? codigoBarras : null;
        const linhaRaw = typeof linhaDigitavel === 'string' ? linhaDigitavel : null;

        return {
            codigo_barras: BarcodeService.resolveCodigoBarrasFebraban(codigoRaw, linhaRaw),
            linha_digitavel: linhaRaw
                ? (BarcodeService.formatarLinhaDigitavel(linhaRaw) ?? linhaRaw)
                : null,
        };
    }

    public static generateFebrabanBarcodeSvg(
        codigoBarras: string,
        linhaDigitavel?: string | null
    ): string {
        const codigo = BarcodeService.resolveCodigoBarrasFebraban(codigoBarras, linhaDigitavel);

        if (!codigo) {
            return '<div class="barcode-container barcode-container--erro">Código de barras inválido</div>';
        }

        try {
            const canvas = createCanvas(1, 1);

            JsBarcode(canvas, codigo, {
                format: 'ITF',
                width: 2.5,
                height: 80,
                displayValue: false,
                margin: 20,
            });

            return `<div class="barcode-container"><img src="${canvas.toDataURL('image/png')}" alt="Código de barras" class="barcode-img" width="${canvas.width}" height="${canvas.height}" /></div>`;
        } catch (error) {
            logger.error('Erro ao gerar código de barras', {
                context: 'BarcodeService',
                codigoBarras: codigo,
                error: error instanceof Error ? error.message : 'Erro desconhecido',
            });
            return '<div class="barcode-container barcode-container--erro">Erro ao gerar código de barras</div>';
        }
    }

    public static formatarLinhaDigitavel(linha: string | null | undefined): string | null {
        if (!linha) {
            return null;
        }

        const digitos = linha.replace(/\D/g, '');

        if (digitos.length === 47) {
            return `${digitos.substring(0, 5)}.${digitos.substring(5, 10)} ` +
                   `${digitos.substring(10, 15)}.${digitos.substring(15, 21)} ` +
                   `${digitos.substring(21, 26)}.${digitos.substring(26, 32)} ` +
                   `${digitos.substring(32, 33)} ` +
                   `${digitos.substring(33)}`;
        }

        if (digitos.length === 44) {
            const campo1 = `${digitos.substring(0, 4)}${digitos.substring(19, 24)}`;
            const campo2 = digitos.substring(24, 34);
            const campo3 = digitos.substring(34, 44);
            const campo4 = digitos.substring(4, 5);
            const campo5 = digitos.substring(5, 19);

            const formatCampo = (campo: string) => {
                const numero = campo.substring(0, campo.length - 1);
                const dv = BarcodeService.calcularModulo10(numero);
                return `${numero.substring(0, 5)}.${numero.substring(5)}${dv}`;
            };

            return `${formatCampo(campo1)} ${formatCampo(campo2)} ${formatCampo(campo3)} ${campo4} ${campo5}`;
        }

        return linha;
    }

    private static calcularModulo10(numero: string): number {
        let soma = 0;
        let multiplicador = 2;

        for (let i = numero.length - 1; i >= 0; i--) {
            let produto = parseInt(numero[i], 10) * multiplicador;
            if (produto > 9) {
                produto = Math.floor(produto / 10) + (produto % 10);
            }
            soma += produto;
            multiplicador = multiplicador === 2 ? 1 : 2;
        }

        const resto = soma % 10;
        return resto === 0 ? 0 : 10 - resto;
    }

    public static converterLinhaDigitavelParaCodigoBarras(linhaDigitavel: string | null | undefined): string | null {
        if (!linhaDigitavel) {
            return null;
        }

        const digitos = linhaDigitavel.replace(/\D/g, '');

        if (digitos.length === 44) {
            return digitos;
        }

        if (digitos.length !== 47) {
            return null;
        }

        return digitos.substring(0, 4) +
            digitos.substring(32, 33) +
            digitos.substring(33, 47) +
            digitos.substring(4, 9) +
            digitos.substring(10, 20) +
            digitos.substring(21, 31);
    }
}
