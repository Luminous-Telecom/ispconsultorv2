import React from 'react';
import { useI18n } from 'contexts/I18nContext';
import { AuditoriaLog } from 'services/auditoriaService';
import MensagemDetalhesModal from 'components/modals/comunicacao/MensagemDetalhesModal';
import AuditoriaDetalhesModal from 'components/modals/auditoria/AuditoriaDetalhesModal';
import BlockdomiLogsRealModal from 'components/modals/blockdomi/BlockdomiLogsRealModal';
import WhoisModal from 'components/modals/blockdomi/WhoisModal';
import type { MensagemItem } from './types';

interface LogsModalSubModalsProps {
  isBlockdomiApi: boolean;
  showBlockdomiLogsReal: boolean;
  setShowBlockdomiLogsReal: (v: boolean) => void;
  whoisIp: string | null;
  setWhoisIp: (ip: string | null) => void;
  showDetailsModal: boolean;
  setShowDetailsModal: (v: boolean) => void;
  setSelectedAuditoria: (v: AuditoriaLog | null) => void;
  setSelectedMensagem: (v: MensagemItem | null) => void;
  selectedMensagem: MensagemItem | null;
  auditoriaExibirDetalhe: AuditoriaLog | null;
  showEmpresaColumn: boolean;
  auditoriaDetalheEsLoading: boolean;
  auditoriaEsIndisponivel: boolean;
  auditoriaTemVinculoEs: boolean;
}

const LogsModalSubModals: React.FC<LogsModalSubModalsProps> = ({
  isBlockdomiApi,
  showBlockdomiLogsReal,
  setShowBlockdomiLogsReal,
  whoisIp,
  setWhoisIp,
  showDetailsModal,
  setShowDetailsModal,
  setSelectedAuditoria,
  setSelectedMensagem,
  selectedMensagem,
  auditoriaExibirDetalhe,
  showEmpresaColumn,
  auditoriaDetalheEsLoading,
  auditoriaEsIndisponivel,
  auditoriaTemVinculoEs,
}) => {
  const { t } = useI18n();

  const detailsModal = (() => {
    if (auditoriaExibirDetalhe) {
      return (
        <AuditoriaDetalhesModal
          show={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedAuditoria(null);
          }}
          detalhe={auditoriaExibirDetalhe}
          modalId="logs-auditoria-details"
          showEmpresaColumn={showEmpresaColumn}
          empresaNomeFieldLabel={t('audit.tenants')}
          showClienteColumn={showEmpresaColumn}
          esLoading={auditoriaDetalheEsLoading}
          esIndisponivel={auditoriaEsIndisponivel}
          temVinculoEs={auditoriaTemVinculoEs}
        />
      );
    }
    if (selectedMensagem) {
      return (
        <MensagemDetalhesModal
          show={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedMensagem(null);
          }}
          mensagem={selectedMensagem}
        />
      );
    }
    return null;
  })();

  const blockdomiSubModals = isBlockdomiApi && (
    <>
      <BlockdomiLogsRealModal show={showBlockdomiLogsReal} onClose={() => setShowBlockdomiLogsReal(false)} />
      <WhoisModal show={!!whoisIp} onClose={() => setWhoisIp(null)} ip={whoisIp ?? ''} />
    </>
  );

  return (
    <>
      {detailsModal}
      {blockdomiSubModals}
    </>
  );
};

export default LogsModalSubModals;
