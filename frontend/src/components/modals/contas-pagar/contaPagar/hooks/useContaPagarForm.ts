import { useState, useEffect } from 'react';
import { ContaPagar } from 'types';
import type { ContaPagarFormData, ContaPagarFormErrors } from '../types';
import { initialFormData, mapContaPagarToFormData, validateContaPagarForm, buildContaPagarSubmitData } from '../utils';
import type { useContaPagarQueries } from './useContaPagarQueries';

interface FornecedorSelect {
  setSelectedId: (id: number) => void;
}

interface UseContaPagarFormParams {
  show: boolean;
  isEditing: boolean;
  contaPagar: ContaPagar | undefined;
  contaPagarId: number | null;
  fornecedorSelect: FornecedorSelect;
  createMutation: ReturnType<typeof useContaPagarQueries>['createMutation'];
  updateMutation: ReturnType<typeof useContaPagarQueries>['updateMutation'];
  onSuccess?: () => void;
}

export const useContaPagarForm = ({
  show,
  isEditing,
  contaPagar,
  contaPagarId,
  fornecedorSelect,
  createMutation,
  updateMutation,
  onSuccess
}: UseContaPagarFormParams) => {
  const [formData, setFormData] = useState<ContaPagarFormData>(initialFormData);
  const [errors, setErrors] = useState<ContaPagarFormErrors>({});

  useEffect(() => {
    if (!show) {
      setFormData(initialFormData);
      setErrors({});
      fornecedorSelect.setSelectedId(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  useEffect(() => {
    if (!show) return;

    if (isEditing && contaPagar) {
      setFormData(mapContaPagarToFormData(contaPagar));
      fornecedorSelect.setSelectedId(contaPagar.fornecedor_id);
    } else if (!isEditing) {
      setFormData(initialFormData);
      fornecedorSelect.setSelectedId(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, contaPagar, isEditing]);

  const validateForm = (): boolean => {
    const newErrors = validateContaPagarForm(formData);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const submitData = buildContaPagarSubmitData(formData);

    try {
      if (isEditing && contaPagarId) {
        await updateMutation.mutateAsync({ id: contaPagarId, data: submitData });
      } else {
        await createMutation.mutateAsync(submitData);
      }
      onSuccess?.();
    } catch {
      // Erro já tratado pelo hook
    }
  };

  return {
    formData,
    setFormData,
    errors,
    setErrors,
    handleSubmit
  };
};
