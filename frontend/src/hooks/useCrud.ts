// Hook unificado para operações CRUD
import { useApiQuery, useApiMutation } from './useApi';
import { AxiosError } from 'axios';

/**
 * Interface para operações CRUD
 */
export interface CrudService<TEntity, TCreateData, TUpdateData, TFilters = Record<string, string | number | boolean | null | undefined>> {
  list: (filters?: TFilters) => Promise<{ success: boolean; data: TEntity[]; message?: string }>;
  getById: (id: number) => Promise<{ success: boolean; data: TEntity; message?: string }>;
  create: (data: TCreateData) => Promise<{ success: boolean; data: TEntity; message?: string }>;
  update: (id: number, data: TUpdateData) => Promise<{ success: boolean; message?: string }>;
  delete: (id: number) => Promise<{ success: boolean; message?: string }>;
}

/**
 * Opções para hook CRUD
 */
export interface UseCrudOptions<TEntity, TFilters = Record<string, string | number | boolean | null | undefined>> {
  entityName: string;
  service: CrudService<TEntity, object, object, TFilters>;
  baseQueryKey: string[];
  filters?: TFilters;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  refetchOnMount?: boolean;
  refetchOnWindowFocus?: boolean;
}

/**
 * Retorno do hook CRUD
 */
export interface UseCrudReturn<TEntity, TCreateData, TUpdateData> {
  // Queries
  list: ReturnType<typeof useApiQuery<TEntity[]>>;
  getById: (id: number) => ReturnType<typeof useApiQuery<TEntity>>;
  
  // Mutations
  create: ReturnType<typeof useApiMutation<TEntity, TCreateData>>;
  update: ReturnType<typeof useApiMutation<void, { id: number; data: TUpdateData }>>;
  delete: ReturnType<typeof useApiMutation<void, number>>;
}

/**
 * Hook unificado para operações CRUD
 */
export const useCrud = <TEntity, TCreateData = object, TUpdateData = object, TFilters = Record<string, string | number | boolean | null | undefined>>({
  entityName,
  service,
  baseQueryKey,
  filters = {} as TFilters,
  enabled = true,
  staleTime,
  gcTime,
  refetchOnMount = false,
  refetchOnWindowFocus = false,
}: UseCrudOptions<TEntity, TFilters>): UseCrudReturn<TEntity, TCreateData, TUpdateData> => {
  // Query para listar
  const list = useApiQuery<TEntity[], AxiosError>({
    queryKey: [...baseQueryKey, JSON.stringify(filters)],
    queryFn: async () => {
      const response = await service.list(filters);
      return response.data;
    },
    enabled,
    staleTime,
    gcTime,
    refetchOnMount,
    refetchOnWindowFocus,
  });

  // Query para buscar por ID (será retornada como função)
  const getById = (id: number) => useApiQuery<TEntity, AxiosError>({
    queryKey: [...baseQueryKey, String(id)],
    queryFn: async () => {
      const response = await service.getById(id);
      return response.data;
    },
    enabled: enabled && !!id,
    staleTime,
    gcTime,
  });

  // Mutation para criar
  const create = useApiMutation<TEntity, TCreateData, AxiosError>({
    mutationFn: async (data: TCreateData) => {
      const response = await service.create(data as never);
      return response.data;
    },
    successMessage: `${entityName} criado(a) com sucesso!`,
    errorMessage: `Erro ao criar ${entityName.toLowerCase()}`,
    invalidateQueries: [baseQueryKey],
  });

  // Mutation para atualizar
  const update = useApiMutation<void, { id: number; data: TUpdateData }, AxiosError>({
    mutationFn: async ({ id, data }) => {
      await service.update(id, data as never);
    },
    successMessage: `${entityName} atualizado(a) com sucesso!`,
    errorMessage: `Erro ao atualizar ${entityName.toLowerCase()}`,
    invalidateQueries: [baseQueryKey],
  });

  // Mutation para deletar
  const deleteMutation = useApiMutation<void, number, AxiosError>({
    mutationFn: async (id: number) => {
      await service.delete(id);
    },
    successMessage: `${entityName} deletado(a) com sucesso!`,
    errorMessage: `Erro ao deletar ${entityName.toLowerCase()}`,
    invalidateQueries: [baseQueryKey],
  });

  return {
    list,
    getById,
    create,
    update,
    delete: deleteMutation,
  };
};

