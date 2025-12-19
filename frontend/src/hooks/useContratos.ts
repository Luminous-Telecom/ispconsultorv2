import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ContratoService } from '../services/contratoService';

export interface Contrato {
  id: number;
  cliente_id: number;
  plano_id: number;
  desconto_percentual: number | null;
  desconto_valor: number | null;
  valor_final: number | null;
  data_inicio: string | null;
  data_fim: string | null;
  status: 'ativo' | 'inativo' | 'suspenso';
  observacoes: string | null;
  isento_mensalidade: boolean;
  dia_vencimento_id: number | null;
  conta_boleto: number | null;
  data_validade_desconto: string | null;
  modelo_documento_id: number | null;
  created_at: string;
  updated_at: string;
  cliente?: {
    id: number;
    razao_social: string;
    nome_fantasia: string;
    endereco?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
  };
  plano?: {
    id: number;
    nome_plano: string;
    valor_mensal: number;
  };
  bancoBoleto?: {
    id: number;
    nome: string;
  };
}

export interface CreateContratoData {
  cliente_id: number;
  plano_id: number;
  desconto_percentual?: number;
  desconto_valor?: number;
  data_inicio?: string;
  data_fim?: string;
  status?: 'ativo' | 'inativo' | 'suspenso';
  observacoes?: string;
  isento_mensalidade?: boolean;
  dia_vencimento_id: number;
  conta_boleto: number;
  data_validade_desconto?: string;
  modelo_documento_id: number;
}

export interface UpdateContratoData extends Partial<CreateContratoData> {
  id: number;
}

export const useContratos = (clienteId?: number) => {
  return useQuery({
    queryKey: ['contratos', clienteId],
    queryFn: () => clienteId ? ContratoService.getByCliente(clienteId) : ContratoService.getAtivos(),
    enabled: !!clienteId,
  });
};

export const useCreateContrato = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateContratoData) => ContratoService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
    },
  });
};

export const useUpdateContrato = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: UpdateContratoData) => ContratoService.update(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
    },
  });
};

export const useDeleteContrato = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => ContratoService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
    },
  });
};
