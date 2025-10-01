import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ContratoService } from '../services/ContratoService';

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
  dia_vencimento: number | null;
  conta_boleto: number | null;
  data_validade_desconto: string | null;
  created_at: string;
  updated_at: string;
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
  dia_vencimento?: number;
  conta_boleto?: number;
  data_validade_desconto?: string;
}

export interface UpdateContratoData extends Partial<CreateContratoData> {
  id: number;
}

export const useContratos = (clienteId?: number) => {
  return useQuery({
    queryKey: ['contratos', clienteId],
    queryFn: () => ContratoService.getByCliente(clienteId!),
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
    mutationFn: ({ id, ...data }: UpdateContratoData) => ContratoService.update(id, data),
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
