import { isErpAdminRole } from './erpAdminRole';

describe('isErpAdminRole', () => {
  it('aceita o administrador do sistema', () => {
    expect(isErpAdminRole('admin')).toBe(true);
  });

  it('recusa perfil que não é administrador', () => {
    expect(isErpAdminRole('usuario')).toBe(false);
    expect(isErpAdminRole(undefined)).toBe(false);
    expect(isErpAdminRole(null)).toBe(false);
  });
});
