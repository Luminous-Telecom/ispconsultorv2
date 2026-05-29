import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RpkiRoaFormMode, RpkiRoaRow } from './types';

interface RpkiCaRef {
  id: number;
  nome: string;
}

interface UseRpkiRoaListFormStateParams {
  show: boolean;
  roas: RpkiRoaRow[];
  cas: RpkiCaRef[];
  setRoas: React.Dispatch<React.SetStateAction<RpkiRoaRow[]>>;
}

export function useRpkiRoaListFormState({ show, roas, cas, setRoas }: UseRpkiRoaListFormStateParams) {
  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState<RpkiRoaFormMode>('create');
  const [editingRoaId, setEditingRoaId] = useState<number | string | null>(null);

  const editingRoa = useMemo(() => {
    if (editingRoaId === null) return null;
    return roas.find((r) => r.id === editingRoaId) ?? null;
  }, [editingRoaId, roas]);

  useEffect(() => {
    if (!show) {
      setShowFormModal(false);
      setEditingRoaId(null);
    }
  }, [show]);

  const handleCreate = useCallback(() => {
    setFormMode('create');
    setEditingRoaId(null);
    setShowFormModal(true);
  }, []);

  const handleEdit = useCallback((roaId: number | string) => {
    setFormMode('edit');
    setEditingRoaId(roaId);
    setShowFormModal(true);
  }, []);

  const handleFormClose = useCallback(() => {
    setShowFormModal(false);
  }, []);

  const handleFormSuccess = useCallback(
    (savedRoa: RpkiRoaRow) => {
      setRoas((prev) => {
        if (formMode === 'create') {
          const ca = cas.find((c) => c.id === Number(savedRoa.ca_id ?? 0));
          return [{ ...savedRoa, ca_nome: ca?.nome ?? '-' }, ...prev] as RpkiRoaRow[];
        }

        const savedId = savedRoa.id;
        if (savedId === undefined || savedId === null) return prev;

        return prev.map((r) => {
          if (r.id !== savedId) return r;
          const ca = cas.find((c) => c.id === Number(savedRoa.ca_id ?? r.ca_id ?? 0));
          return { ...r, ...savedRoa, ca_nome: ca?.nome ?? r.ca_nome, id: savedId } as RpkiRoaRow;
        });
      });
      setShowFormModal(false);
    },
    [cas, formMode, setRoas]
  );

  return {
    showFormModal,
    formMode,
    editingRoa,
    handleCreate,
    handleEdit,
    handleFormClose,
    handleFormSuccess,
  };
}
