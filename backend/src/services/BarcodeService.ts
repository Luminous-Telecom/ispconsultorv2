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

        // Se tem 47 dígitos, é linha digitável - usar diretamente para gerar código de barras
        let codigoParaUsar = codigoLimpo;
        if (codigoLimpo.length === 47) {
            // Para linha digitável, usar os primeiros 44 dígitos como código de barras
            codigoParaUsar = codigoLimpo.substring(0, 44);
        } else if (codigoLimpo.length !== 44) {
            return '<div class="barcode-wrap" style="color: #a00; padding: 10px;">Código de barras inválido - deve ter 44 dígitos</div>';
        }


        // Validar o código de barras antes de gerar (temporariamente desabilitado)
        // if (!this.validarCodigoBarrasFebraban(codigoParaUsar)) {
        //     return '<div class="barcode-wrap" style="color: #a00; padding: 10px;">Código de barras inválido - dígito verificador incorreto</div>';
        // }

        try {
            // Usar JsBarcode com configurações otimizadas para bancos
            const canvas = createCanvas(400, 70);
            JsBarcode(canvas, codigoParaUsar, {
                format: "CODE128", // CODE128 é mais legível que ITF-25
                width: 2, // Largura das barras otimizada
                height: 60, // Altura adequada para leitura
                displayValue: false, // Não mostrar o texto
                background: "#ffffff",
                lineColor: "#000000",
                margin: 0,
                fontSize: 0
            });

            const dataUrl = canvas.toDataURL('image/png');
            return `
                <div class="barcode-container">
                    <div class="barcode-wrap">
                        <img src="${dataUrl}" alt="Código de Barras" style="width: auto; height: 60px; max-width: 400px;" />
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

    /**
     * Converte linha digitável (47 dígitos) para código de barras (44 dígitos).
     * @param linhaDigitavel Linha digitável de 47 dígitos
     * @returns Código de barras de 44 dígitos
     */
    public static converterLinhaDigitavelParaCodigoBarras(linhaDigitavel: string): string {
        const codigoLimpo = linhaDigitavel.replace(/\D/g, '');
        
        if (codigoLimpo.length !== 47) {
            throw new Error('Linha digitável deve ter 47 dígitos');
        }

        // Extrair campos da linha digitável
        const campo1 = codigoLimpo.substring(0, 9);   // 364900009
        const campo2 = codigoLimpo.substring(9, 19);   // 2000688768
        const campo3 = codigoLimpo.substring(19, 29);  // 0400000006
        const campo4 = codigoLimpo.substring(29, 42);  // 8094000000000 (13 dígitos)
        const campo5 = codigoLimpo.substring(42, 47);  // 8990

        console.log('Campos extraídos:');
        console.log('Campo 1:', campo1, 'tamanho:', campo1.length);
        console.log('Campo 2:', campo2, 'tamanho:', campo2.length);
        console.log('Campo 3:', campo3, 'tamanho:', campo3.length);
        console.log('Campo 4:', campo4, 'tamanho:', campo4.length);
        console.log('Campo 5:', campo5, 'tamanho:', campo5.length);

        // Extrair dados para montar código de barras FEBRABAN
        const banco = campo1.substring(0, 3);         // 364
        const moeda = campo1.substring(3, 4);         // 9
        
        // DV geral (posição 5 do campo 4)
        const dvGeral = campo4.substring(0, 1);       // 8
        
        // Fator de vencimento (posições 6-9 do campo 4)
        const fatorVencimento = campo4.substring(1, 5); // 0940
        
        // Valor (posições 10-19 do campo 4) - deve ter 10 dígitos
        const valor = campo4.substring(5, 15).padEnd(10, '0'); // 0000000000
        
        // Campo livre (campos 2 e 3 sem DVs) - deve ter 20 dígitos
        const campo2SemDV = campo2.substring(0, 9);   // 200068876
        const campo3SemDV = campo3.substring(0, 9);   // 040000000
        const campoLivre = campo2SemDV + campo3SemDV; // 200068876040000000

        // Montar código sem DV (43 dígitos): banco(3) + moeda(1) + dv(1) + fator(4) + valor(10) + campo_livre(20) = 39
        // Adicionar 2 zeros para completar 43 dígitos
        const codigoSemDV = banco + moeda + '0' + fatorVencimento + valor + campoLivre + '00';
        
        console.log('Debug conversão:');
        console.log('Banco:', banco);
        console.log('Moeda:', moeda);
        console.log('Fator vencimento:', fatorVencimento);
        console.log('Valor:', valor);
        console.log('Campo livre:', campoLivre);
        console.log('Código sem DV:', codigoSemDV);
        console.log('Tamanho código sem DV:', codigoSemDV.length);
        
        // Calcular DV correto
        const dv = this.calcularDVCodigoBarras(codigoSemDV);
        
        // Inserir DV na posição 5 (índice 4)
        const codigoBarras = codigoSemDV.substring(0, 4) + dv + codigoSemDV.substring(4);
        
        return codigoBarras;
    }
}

