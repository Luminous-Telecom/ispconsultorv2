import { useCallback, useState } from 'react';
import { useAuditoriaDetalheEs } from 'hooks/useAuditoriaDetalheEs';
import type { AuditoriaLog } from 'services/auditoriaService';

export function useSaasEmpresaLogsState() {
  const [selectedLog, setSelectedLog] = useState<AuditoriaLog | null>(null);
  const [showLogDetailsModal, setShowLogDetailsModal] = useState(false);

  const handleViewLog = useCallback((log: AuditoriaLog) => {
    setSelectedLog(log);
    setShowLogDetailsModal(true);
  }, []);

  const {
    exibirDetalhe: logExibirDetalhe,
    showEsLoading: auditoriaDetalheEsLoading,
    esIndisponivel: auditoriaEsIndisponivel,
    temVinculoEs: auditoriaTemVinculoEs,
  } = useAuditoriaDetalheEs({
    selected: selectedLog,
    showDetails: showLogDetailsModal,
    saas: true,
    queryKeyPrefix: 'saas-empresa-log-detalhe-es',
  });

  const closeLogDetailsModal = useCallback(() => {
    setShowLogDetailsModal(false);
    setSelectedLog(null);
  }, []);

  return {
    selectedLog,
    showLogDetailsModal,
    handleViewLog,
    logExibirDetalhe,
    auditoriaDetalheEsLoading,
    auditoriaEsIndisponivel,
    auditoriaTemVinculoEs,
    closeLogDetailsModal,
  };
}
