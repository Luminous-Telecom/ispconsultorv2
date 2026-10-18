import * as fs from 'fs';
import {
  extrairStatusConsultaBanco,
  extrairValorPagoConsultaBanco,
  getLogoBancoPadrao,
  isStatusPagoNoBanco,
} from './index';
import { resolveArquivosPath } from '../../../utils/pathUtils';

describe('getLogoBancoPadrao', () => {
  it('retorna data URL da logo efi quando o arquivo existe', () => {
    const imagePath = resolveArquivosPath('images', 'bancos', 'efi.png');
    expect(fs.existsSync(imagePath)).toBe(true);

    const logo = getLogoBancoPadrao('efi');

    expect(logo.startsWith('data:image/png;base64,')).toBe(true);
    expect(logo.length).toBeGreaterThan(100);
  });

  it('retorna string vazia para tipo desconhecido sem arquivo genérico', () => {
    const imagePath = resolveArquivosPath('images', 'bancos', 'boletoproprio.png');
    if (!fs.existsSync(imagePath)) {
      expect(getLogoBancoPadrao('tipo-inexistente')).toBe('');
      return;
    }
    const logo = getLogoBancoPadrao('tipo-inexistente');
    expect(logo.startsWith('data:image/png;base64,')).toBe(true);
  });
});

describe('extrairStatusConsultaBanco', () => {
  it('reconhece settled da EFI em resultado.status', () => {
    expect(
      extrairStatusConsultaBanco({
        status: 'settled',
        data: {
          code: 200,
          data: { charge_id: 45049929, status: 'settled', paid_value: 10000 },
        },
      })
    ).toBe('settled');
  });

  it('reconhece settled aninhado em data.data quando status top-level falta', () => {
    expect(
      extrairStatusConsultaBanco({
        data: {
          code: 200,
          data: { charge_id: 45049929, status: 'settled', paid_value: 10000 },
        },
      })
    ).toBe('settled');
  });
});

describe('isStatusPagoNoBanco', () => {
  it('trata settled e received como pago', () => {
    expect(isStatusPagoNoBanco('settled')).toBe(true);
    expect(isStatusPagoNoBanco('RECEIVED')).toBe(true);
    expect(isStatusPagoNoBanco('waiting')).toBe(false);
  });
});

describe('extrairValorPagoConsultaBanco', () => {
  it('converte paid_value da EFI de centavos para reais', () => {
    expect(
      extrairValorPagoConsultaBanco(
        {
          data: {
            code: 200,
            data: { paid_value: 10000, status: 'settled' },
          },
        },
        50
      )
    ).toBe(100);
  });
});
