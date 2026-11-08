import { configPadraoEnvioBoletos, passosAtivos, passosDaConfig } from './passosCobranca';

describe('passosCobranca', () => {
  it('usa os mesmos dias padrão da rotina de boletos', () => {
    const tipos = passosDaConfig({}).map((passo) => passo.tipoMensagem);
    expect(configPadraoEnvioBoletos.antesVencimento).toEqual([10, 5, 2]);
    expect(tipos).toEqual([
      '10_dias_antes_vencimento',
      '05_dias_antes_vencimento',
      '02_dias_antes_vencimento',
      'mesmo_dia_vencimento',
      '01_dias_depois_vencimento',
      '05_dias_depois_vencimento',
      '10_dias_depois_vencimento',
      '15_dias_depois_vencimento',
    ]);
  });

  it('lê a configuração da rotina e descarta mensagem desativada', () => {
    const passos = passosAtivos(
      JSON.stringify({ antesVencimento: [7, 7, 0], mesmoDia: false, depoisVencimento: [3] }),
      [{ tipo: '03_dias_depois_vencimento', canal: 'whatsapp' }]
    );
    expect(passos).toEqual([
      expect.objectContaining({ dias: 3, momento: 'depois', canais: ['whatsapp'] }),
    ]);
  });
});
