import { useState, useCallback } from 'react';

interface UseEntitySelectFieldReturn<T> {
  selectedId: number;
  showModal: boolean;
  setSelectedId: (id: number) => void;
  openModal: () => void;
  closeModal: () => void;
  handleSelect: (entity: T) => void;
}

export const useEntitySelectField = <T extends { id: number }>(
  initialId: number = 0
): UseEntitySelectFieldReturn<T> => {
  const [selectedId, setSelectedId] = useState<number>(initialId);
  const [showModal, setShowModal] = useState(false);

  const openModal = useCallback(() => {
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
  }, []);

  const handleSelect = useCallback((entity: T) => {
    setSelectedId(entity.id);
    setShowModal(false);
  }, []);

  return {
    selectedId,
    showModal,
    setSelectedId,
    openModal,
    closeModal,
    handleSelect
  };
};
