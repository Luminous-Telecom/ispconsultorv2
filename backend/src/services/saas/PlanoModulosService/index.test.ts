import { getModulosDoPlano, tenantTemModulo } from './index';

describe('módulos da instalação única', () => {
  it('não restringe módulos do ERP', async () => {
    await expect(getModulosDoPlano(1)).resolves.toBeNull();
    expect(tenantTemModulo(null, 'rpki')).toBe(true);
  });

  it('nega um módulo que não está na lista explícita', () => {
    expect(tenantTemModulo(['cadastros'], 'rpki')).toBe(false);
  });
});
