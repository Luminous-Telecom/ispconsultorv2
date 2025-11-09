// Exportações centralizadas dos componentes core dos serviços
export { ApiClient, defaultApiClient } from './ApiClient';
export { setAuthToken, removeAuthToken, getAuthToken } from './auth';
export { ErrorHandler, ErrorType, type ApiError } from './ErrorHandler';
export { ResponseTransformer } from './ResponseTransformer';
export { BaseService, type BaseFilters } from './BaseService';
export { ServiceFactory, type ServiceConfig } from './ServiceFactory';

