/**
 * Tipos para o sistema BackNet - Frontend
 * 
 * Este arquivo serve como ponto central de exportação de todos os tipos.
 * 
 * 📁 Estrutura de Organização:
 * 
 * - entities.ts
 *   - Entidades do domínio (Cliente, Plano, Banco, Contrato, Titulo, Carne, CarneParcela)
 *   - DTOs (CreateTituloData, UpdateTituloData, CreateContratoData, UpdateContratoData)
 *   - Tipos auxiliares (StatusTitulo, StatusContrato, etc.)
 *   - Tipos de tabela (Column, BulkAction)
 *   - Outros tipos relacionados a entidades (RotinaAgendada, ValidationError)
 * 
 * - common.ts
 *   - Tipos comuns e utilitários (FormValue, FilterValue, TableValue, etc.)
 *   - Tipos genéricos para callbacks e handlers
 * 
 * - api.ts
 *   - Tipos de API (ApiResponse, PaginatedResponse, ApiError)
 *   - Tipos de paginação (Pagination)
 *   - Filtros base e específicos (BaseFilters, ClienteFilters, PlanoFilters, etc.)
 * 
 * - forms.ts
 *   - Tipos genéricos de formulário (FormData<T>, FormErrors<T>)
 *   - Tipos específicos de formulário (ClienteFormData, TituloFormData, ContratoFormData)
 *   - Erros de formulário (ClienteFormErrors, TituloFormErrors, ContratoFormErrors)
 * 
 * - modal.ts
 *   - Tipos de modais (ListModalProps, ListModalConfig, ListModalColumn)
 * 
 * - cliente.ts
 *   - Tipos específicos de cliente (mantido por compatibilidade)
 *   - (PlanoInfo, BancoInfo, ContratoItem, TituloItem, etc.)
 * 
 * 📝 Padrões de Uso:
 * 
 * - Importe sempre de 'types' (não diretamente dos arquivos específicos):
 *   ```typescript
 *   import { Cliente, ApiResponse, ClienteFormData } from '../types';
 *   ```
 * 
 * - Para tipos Create/Update, use os tipos derivados:
 *   ```typescript
 *   import { CreateCliente, UpdateCliente } from '../types';
 *   ```
 * 
 * - Para DTOs específicos do backend, use os DTOs de entities.ts:
 *   ```typescript
 *   import { CreateTituloData, UpdateTituloData } from '../types';
 *   ```
 * 
 * - Para filtros de API, use os tipos de api.ts:
 *   ```typescript
 *   import { ClienteFilters, PlanoFilters } from '../types';
 *   ```
 * 
 * - Para tipos de tabela, use os tipos de entities.ts ou components/tables/types.ts:
 *   ```typescript
 *   import { Column, BulkAction } from '../types'; // entities.ts
 *   import { TableColumn, TableConfig } from '../components/tables/types'; // componentes
 *   ```
 * 
 * 🔍 Resolução de Conflitos:
 * 
 * Se encontrar erros de tipo duplicado, verifique:
 * 1. Está importando do lugar correto? (sempre de 'types', não diretamente)
 * 2. O tipo está definido em múltiplos lugares? (consulte a estrutura acima)
 * 3. Use exportações seletivas quando necessário: `export type { Tipo } from './arquivo'`
 * 
 * 📚 Exemplos Completos:
 * 
 * ```typescript
 * // Exemplo 1: Componente de formulário
 * import { Cliente, ClienteFormData, ClienteFormErrors } from '../types';
 * 
 * const ClienteForm: React.FC = () => {
 *   const [formData, setFormData] = useState<ClienteFormData>({...});
 *   const [errors, setErrors] = useState<ClienteFormErrors>({});
 *   // ...
 * };
 * 
 * // Exemplo 2: Hook de API
 * import { ApiResponse, PaginatedResponse, ClienteFilters } from '../types';
 * 
 * const useClientes = (filters?: ClienteFilters) => {
 *   return useQuery<PaginatedResponse<Cliente>>({...});
 * };
 * 
 * // Exemplo 3: Serviço
 * import { Cliente, CreateCliente, UpdateCliente } from '../types';
 * 
 * const createCliente = async (data: CreateCliente): Promise<Cliente> => {
 *   // ...
 * };
 * ```
 */

import { Empresa, Cliente, Plano, Banco, Contrato, Carne, CarneParcela, Fornecedor, ContaPagar, CreateNotaFiscal, Dominio, IPv4, IPv6 } from './entities';

// Re-exportar tipos consolidados
export * from './entities';
export * from './common';
// Exportar api.ts primeiro para evitar duplicação com entities.ts
export * from './api';
// Exportar forms.ts (pode ter conflitos com entities.ts, então exportamos seletivamente)
export type { FormData, FormErrors, ClienteFormData, ClienteFormErrors, TituloFormData, TituloFormErrors, ContratoFormData, ContratoFormErrors } from './forms';
export * from './modal';
// Exportar cliente.ts seletivamente para evitar duplicações
export type { PlanoInfo, BancoInfo, ContratoItem, TituloItem, BulkActionItem, NotificationMessage } from './cliente';

// ============================================
// TIPOS DE FILTROS (mantidos aqui para compatibilidade)
// ============================================

// ClienteFilters está em api.ts

// Todos os filtros estão em api.ts agora
// Mantendo apenas para compatibilidade com código existente
export type { ClienteFilters, PlanoFilters, BancoFilters, CarneFilters, CarneParcelaFilters, FornecedorFilters, ContaPagarFilters, NotaFiscalFilters, DominioFilters, IPv4Filters, IPv6Filters, SshDeviceFilters, SshAuditFilters } from './api';

// ============================================
// TIPOS DE CRIAÇÃO E ATUALIZAÇÃO
// ============================================


export type CreateCliente = Omit<Cliente, 'id' | 'created_at' | 'updated_at' | 'data_cadastro' | 'central_assinante_senha'> & {
  central_assinante_senha?: string;
};
export type UpdateCliente = Partial<Omit<CreateCliente, 'central_assinante_senha'>> & {
  central_assinante_senha?: string | null;
};

export type CreatePlano = Omit<Plano, 'id' | 'created_at' | 'updated_at'>;
export type UpdatePlano = Partial<CreatePlano>;

export type CreateBanco = Omit<Banco, 'id' | 'created_at' | 'updated_at'>;
export type UpdateBanco = Partial<CreateBanco>;

export type CreateDominio = Omit<Dominio, 'id' | 'created_at' | 'updated_at' | 'created_at_formatada'>;
export type UpdateDominio = Partial<CreateDominio>;

export type CreateIPv4 = Omit<IPv4, 'id' | 'created_at' | 'updated_at' | 'created_at_formatada'>;
export type UpdateIPv4 = Partial<CreateIPv4>;

export type CreateIPv6 = Omit<IPv6, 'id' | 'created_at' | 'updated_at' | 'created_at_formatada'>;
export type UpdateIPv6 = Partial<CreateIPv6>;

export type CreateCarne = Omit<Carne, 'id' | 'created_at' | 'updated_at'>;
export type UpdateCarne = Partial<CreateCarne>;

export type CreateCarneParcela = Omit<CarneParcela, 'id' | 'created_at' | 'updated_at'>;
export type UpdateCarneParcela = Partial<CreateCarneParcela>;

export type CreateContrato = Omit<Contrato, 'id' | 'created_at' | 'updated_at'>;
export type UpdateContrato = Partial<CreateContrato>;

export type CreateFornecedor = Omit<Fornecedor, 'id' | 'created_at' | 'updated_at' | 'created_at_formatada'>;
export type UpdateFornecedor = Partial<CreateFornecedor>;

export type CreateContaPagar = Omit<ContaPagar, 'id' | 'created_at' | 'updated_at' | 'created_at_formatada' | 'saldo_devedor' | 'vencida'>;
export type UpdateContaPagar = Partial<CreateContaPagar>;

// CreateNotaFiscal já está definido em entities.ts e é exportado via export *
// UpdateNotaFiscal também é definido aqui
export type UpdateNotaFiscal = Partial<CreateNotaFiscal>;

// ============================================
// TIPOS PARA DASHBOARD E GRÁFICOS
// ============================================

export interface DashboardStats {
  total_clientes: number;
  clientes_ativos: number;
  total_planos: number;
  planos_ativos: number;
  total_bancos: number;
  bancos_ativos: number;
  total_carnes: number;
  carnes_ativos: number;
  carnes_pagos: number;
  carnes_pendentes: number;
  valor_total_carnes: number;
  valor_total_pago: number;
  valor_total_pendente: number;
}

export interface CepData {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
}

export interface GraficoData {
  label: string;
  value: number;
}

export interface GraficoCarnesPorStatus {
  status: string;
  total: number;
}

export interface GraficoClientesPorCidade {
  cidade: string;
  total: number;
}

export interface ResumoMensal {
  mes: number;
  ano: number;
  carnes_criados: number;
  parcelas_pagas: number;
  valor_total_pago: number;
  clientes_novos: number;
}
