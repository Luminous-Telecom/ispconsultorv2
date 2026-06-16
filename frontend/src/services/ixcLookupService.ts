/**
 * Serviços de lookup do IXC (estruturas, técnicos) usados nos campos de seleção (lupa).
 */
import { BaseService, defaultApiClient } from './core';
import type { BaseFilters } from './core/BaseService';
import { PaginatedResponse } from '../types';

export interface LookupItem {
  id: string;
  nome: string;
}

export type LookupFilters = BaseFilters;

class LookupServiceClass extends BaseService<LookupItem, never, never, LookupFilters> {
  constructor(endpoint: string) {
    super(defaultApiClient, endpoint);
  }
}

const estruturaLookupService = new LookupServiceClass('/ixc/estruturas');
const filialLookupService = new LookupServiceClass('/ixc/filiais');
const tecnicoLookupService = new LookupServiceClass('/ixc/tecnicos');
const assuntoLookupService = new LookupServiceClass('/ixc/assuntos');
const setorLookupService = new LookupServiceClass('/ixc/setores');

export class EstruturaLookupService {
  static async list(filters: LookupFilters = {}): Promise<PaginatedResponse<LookupItem>> {
    return estruturaLookupService.list(filters);
  }
}

export class FilialLookupService {
  static async list(filters: LookupFilters = {}): Promise<PaginatedResponse<LookupItem>> {
    return filialLookupService.list(filters);
  }
}

export class TecnicoLookupService {
  static async list(filters: LookupFilters = {}): Promise<PaginatedResponse<LookupItem>> {
    return tecnicoLookupService.list(filters);
  }
}

export class AssuntoLookupService {
  static async list(filters: LookupFilters = {}): Promise<PaginatedResponse<LookupItem>> {
    return assuntoLookupService.list(filters);
  }
}

export class SetorLookupService {
  static async list(filters: LookupFilters = {}): Promise<PaginatedResponse<LookupItem>> {
    return setorLookupService.list(filters);
  }
}
