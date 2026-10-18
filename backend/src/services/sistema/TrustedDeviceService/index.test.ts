import { TrustedDeviceService, summarizeUserAgent } from './index';

describe('TrustedDeviceService', () => {
  it('expõe cookie e validade de 90 dias', () => {
    expect(TrustedDeviceService.cookieName).toBe('trusted_device');
    expect(TrustedDeviceService.trustDays).toBe(90);
    expect(TrustedDeviceService.maxAgeMs).toBe(90 * 24 * 60 * 60 * 1000);
  });

  it('recusa token curto ou vazio como confiável', async () => {
    await expect(TrustedDeviceService.isTrusted(1, null)).resolves.toBe(false);
    await expect(TrustedDeviceService.isTrusted(1, '')).resolves.toBe(false);
    await expect(TrustedDeviceService.isTrusted(1, 'curto')).resolves.toBe(false);
  });
});

describe('summarizeUserAgent', () => {
  it('resume Chrome no Windows', () => {
    expect(
      summarizeUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      )
    ).toBe('Chrome · Windows');
  });

  it('resume Firefox no Linux', () => {
    expect(
      summarizeUserAgent('Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0')
    ).toBe('Firefox · Linux');
  });

  it('usa fallback sem user-agent', () => {
    expect(summarizeUserAgent(null)).toBe('Navegador');
  });
});
