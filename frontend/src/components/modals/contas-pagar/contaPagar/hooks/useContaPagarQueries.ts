import { useContaPagar, useCreateContaPagar, useUpdateContaPagar, usePagarContaPagar } from 'hooks/useContasPagar';
import { useFornecedores } from 'hooks/useFornecedores';

export const useContaPagarQueries = (contaPagarId: number | null) => {
  const isEditing = !!contaPagarId;
  const { data: contaPagar, isLoading: isLoadingContaPagar, refetch: refetchContaPagar } = useContaPagar(contaPagarId);
  const createMutation = useCreateContaPagar();
  const updateMutation = useUpdateContaPagar();
  const pagarMutation = usePagarContaPagar();
  const { data: fornecedoresData } = useFornecedores({ limit: 100 });

  return {
    isEditing,
    contaPagar,
    isLoadingContaPagar,
    refetchContaPagar,
    createMutation,
    updateMutation,
    pagarMutation,
    fornecedoresData
  };
};
