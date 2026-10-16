import { canManageSystemMaintenance } from './systemMaintenanceAccess';

describe('canManageSystemMaintenance', () => {
  it('libera backup e atualização para o administrador', () => {
    expect(canManageSystemMaintenance('admin')).toBe(true);
  });

  it('esconde backup e atualização dos demais perfis', () => {
    expect(canManageSystemMaintenance('usuario')).toBe(false);
    expect(canManageSystemMaintenance(undefined)).toBe(false);
    expect(canManageSystemMaintenance(null)).toBe(false);
  });
});
