import React, { useMemo } from 'react';
import EmbeddedTablePanel from 'components/common/EmbeddedTablePanel';
import type { BulkAction } from 'components/tables/types';
import type { SaasTenantUsuario } from 'services/saas/saasTenantUsuariosService';
import type { UseTableFiltersReturn } from 'hooks/useTableFilters';
import type { SaasEmpresaTranslateFn } from '../types';
import { buildUsuariosColumns, buildUsuariosSearchFields } from '../saasEmpresaTableColumns';

interface UsuariosSectionProps {
  empresaId: number;
  usuarios: SaasTenantUsuario[];
  usuariosData: unknown;
  usuariosTf: UseTableFiltersReturn;
  usuariosBulkActions: BulkAction<SaasTenantUsuario>[];
  t: SaasEmpresaTranslateFn;
  onRowDoubleClick: (i: SaasTenantUsuario) => void;
  onRefresh: () => void;
}

const UsuariosSection: React.FC<UsuariosSectionProps> = ({
  empresaId,
  usuarios,
  usuariosData,
  usuariosTf,
  usuariosBulkActions,
  t,
  onRowDoubleClick,
  onRefresh,
}) => {
  const columns = useMemo(() => buildUsuariosColumns(t), [t]);
  const searchFields = useMemo(() => buildUsuariosSearchFields(t), [t]);

  return (
    <EmbeddedTablePanel
      key={`saas-usuarios-${empresaId}`}
      title="Usuários"
      config={{
        columns,
        data: usuarios,
        loading: !usuariosData,
        emptyMessage: 'Nenhum usuário cadastrado',
        searchable: true,
        searchPlaceholder: '',
        searchField: usuariosTf.searchField || 'nome',
        searchFields,
        sortable: true,
        sortColumn: usuariosTf.sortColumn,
        sortDirection: usuariosTf.sortDirection,
        striped: true,
        hover: true,
        responsive: true,
        selectable: true,
        multiSelect: false,
        bulkActions: usuariosBulkActions,
        className: 'no-padding',
      }}
      onRowDoubleClick={onRowDoubleClick}
      onRefresh={onRefresh}
      onSort={usuariosTf.setSort}
      onSearch={(s, f) => { usuariosTf.setSearch(s); if (f) usuariosTf.setSearchField(f); }}
      onSearchFieldChange={(f) => usuariosTf.setSearchField(f)}
      search={usuariosTf.search}
    />
  );
};

export default UsuariosSection;
