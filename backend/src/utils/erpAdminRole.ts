export function isErpAdminRole(role: unknown): boolean {
  return String(role ?? '') === 'admin';
}
