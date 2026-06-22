import { useCallback, useMemo, useState } from 'react';
import { getAuditoriaDetalheExibir } from 'utils/auditoriaOperacionalDetalhe';
import type { AuditoriaLog } from 'services/auditoriaService';

export function useSaasEmpresaLogsState() {
  const [selectedLog, setSelectedLog] = useState<AuditoriaLog | null>(null);
  const [showLogDetailsModal, setShowLogDetailsModal] = useState(false);

  const handleViewLog = useCallback((log: AuditoriaLog) => {
    setSelectedLog(log);
    setShowLogDetailsModal(true);
  }, []);

  const logExibirDetalhe = useMemo(
    () => getAuditoriaDetalheExibir(selectedLog, showLogDetailsModal),
    [selectedLog, showLogDetailsModal]
  );

  const closeLogDetailsModal = useCallback(() => {
    setShowLogDetailsModal(false);
    setSelectedLog(null);
  }, []);

  return {
    selectedLog,
    showLogDetailsModal,
    handleViewLog,
    logExibirDetalhe,
    closeLogDetailsModal,
  };
}
