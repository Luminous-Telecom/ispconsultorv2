export interface PixPaymentSettingInput {
  code: string;
  merchantName: string;
  key: string;
  keyType: string;
}

export type BrPaymentSetting =
  | {
      type: 'pix_dynamic_code';
      pix_dynamic_code: {
        code: string;
        merchant_name: string;
        key: string;
        key_type: string;
      };
    }
  | {
      type: 'boleto';
      boleto: { digitable_line: string };
    };

/** Linha digitável FEBRABAN com 47 dígitos, no formato que o WhatsApp copia. */
export function normalizarLinhaDigitavelBoleto(linha: string | null | undefined): string | null {
  const digitos = (linha || '').replace(/\D/g, '');
  return digitos.length === 47 ? digitos : null;
}

/**
 * Opções do botão de pagamento do WhatsApp (Brasil).
 * PIX e boleto vão juntos: no celular aparecem como copiar PIX e copiar código do boleto.
 */
export function buildBrPaymentSettings(params: {
  pix?: PixPaymentSettingInput | null;
  linhaDigitavel?: string | null;
}): BrPaymentSetting[] {
  const settings: BrPaymentSetting[] = [];
  const pix = params.pix;
  const code = pix?.code.trim() ?? '';
  const merchantName = pix?.merchantName.trim().slice(0, 25) ?? '';
  const key = pix?.key.trim() ?? '';
  const keyType = pix?.keyType.trim() ?? '';

  if (code && merchantName && key && keyType) {
    settings.push({
      type: 'pix_dynamic_code',
      pix_dynamic_code: {
        code,
        merchant_name: merchantName,
        key,
        key_type: keyType,
      },
    });
  }

  const digitableLine = normalizarLinhaDigitavelBoleto(params.linhaDigitavel);
  if (digitableLine) {
    settings.push({
      type: 'boleto',
      boleto: { digitable_line: digitableLine },
    });
  }

  return settings;
}
