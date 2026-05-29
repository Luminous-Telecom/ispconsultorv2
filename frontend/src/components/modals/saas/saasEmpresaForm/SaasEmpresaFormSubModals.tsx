import React from 'react';
import type { AuditoriaLog } from 'services/auditoriaService';
import ImprimirModal from 'components/common/ImprimirModal';
import AuditoriaDetalhesModal from 'components/modals/auditoria/AuditoriaDetalhesModal';
import SaasContratoFormModal from '../SaasContratoFormModal';
import SaasTenantUsuarioFormModal from '../SaasTenantUsuarioFormModal';
import SaasTituloFormModal from '../SaasTituloFormModal';
import SaasReceberModal from '../SaasReceberModal';
import type { SaasTitulo } from 'services/saas/saasCrudService';
import type { SaasEmpresaForm, SaasEmpresaTranslateFn, StatusEmpresa } from './types';

interface SaasEmpresaFormSubModalsProps {
  empresaId: number | null;
  form: SaasEmpresaForm;
  statusEmpresa?: StatusEmpresa;
  t: SaasEmpresaTranslateFn;
  showContratoCreate: boolean;
  setShowContratoCreate: (show: boolean) => void;
  showContratoEdit: boolean;
  setShowContratoEdit: (show: boolean) => void;
  selectedContratoId: number | null;
  setSelectedContratoId: (id: number | null) => void;
  showUsuarioCreate: boolean;
  setShowUsuarioCreate: (show: boolean) => void;
  showUsuarioEdit: boolean;
  setShowUsuarioEdit: (show: boolean) => void;
  selectedUsuarioId: number | null;
  setSelectedUsuarioId: (id: number | null) => void;
  showTituloCreate: boolean;
  setShowTituloCreate: (show: boolean) => void;
  showImprimirModal: boolean;
  setShowImprimirModal: (show: boolean) => void;
  pdfUrl: string | null;
  isGeneratingPdf: boolean;
  clearPdfUrl: () => void;
  showReceberModal: boolean;
  setShowReceberModal: (show: boolean) => void;
  tituloReceber: SaasTitulo | null;
  setTituloReceber: (titulo: SaasTitulo | null) => void;
  refetchContratos: () => void;
  refetchUsuarios: () => void;
  refetchTitulos: () => void;
  auditoriaShowPreview: boolean;
  auditoriaPdfUrl: string | null;
  auditoriaIsGenerating: boolean;
  onCloseAuditoriaPreview: () => void;
  showLogDetailsModal: boolean;
  closeLogDetailsModal: () => void;
  logExibirDetalhe: AuditoriaLog | null;
  auditoriaDetalheEsLoading: boolean;
  auditoriaEsIndisponivel: boolean;
  auditoriaTemVinculoEs: boolean;
}

const SaasEmpresaFormSubModals: React.FC<SaasEmpresaFormSubModalsProps> = ({
  empresaId,
  form,
  statusEmpresa,
  t,
  showContratoCreate,
  setShowContratoCreate,
  showContratoEdit,
  setShowContratoEdit,
  selectedContratoId,
  setSelectedContratoId,
  showUsuarioCreate,
  setShowUsuarioCreate,
  showUsuarioEdit,
  setShowUsuarioEdit,
  selectedUsuarioId,
  setSelectedUsuarioId,
  showTituloCreate,
  setShowTituloCreate,
  showImprimirModal,
  setShowImprimirModal,
  pdfUrl,
  isGeneratingPdf,
  clearPdfUrl,
  showReceberModal,
  setShowReceberModal,
  tituloReceber,
  setTituloReceber,
  refetchContratos,
  refetchUsuarios,
  refetchTitulos,
  auditoriaShowPreview,
  auditoriaPdfUrl,
  auditoriaIsGenerating,
  onCloseAuditoriaPreview,
  showLogDetailsModal,
  closeLogDetailsModal,
  logExibirDetalhe,
  auditoriaDetalheEsLoading,
  auditoriaEsIndisponivel,
  auditoriaTemVinculoEs,
}) => (
  <>
    <SaasContratoFormModal
      show={showContratoCreate}
      onClose={() => setShowContratoCreate(false)}
      empresaId={empresaId!}
      dataFimDesbloqueioManual={statusEmpresa?.data_fim_desbloqueio_manual}
      onSuccess={() => refetchContratos()}
    />
    <SaasContratoFormModal
      show={showContratoEdit && !!selectedContratoId}
      onClose={() => { setShowContratoEdit(false); setSelectedContratoId(null); }}
      itemId={selectedContratoId}
      empresaId={empresaId!}
      dataFimDesbloqueioManual={statusEmpresa?.data_fim_desbloqueio_manual}
      onSuccess={() => refetchContratos()}
    />
    <SaasTenantUsuarioFormModal
      show={showUsuarioCreate}
      onClose={() => setShowUsuarioCreate(false)}
      empresaId={empresaId!}
      onSuccess={() => refetchUsuarios()}
    />
    <SaasTenantUsuarioFormModal
      show={showUsuarioEdit && !!selectedUsuarioId}
      onClose={() => { setShowUsuarioEdit(false); setSelectedUsuarioId(null); }}
      usuarioId={selectedUsuarioId}
      empresaId={empresaId!}
      onSuccess={() => refetchUsuarios()}
    />
    <SaasTituloFormModal
      show={showTituloCreate}
      onClose={() => setShowTituloCreate(false)}
      empresaId={empresaId!}
      onSuccess={() => refetchTitulos()}
    />
    <ImprimirModal
      show={showImprimirModal}
      onClose={() => { setShowImprimirModal(false); clearPdfUrl(); }}
      pdfUrl={pdfUrl}
      isGenerating={isGeneratingPdf}
      title={t('financial.viewDocument')}
      modalId="saas-empresa-imprimir-modal"
    />
    <ImprimirModal
      show={auditoriaShowPreview}
      onClose={onCloseAuditoriaPreview}
      pdfUrl={auditoriaPdfUrl}
      isGenerating={auditoriaIsGenerating}
      title={t('modal.auditLogs')}
      modalId="saas-empresa-audit-pdf-modal"
    />
    <SaasReceberModal
      isOpen={showReceberModal}
      onClose={() => { setShowReceberModal(false); setTituloReceber(null); }}
      titulo={tituloReceber}
      empresaNome={form.nome_fantasia || form.razao_social}
      onSuccess={() => { setShowReceberModal(false); setTituloReceber(null); refetchTitulos(); refetchContratos(); }}
    />
    <AuditoriaDetalhesModal
      show={showLogDetailsModal}
      onClose={closeLogDetailsModal}
      detalhe={logExibirDetalhe}
      modalId="saas-log-details-modal"
      esLoading={auditoriaDetalheEsLoading}
      esIndisponivel={auditoriaEsIndisponivel}
      temVinculoEs={auditoriaTemVinculoEs}
    />
  </>
);

export default SaasEmpresaFormSubModals;
