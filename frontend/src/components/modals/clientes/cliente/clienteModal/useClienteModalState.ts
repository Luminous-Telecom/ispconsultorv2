import { useState, useEffect, useCallback } from 'react';
import { CarneParcela } from 'types';
import { TituloItem } from 'types/cliente';
import { isEquipamentosTab, isRpkiTab } from './clienteParcelaUtils';

export function useClienteModalActiveTab(
  show: boolean,
  hasModuloEquipamentos: boolean,
  hasModuloRpki: boolean
) {
  const [activeTab, setActiveTab] = useState('dados-basicos');

  useEffect(() => {
    if (show) {
      setActiveTab('dados-basicos');
    }
  }, [show]);

  useEffect(() => {
    if (!hasModuloEquipamentos && isEquipamentosTab(activeTab)) {
      setActiveTab('dados-basicos');
    }
  }, [hasModuloEquipamentos, activeTab]);

  useEffect(() => {
    if (!hasModuloRpki && isRpkiTab(activeTab)) {
      setActiveTab('dados-basicos');
    }
  }, [hasModuloRpki, activeTab]);

  return { activeTab, setActiveTab };
}

export function useClienteModalNestedModals() {
  const [showTituloEditModal, setShowTituloEditModal] = useState(false);
  const [showReceberModal, setShowReceberModal] = useState(false);
  const [showContratoCreateModal, setShowContratoCreateModal] = useState(false);
  const [showContratoEditModal, setShowContratoEditModal] = useState(false);
  const [selectedContratoId, setSelectedContratoId] = useState<number | null>(null);
  const [selectedTituloId, setSelectedTituloId] = useState<number | null>(null);
  const [selectedParcela, setSelectedParcela] = useState<TituloItem | null>(null);
  const [showGerarNFeModal, setShowGerarNFeModal] = useState(false);
  const [selectedTituloForNFe, setSelectedTituloForNFe] = useState<CarneParcela | null>(null);

  const openTituloEditModal = useCallback((tituloId: number) => {
    setSelectedTituloId(tituloId);
    setShowTituloEditModal(true);
  }, []);

  const openReceberModal = useCallback((parcela: TituloItem) => {
    setSelectedParcela(parcela);
    setShowReceberModal(true);
  }, []);

  const openContratoEditModal = useCallback((contratoId: number) => {
    setSelectedContratoId(contratoId);
    setShowContratoEditModal(true);
  }, []);

  const openGerarNFeModal = useCallback((titulo?: CarneParcela) => {
    if (titulo) {
      setSelectedTituloForNFe(titulo);
    }
    setShowGerarNFeModal(true);
  }, []);

  const closeContratoModal = useCallback(() => {
    setShowContratoCreateModal(false);
    setShowContratoEditModal(false);
    setSelectedContratoId(null);
  }, []);

  const closeTituloEditModal = useCallback(() => {
    setShowTituloEditModal(false);
    setSelectedTituloId(null);
  }, []);

  const closeReceberModal = useCallback(() => {
    setShowReceberModal(false);
    setSelectedParcela(null);
  }, []);

  const closeGerarNFeModal = useCallback(() => {
    setShowGerarNFeModal(false);
    setSelectedTituloForNFe(null);
  }, []);

  return {
    showTituloEditModal,
    showReceberModal,
    showContratoCreateModal,
    showContratoEditModal,
    showGerarNFeModal,
    selectedContratoId,
    selectedTituloId,
    selectedParcela,
    selectedTituloForNFe,
    setShowTituloEditModal,
    setShowReceberModal,
    setShowContratoCreateModal,
    setShowContratoEditModal,
    setShowGerarNFeModal,
    setSelectedContratoId,
    setSelectedTituloId,
    setSelectedParcela,
    setSelectedTituloForNFe,
    openTituloEditModal,
    openReceberModal,
    openContratoEditModal,
    openGerarNFeModal,
    closeContratoModal,
    closeTituloEditModal,
    closeReceberModal,
    closeGerarNFeModal,
  };
}
