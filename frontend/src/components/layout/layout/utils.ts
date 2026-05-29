import { MODAL_MODULO_MAP } from 'constants/planoModulos';
import type { PlanoModuloId } from 'services/planoModulosService';

export const PUBLIC_ROUTES = ['/login', '/', '/pagamento'] as const;

export const isPublicRoute = (pathname: string): boolean =>
  PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

export const filterByModulo = (
  modalId: string,
  hasModulo: (moduloId: PlanoModuloId) => boolean
): boolean => {
  const moduloId = MODAL_MODULO_MAP[modalId];
  if (!moduloId) return true;
  return hasModulo(moduloId);
};
