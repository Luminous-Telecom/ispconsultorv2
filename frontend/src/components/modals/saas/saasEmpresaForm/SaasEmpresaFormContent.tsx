import React from 'react';
import type { BulkAction } from 'components/tables/types';
import type { SaasContrato, SaasTitulo } from 'services/saas/saasCrudService';
import type { SaasTenantUsuario } from 'services/saas/saasTenantUsuariosService';
import type { AuditoriaLog } from 'services/auditoriaService';
import type { UseTableFiltersReturn } from 'hooks/useTableFilters';
import { getFormDataForAddress } from './utils';
import type {
  SaasEmpresaForm,
  SaasEmpresaFormErrors,
  SaasEmpresaTabId,
  SaasEmpresaTranslateFn,
  StatusEmpresa,
} from './types';
import DadosBasicosSection from './sections/DadosBasicosSection';
import EnderecoSection from './sections/EnderecoSection';
import ContatoSection from './sections/ContatoSection';
import ContratosSection from './sections/ContratosSection';
import UsuariosSection from './sections/UsuariosSection';
import FinanceiroSection from './sections/FinanceiroSection';
import LogsSection from './sections/LogsSection';

interface SaasEmpresaFormContentProps {
  activeTab: SaasEmpresaTabId;
  empresaId: number | null;
  form: SaasEmpresaForm;
  errors: SaasEmpresaFormErrors;
  isEditing: boolean;
  formDataForAddress: ReturnType<typeof getFormDataForAddress>;
  validarCep?: boolean;
  isMobile: boolean;
  t: SaasEmpresaTranslateFn;
  onInputChange: (field: keyof SaasEmpresaForm, value: string) => void;
  onFieldChange: (field: keyof SaasEmpresaForm, value: string) => void;
  contratos: SaasContrato[];
  contratosRaw: SaasContrato[];
  contratosData: unknown;
  statusEmpresa?: StatusEmpresa;
  contratosTf: UseTableFiltersReturn;
  showInativosContratos: boolean;
  setShowInativosContratos: (show: boolean) => void;
  contratosBulkActions: BulkAction<SaasContrato>[];
  onContratoRowDoubleClick: (i: SaasContrato) => void;
  refetchContratos: () => void;
  onContratoAudit: (i: SaasContrato) => void;
  usuarios: SaasTenantUsuario[];
  usuariosData: unknown;
  usuariosTf: UseTableFiltersReturn;
  usuariosBulkActions: BulkAction<SaasTenantUsuario>[];
  onUsuarioRowDoubleClick: (i: SaasTenantUsuario) => void;
  refetchUsuarios: () => void;
  titulos: SaasTitulo[];
  titulosParaFiltro: SaasTitulo[];
  titulosData: unknown;
  titulosTf: UseTableFiltersReturn;
  showCanceladosTitulos: boolean;
  setShowCanceladosTitulos: (show: boolean) => void;
  titulosBulkActions: BulkAction<SaasTitulo>[];
  onTituloSelectionChange: (items: SaasTitulo[]) => void;
  onTituloRowDoubleClick: (i: SaasTitulo) => void;
  refetchTitulos: () => void;
  onTituloAudit: (i: SaasTitulo) => void;
  logsData: {
    data?: AuditoriaLog[];
    pagination?: Record<string, unknown>;
  } | undefined;
  logsTf: UseTableFiltersReturn;
  refetchLogs: () => void;
  onViewLog: (log: AuditoriaLog) => void;
}

const SaasEmpresaFormContent: React.FC<SaasEmpresaFormContentProps> = ({
  activeTab,
  empresaId,
  form,
  errors,
  isEditing,
  formDataForAddress,
  validarCep,
  isMobile,
  t,
  onInputChange,
  onFieldChange,
  contratos,
  contratosRaw,
  contratosData,
  statusEmpresa,
  contratosTf,
  showInativosContratos,
  setShowInativosContratos,
  contratosBulkActions,
  onContratoRowDoubleClick,
  refetchContratos,
  onContratoAudit,
  usuarios,
  usuariosData,
  usuariosTf,
  usuariosBulkActions,
  onUsuarioRowDoubleClick,
  refetchUsuarios,
  titulos,
  titulosParaFiltro,
  titulosData,
  titulosTf,
  showCanceladosTitulos,
  setShowCanceladosTitulos,
  titulosBulkActions,
  onTituloSelectionChange,
  onTituloRowDoubleClick,
  refetchTitulos,
  onTituloAudit,
  logsData,
  logsTf,
  refetchLogs,
  onViewLog,
}) => {
  const isScrollableTab = activeTab === 'financeiro' || activeTab === 'contratos' || activeTab === 'usuarios' || activeTab === 'logs';

  return (
    <div className={`tab-content cliente-tab-content ${isScrollableTab ? 'cliente-tab-content-scrollable' : 'cliente-tab-content-padded'}`} id="saas-empresa-tab-content">
      {activeTab === 'dados-basicos' && (
        <DadosBasicosSection
          form={form}
          errors={errors}
          isEditing={isEditing}
          t={t}
          onInputChange={onInputChange}
          onFieldChange={onFieldChange}
        />
      )}

      {activeTab === 'endereco' && (
        <EnderecoSection
          formDataForAddress={formDataForAddress}
          errors={errors}
          validarCep={validarCep}
          onInputChange={onInputChange}
        />
      )}

      {activeTab === 'contato' && (
        <ContatoSection
          form={form}
          errors={errors}
          t={t}
          onInputChange={onInputChange}
          onFieldChange={onFieldChange}
        />
      )}

      {activeTab === 'contratos' && empresaId && (
        <ContratosSection
          empresaId={empresaId}
          contratos={contratos}
          contratosRaw={contratosRaw}
          contratosData={contratosData}
          statusEmpresa={statusEmpresa}
          contratosTf={contratosTf}
          showInativosContratos={showInativosContratos}
          setShowInativosContratos={setShowInativosContratos}
          contratosBulkActions={contratosBulkActions}
          isMobile={isMobile}
          t={t}
          onRowDoubleClick={onContratoRowDoubleClick}
          onRefresh={refetchContratos}
          onAudit={onContratoAudit}
        />
      )}

      {activeTab === 'usuarios' && empresaId && (
        <UsuariosSection
          empresaId={empresaId}
          usuarios={usuarios}
          usuariosData={usuariosData}
          usuariosTf={usuariosTf}
          usuariosBulkActions={usuariosBulkActions}
          t={t}
          onRowDoubleClick={onUsuarioRowDoubleClick}
          onRefresh={refetchUsuarios}
        />
      )}

      {activeTab === 'financeiro' && empresaId && (
        <FinanceiroSection
          empresaId={empresaId}
          titulos={titulos}
          titulosParaFiltro={titulosParaFiltro}
          titulosData={titulosData}
          titulosTf={titulosTf}
          showCanceladosTitulos={showCanceladosTitulos}
          setShowCanceladosTitulos={setShowCanceladosTitulos}
          titulosBulkActions={titulosBulkActions}
          isMobile={isMobile}
          t={t}
          onRefresh={refetchTitulos}
          onSelectionChange={onTituloSelectionChange}
          onRowDoubleClick={onTituloRowDoubleClick}
          onAudit={onTituloAudit}
        />
      )}

      {activeTab === 'logs' && empresaId && (
        <LogsSection
          empresaId={empresaId}
          logsData={logsData}
          logsTf={logsTf}
          activeTab={activeTab}
          t={t}
          onRefresh={refetchLogs}
          onViewLog={onViewLog}
        />
      )}
    </div>
  );
};

export default SaasEmpresaFormContent;
