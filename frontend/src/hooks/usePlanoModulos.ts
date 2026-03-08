import { useQuery } from '@tanstack/react-query';
import { planoModulosService, type PlanoModuloId } from '@/services/planoModulosService';

/**
 * Retorna os módulos habilitados no plano do tenant.
 * null = sem restrição (mostra tudo).
 */
export function usePlanoModulos() {
  const { data, isLoading } = useQuery({
    queryKey: ['plano-modulos'],
    queryFn: () => planoModulosService.get(),
  });

  const modulos = data?.modulos ?? null;

  const hasModulo = (moduloId: PlanoModuloId): boolean =>
    modulos === null ? true : modulos.includes(moduloId);

  return { modulos, hasModulo, isLoading };
}
