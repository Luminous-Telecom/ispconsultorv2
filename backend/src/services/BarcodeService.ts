import JsBarcode from 'jsbarcode';
import { createCanvas } from 'canvas';

export class BarcodeService {

    /**
     * Calcula o dígito verificador do código do banco (Módulo 11 com pesos 2, 1, 2).
     * @param codigo O código do banco de 3 dígitos.
     * @returns O dígito verificador calculado como string.
     */
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


    /**
     * Valida o código de barras FEBRABAN (44 dígitos) incluindo o Dígito Verificador Geral (DV).
     * Implementa o Módulo 11 com pesos de 2 a 9.
     * @param codigoBarras O código de barras a ser validado.
     * @returns true se o código de barras for válido, false caso contrário.
     */
    public static validarCodigoBarrasFebraban(codigoBarras: string): boolean {
        const codigoLimpo = codigoBarras.replace(/\D/g, '');
        if (codigoLimpo.length !== 44) {
            return false; // Deve ter 44 dígitos
        }

        // O DV geral é o 5º dígito (índice 4)
        const dvFornecido = parseInt(codigoLimpo[4]);

        // Para o cálculo, removemos o DV do bloco
        const blocoParaCalculo = codigoLimpo.substring(0, 4) + codigoLimpo.substring(5, 44);

        let soma = 0;
        let multiplicador = 2; // Começa com peso 2

        // Itera o bloco de trás para frente
        for (let i = blocoParaCalculo.length - 1; i >= 0; i--) {
            soma += parseInt(blocoParaCalculo[i]) * multiplicador;
            multiplicador++;
            if (multiplicador > 9) {
                multiplicador = 2; // Reinicia o peso em 2 após 9
            }
        }

        const resto = soma % 11;
        let dvCalculado = 11 - resto;

        // Regras específicas para o DV do Módulo 11 FEBRABAN
        if (dvCalculado === 0 || dvCalculado === 10 || dvCalculado === 11) {
            dvCalculado = 1; // Se o resto for 0, 10 ou 11, o DV é 1
        }

        return dvCalculado === dvFornecido;
    }

    /**
     * Calcula o dígito verificador do código de barras FEBRABAN (44 dígitos).
     * @param codigoBarras O código de barras sem o DV (43 dígitos).
     * @returns O dígito verificador calculado.
     */
    public static calcularDVCodigoBarras(codigoBarras: string): number {
        const codigoLimpo = codigoBarras.replace(/\D/g, '');
        if (codigoLimpo.length !== 43) {
            throw new Error('Código de barras deve ter 43 dígitos para cálculo do DV');
        }

        let soma = 0;
        let multiplicador = 2; // Começa com peso 2

        // Itera o bloco de trás para frente
        for (let i = codigoLimpo.length - 1; i >= 0; i--) {
            soma += parseInt(codigoLimpo[i]) * multiplicador;
            multiplicador++;
            if (multiplicador > 9) {
                multiplicador = 2; // Reinicia o peso em 2 após 9
            }
        }

        const resto = soma % 11;
        let dvCalculado = 11 - resto;

        // Regras específicas para o DV do Módulo 11 FEBRABAN
        if (dvCalculado === 0 || dvCalculado === 10 || dvCalculado === 11) {
            dvCalculado = 1;
        }

        return dvCalculado;
    }

    /**
     * Gera o SVG do código de barras FEBRABAN usando JsBarcode com configurações otimizadas.
     * @param codigoBarras O código de barras numérico de 44 dígitos.
     * @returns Uma string HTML contendo o SVG do código de barras ou uma mensagem de erro.
     */
    public static generateFebrabanBarcodeSvg(codigoBarras: string): string {
        const codigoLimpo = codigoBarras.replace(/\D/g, '');

        if (!codigoLimpo || codigoLimpo.length < 20) {
            return '<div class="barcode-wrap" style="color: #a00; padding: 10px;">Código de barras inválido - muito curto</div>';
        }

        // Se tem 47 dígitos, é linha digitável - usar diretamente
        let codigoParaUsar = codigoLimpo;
        if (codigoLimpo.length === 47) {
            // Usar a linha digitável completa (47 dígitos)
            codigoParaUsar = codigoLimpo;
        } else if (codigoLimpo.length === 44) {
            // Já é código de barras, usar diretamente
            codigoParaUsar = codigoLimpo;
        } else {
            return '<div class="barcode-wrap" style="color: #a00; padding: 10px;">Código de barras inválido - deve ter 44 ou 47 dígitos</div>';
        }


        // Validar o código de barras antes de gerar (temporariamente desabilitado)
        // if (!this.validarCodigoBarrasFebraban(codigoParaUsar)) {
        //     return '<div class="barcode-wrap" style="color: #a00; padding: 10px;">Código de barras inválido - dígito verificador incorreto</div>';
        // }

        try {
            // Usar JsBarcode com configurações otimizadas para bancos
            const canvas = createCanvas(500, 100);
            JsBarcode(canvas, codigoParaUsar, {
                format: "CODE128", // CODE128 com configurações otimizadas
                width: 3, // Largura das barras aumentada para melhor leitura
                height: 80, // Altura aumentada para melhor leitura
                displayValue: false, // Não mostrar o texto
                background: "#ffffff",
                lineColor: "#000000",
                margin: 10, // Margem para melhor leitura
                fontSize: 0
            });

            const dataUrl = canvas.toDataURL('image/png');
            return `
                <div class="barcode-container">
                    <div class="barcode-wrap">
                        <img src="${dataUrl}" alt="Código de Barras" style="width: auto; height: 80px; max-width: 500px;" />
                    </div>
                </div>
            `;
        } catch (error) {
            return '<div class="barcode-wrap" style="color: #a00; padding: 10px;">Erro ao gerar código de barras</div>';
        }
    }

    /**
     * Gera código de barras FEBRABAN válido para títulos.
     * @param bancoCodigo Código do banco (3 dígitos)
     * @param nossoNumero Nosso número (20 dígitos)
     * @param valor Valor em centavos (10 dígitos)
     * @param vencimento Data de vencimento no formato YYYYMMDD
     * @returns Código de barras FEBRABAN válido de 44 dígitos
     */
    public static gerarCodigoBarrasFebraban(
        bancoCodigo: string, 
        nossoNumero: string, 
        valor: number, 
        vencimento: string
    ): string {
        // Formato FEBRABAN: 3 + 1 + 1 + 4 + 5 + 10 + 10 + 10
        // banco + moeda + dv + fator_vencimento + valor + campo_livre + campo_livre + campo_livre
        
        const moeda = '9'; // Real
        const fatorVencimento = this.calcularFatorVencimento(vencimento);
        const valorFormatado = valor.toString().padStart(10, '0');
        
        // Campo livre (20 dígitos) - usar nosso número + zeros
        const campoLivre = nossoNumero.padStart(20, '0');
        
        // Montar código sem DV (43 dígitos)
        const codigoSemDV = bancoCodigo + moeda + '0' + fatorVencimento + valorFormatado + campoLivre;
        
        // Calcular DV
        const dv = this.calcularDVCodigoBarras(codigoSemDV);
        
        // Inserir DV na posição 5 (índice 4)
        const codigoCompleto = codigoSemDV.substring(0, 4) + dv + codigoSemDV.substring(4);
        
        return codigoCompleto;
    }

    /**
     * Calcula o fator de vencimento FEBRABAN.
     * @param vencimento Data no formato YYYYMMDD
     * @returns Fator de vencimento (4 dígitos)
     */
    private static calcularFatorVencimento(vencimento: string): string {
        const dataBase = new Date('1997-10-07'); // Data base FEBRABAN
        const dataVencimento = new Date(
            parseInt(vencimento.substring(0, 4)),
            parseInt(vencimento.substring(4, 6)) - 1,
            parseInt(vencimento.substring(6, 8))
        );
        
        const diffTime = dataVencimento.getTime() - dataBase.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays.toString().padStart(4, '0');
    }

}

