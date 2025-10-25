import { useState, useCallback } from 'react';
import { ListModalConfig } from '../types/modal';

interface UseListModalReturn<T> {
  showModal: boolean;
  openModal: () => void;
  closeModal: () => void;
  toggleModal: () => void;
  config: ListModalConfig<T>;
  setConfig: (config: ListModalConfig<T>) => void;
  search: string;
  setSearch: (search: string) => void;
  page: number;
  setPage: (page: number) => void;
  limit: number;
  setLimit: (limit: number) => void;
}

export const useListModal = <T,>(
  initialConfig: ListModalConfig<T>
): UseListModalReturn<T> => {
  const [showModal, setShowModal] = useState(false);
  const [config, setConfig] = useState<ListModalConfig<T>>(initialConfig);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

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
    toggleModal,
    config,
    setConfig,
    search,
    setSearch,
    page,
    setPage,
    limit,
    setLimit
  };
};
