import { useState, useCallback } from 'react';

interface UseSeleBackNetodalReturn {
  showModal: boolean;
  openModal: () => void;
  closeModal: () => void;
  toggleModal: () => void;
}

export const useSeleBackNetodal = (): UseSeleBackNetodalReturn => {
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
