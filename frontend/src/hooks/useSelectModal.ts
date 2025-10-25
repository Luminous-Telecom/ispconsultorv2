import { useState, useCallback } from 'react';

interface UseSelectModalReturn {
  showModal: boolean;
  openModal: () => void;
  closeModal: () => void;
  toggleModal: () => void;
}

export const useSelectModal = (): UseSelectModalReturn => {
  const [showModal, setShowModal] = useState(false);

  const openModal = useCallback(() => {
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
  }, []);

  const toggleModal = useCallback(() => {
    setShowModal(prev => !prev);
  }, []);

  return {
    showModal,
    openModal,
    closeModal,
    toggleModal
  };
};
