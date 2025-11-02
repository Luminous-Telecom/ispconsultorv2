// Factory para criar serviços de API
import { ApiClient, defaultApiClient } from './ApiClient';
import { BaseService } from './BaseService';

/**
 * Interface para configuração de serviço
 */
export interface ServiceConfig {
  endpoint: string;
  apiClient?: ApiClient;
}

/**
 * Factory para criar instâncias de serviços
 */
export class ServiceFactory {
  /**
   * Cria uma instância de um serviço baseado na classe BaseService
   */
  static createService<TEntity, TCreateData, TUpdateData, TFilters extends Record<string, string | number | boolean | null | undefined>>(
    ServiceClass: new (apiClient: ApiClient, endpoint: string) => BaseService<TEntity, TCreateData, TUpdateData, TFilters>,
    config: ServiceConfig
  ): BaseService<TEntity, TCreateData, TUpdateData, TFilters> {
    const apiClient = config.apiClient || defaultApiClient;
    return new ServiceClass(apiClient, config.endpoint);
  }

  /**
   * Cria múltiplos serviços de uma vez
   */
  static createServices<T extends Record<string, { ServiceClass: new (apiClient: ApiClient, endpoint: string) => BaseService<object, object, object, Record<string, string | number | boolean | null | undefined>>; config: ServiceConfig }>>(
    services: T
  ): { [K in keyof T]: BaseService<object, object, object, Record<string, string | number | boolean | null | undefined>> } {
    const result = {} as { [K in keyof T]: BaseService<object, object, object, Record<string, string | number | boolean | null | undefined>> };
    
    for (const [key, service] of Object.entries(services)) {
      result[key as keyof T] = this.createService(
        service.ServiceClass,
        service.config
      ) as BaseService<object, object, object, Record<string, string | number | boolean | null | undefined>>;
    }
    
    return result;
  }
}

