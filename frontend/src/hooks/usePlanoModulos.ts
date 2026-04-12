import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { AxiosError } from 'axios';
import { planoModulosService, type PlanoModuloId } from 'services/planoModulosService';

function isServerUnavailableError(error: unknown): boolean {
  if (!error) return false;
  const axiosError = error as AxiosError<unknown>;
  const status = axiosError.response?.status;
  // Sem resposta = rede/conexão (backend parado ou inacessível)
  if (!axiosError.response) return true;
  // 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout
  if (status && status >= 500) return true;
  return false;
}

/**
 * Retorna os módulos habilitados no plano do tenant.
 * null = sem restrição (mostra tudo).
 *
 * No painel SaaS (/saas/*) a sessão usa apenas `saas_auth_token`; `/api/plano-modulos`
 * exige `auth_token` (ERP). Não buscar evita 404 no backend e o warn "Requisição sem token".
 */
export function usePlanoModulos() {
  const { pathname } = useLocation();
  const fetchPlanoModulos = !pathname.startsWith('/saas');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['plano-modulos', pathname],
    queryFn: () => planoModulosService.get(),
    enabled: fetchPlanoModulos,
  });

  const modulos = data?.modulos ?? null;
  const serverUnavailable = isError && isServerUnavailableError(error);

  const hasModulo = (moduloId: PlanoModuloId): boolean =>
    modulos === null ? true : modulos.includes(moduloId);

  return { modulos, hasModulo, isLoading, serverUnavailable };
}
