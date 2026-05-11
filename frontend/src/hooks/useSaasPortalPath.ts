import { useLocation } from 'react-router-dom';

/** Rotas sob `/saas` (painel super-admin); o ERP principal usa outro layout. */
export function useSaasPortalPath(): boolean {
  const { pathname } = useLocation();
  return pathname.startsWith('/saas');
}
