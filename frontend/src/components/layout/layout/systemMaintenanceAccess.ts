export function canManageSystemMaintenance(role: string | null | undefined): boolean {
  return role === 'admin';
}
