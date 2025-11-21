import JsBarcode from 'jsbarcode';
import { createCanvas } from 'canvas';
import { logger } from '../utils/logger';

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
     * Gera o SVG do código de barras usando JsBarcode com configurações otimizadas.
     * @param codigoBarras O código de barras numérico (44 ou 47 dígitos).
     * @returns Uma string HTML contendo o SVG do código de barras ou uma mensagem de erro.
     */
    public static generateFebrabanBarcodeSvg(codigoBarras: string): string {
        if (!codigoBarras || typeof codigoBarras !== 'string') {
            return '<div class="barcode-wrap" style="color: #a00; padding: 10px;">Código de barras inválido - valor não fornecido</div>';
        }

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

        try {
            // Criar um novo canvas para cada código de barras (evita cache/reutilização)
            const canvas = createCanvas(500, 100);
            const ctx = canvas.getContext('2d');
            
            // Limpar o canvas antes de desenhar
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Usar JsBarcode com configurações otimizadas para bancos
            // IMPORTANTE: Passar o código como string para garantir que cada código seja único
            JsBarcode(canvas, String(codigoParaUsar), {
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
                        <img src="${dataUrl}" alt="Código de Barras ${codigoParaUsar.substring(0, 10)}..." style="width: auto; height: 80px; max-width: 500px;" />
                    </div>
                </div>
            `;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            const errorStack = error instanceof Error ? error.stack : undefined;
            logger.error('Erro ao gerar código de barras', {
              context: 'BarcodeService',
              action: 'generateBarcode',
              codigoBarras,
              error: errorMessage,
              stack: errorStack
            });
            return '<div class="barcode-wrap" style="color: #a00; padding: 10px;">Erro ao gerar código de barras</div>';
        }
    }

    /**
     * Formata a linha digitável no padrão FEBRABAN:
     * 00000.00000 00000.000000 00000.000000 0 00000000000000
     * Aceita entradas com ou sem máscara e devolve a versão formatada.
     * @param linha A linha digitável (com 44 ou 47 dígitos).
     */
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

    /**
     * Converte linha digitável (47 dígitos) para código de barras (44 dígitos) conforme padrão FEBRABAN.
     * 
     * Estrutura da linha digitável (47 dígitos):
     * AAAAA.BBBBB CCCCC.DDDDDD EEEEE.FFFFFF G HHHHHHHHHHHHH
     * 
     * Estrutura do código de barras (44 dígitos):
     * AAAA G HHHHHHHHHHHHH BBBBB CCCCC DDDDDD EEEEE FFFFFF
     * 
     * Onde:
     * - AAAAA = código do banco (5 dígitos na linha digitável, 4 no código de barras)
     * - BBBBB = campo livre 1 (5 dígitos)
     * - CCCCC = campo livre 2 (5 dígitos)
     * - DDDDDD = campo livre 3 (6 dígitos)
     * - EEEEE = campo livre 4 (5 dígitos)
     * - FFFFFF = campo livre 5 (6 dígitos)
     * - G = DV geral (1 dígito)
     * - HHHHHHHHHHHHH = valor e data de vencimento (14 dígitos)
     * 
     * @param linhaDigitavel A linha digitável com 47 dígitos (com ou sem formatação)
     * @returns O código de barras com 44 dígitos ou null se inválido
     */
    public static converterLinhaDigitavelParaCodigoBarras(linhaDigitavel: string | null | undefined): string | null {
        if (!linhaDigitavel) {
            return null;
        }

        const digitos = linhaDigitavel.replace(/\D/g, '');
        
        if (digitos.length !== 47) {
            // Se não tem 47 dígitos, pode ser que já seja código de barras (44 dígitos)
            if (digitos.length === 44) {
                return digitos;
            }
            return null;
        }

        // Converter linha digitável (47 dígitos) para código de barras (44 dígitos)
        // Linha digitável: AAAAA.BBBBB CCCCC.DDDDDD EEEEE.FFFFFF G HHHHHHHHHHHHH
        // Código de barras: AAAA G HHHHHHHHHHHHH BBBBB CCCCC DDDDDD EEEEE FFFFFF
        
        const codigoBanco = digitos.substring(0, 4); // 4 primeiros dígitos (código do banco)
        const campoLivre1 = digitos.substring(4, 9); // Posições 4-8 (5 dígitos)
        const campoLivre2 = digitos.substring(10, 15); // Posições 10-14 (5 dígitos)
        const campoLivre3 = digitos.substring(15, 21); // Posições 15-20 (6 dígitos)
        const campoLivre4 = digitos.substring(21, 26); // Posições 21-25 (5 dígitos)
        const campoLivre5 = digitos.substring(26, 32); // Posições 26-31 (6 dígitos)
        const dvGeral = digitos.substring(32, 33); // Posição 32 (DV geral)
        const valorVencimento = digitos.substring(33, 47); // Posições 33-46 (14 dígitos)

        // Montar código de barras: AAAA + G + HHHHHHHHHHHHH + BBBBB + CCCCC + DDDDDD + EEEEE + FFFFFF
        const codigoBarras = codigoBanco + 
                            dvGeral + 
                            valorVencimento + 
                            campoLivre1 + 
                            campoLivre2 + 
                            campoLivre3 + 
                            campoLivre4 + 
                            campoLivre5;

        if (codigoBarras.length !== 44) {
            return null;
        }

        return codigoBarras;
    }
}

