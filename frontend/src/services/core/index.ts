// Exportações centralizadas dos componentes core dos serviços
export { ApiClient, defaultApiClient, setAuthToken, removeAuthToken, getAuthToken } from './ApiClient';
export { ErrorHandler, ErrorType, type ApiError } from './ErrorHandler';
export { ResponseTransformer } from './ResponseTransformer';
export { BaseService, type BaseFilters } from './BaseService';
export { ServiceFactory, type ServiceConfig } from './ServiceFactory';

