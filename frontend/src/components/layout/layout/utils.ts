import { MODAL_MODULO_MAP } from 'constants/planoModulos';
import type { PlanoModuloId } from 'services/planoModulosService';
import type { SidebarFolderConfig } from './types';

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

export function folderHasMenuItems(folder: SidebarFolderConfig): boolean {
  if (folder.items.length > 0) return true;
  return (folder.nestedFolders ?? []).some((nested) => nested.items.length > 0);
}

export function isMenuFolderVisible(folder: SidebarFolderConfig, isLoadingModulos: boolean): boolean {
  if (!folderHasMenuItems(folder)) return false;
  if (folder.requireModulosLoaded && isLoadingModulos) return false;
  return true;
}
