import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Table from 'components/tables/Table';
import { TableConfig } from 'components/tables/types';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { RpkiCaService } from 'services/rpkiCaService';
import { ClienteService } from 'services/clienteService';
import { useRpkiCas } from 'hooks/useRpkiCas';
import RpkiRoaCreateEditModal from './RpkiRoaCreateEditModal';
import RpkiRoaAnalysisModal from './RpkiRoaAnalysisModal';
import { formatDateTime, formatRpkiValidityDisplay } from 'utils/formatters';
import { useAuditoria } from 'hooks/useAuditoria';
import ImprimirModalBase from 'components/common/ImprimirModal';
import { useI18n } from 'contexts/I18nContext';
import { useModal } from 'contexts/ModalContext';

const AuditPdfModal = ImprimirModalBase;

interface RpkiRoaRow {
  id: number | string;
  ca_id?: number | null;
  ca_nome?: string;
  clienteNome?: string;
  prefix?: string;
  asn?: string;
  max_length?: number;
  not_before?: string;
  not_after?: string;
  status?: 'active' | 'revoked' | 'expired';
  revoked_at?: string;
}

interface RpkiRoaListModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  clienteIdFilter?: number;
  tableTitle?: string;
}

const RpkiRoaListModal: React.FC<RpkiRoaListModalProps> = ({
  show,
  clienteIdFilter,
  tableTitle = 'ROAs',
}) => {
  const { t } = useI18n();
  const { openModal } = useModal();
  const { error: showError, success } = useNotificationContext();
  const auditoria = useAuditoria();
  const handleAuditRoa = useCallback(
    (item: RpkiRoaRow) => {
      const id = Number(item.id);
      if (!Number.isFinite(id)) return;
      void auditoria.handleAudit('RpkiRoa', id);
    },
    [auditoria]
  );
  const auditLogsTitle = t('modal.auditLogs');
  const [roas, setRoas] = useState<RpkiRoaRow[]>([]);

  const [showFormModal, setShowFormModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisCaNome, setAnalysisCaNome] = useState('');
  const [analysisCaId, setAnalysisCaId] = useState<number>(0);
  const [analysisRows, setAnalysisRows] = useState<
    Array<{
      roa_id: number;
      prefix: string;
      asn: string;
      max_length: number;
      analysis_id: string;
      status: 'ok' | 'revoked' | 'expired' | 'inconsistent' | 'not_found';
      message: string;
      selectable: boolean;
    }>
  >([]);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingRoaId, setEditingRoaId] = useState<number | string | null>(null);

  const editingRoa = useMemo(() => {
    if (editingRoaId === null) return null;
    return roas.find((r) => r.id === editingRoaId) ?? null;
  }, [editingRoaId, roas]);

  const { cas } = useRpkiCas(clienteIdFilter);

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-rpki'],
    queryFn: async () => {
      const response = await ClienteService.list({ limit: 1000 });
      return response.data ?? [];
    },
    enabled: show && clienteIdFilter == null,
  });

  const clienteNomeById = useMemo(() => {
    const map = new Map<number, string>();
    for (const cliente of clientes) {
      map.set(cliente.id, cliente.razao_social || cliente.nome_fantasia || '');
    }
    return map;
  }, [clientes]);

  const clienteNomeForCa = useCallback(
    (ca: { cliente_id: number | null }) =>
      ca.cliente_id != null ? clienteNomeById.get(ca.cliente_id) ?? '—' : '—',
    [clienteNomeById]
  );

  const caById = useMemo(() => new Map(cas.map((c) => [c.id, c])), [cas]);

  const roasForTable = useMemo(
    () =>
      roas.map((r) => {
        const ca = caById.get(Number(r.ca_id ?? 0));
        const clienteNome = ca != null ? clienteNomeForCa(ca) : '—';
        return { ...r, clienteNome };
      }),
    [roas, caById, clienteNomeForCa]
  );

  useEffect(() => {
    if (!show || cas.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const all = await Promise.all(
          cas.map(async (ca) => {
            const rows = await RpkiCaService.listRoas(ca.id);
            return rows.map((row) => ({
              id: row.id,
              ca_id: row.ca_id,
              ca_nome: ca.nome,
              prefix: row.prefix,
              asn: row.asn,
              max_length: row.max_length,
              not_before: row.not_before,
              not_after: row.not_after,
              status: row.status,
              revoked_at: row.revoked_at ?? undefined,
            })) as RpkiRoaRow[];
          })
        );
        if (!cancelled) {
          setRoas(all.flat().sort((a, b) => Number(b.id) - Number(a.id)));
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Erro ao carregar ROAs';
          showError(msg);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [show, cas, showError]);

  const tableColumns: TableConfig<RpkiRoaRow>['columns'] = useMemo(() => {
    const cols: TableConfig<RpkiRoaRow>['columns'] = [
      { key: 'id', label: 'ID', sortable: true, width: '42px', render: (item) => String(item.id ?? '-') },
      { key: 'ca_nome', label: 'CA', sortable: true, width: '180px', render: (item) => String(item.ca_nome ?? '-') },
    ];
    if (clienteIdFilter == null) {
      cols.push({
        key: 'clienteNome',
        label: 'Cliente',
        sortable: true,
        width: '220px',
        render: (item) => String(item.clienteNome ?? '—'),
      });
    }
    cols.push(
    { key: 'prefix', label: 'Prefixo', sortable: true, width: '170px', render: (item) => String(item.prefix ?? '-') },
    { key: 'asn', label: 'ASN', sortable: true, width: '110px', render: (item) => String(item.asn ?? '-') },
    { key: 'max_length', label: 'Max Length', sortable: true, width: '110px', render: (item) => String(item.max_length ?? '-') },
    {
      key: 'not_before',
      label: 'Válido de',
      sortable: true,
      width: '165px',
      render: (item) => formatRpkiValidityDisplay(item.not_before ?? null),
    },
    {
      key: 'not_after',
      label: 'Válido até',
      sortable: true,
      width: '165px',
      render: (item) => formatRpkiValidityDisplay(item.not_after ?? null),
    },
    {
      key: 'revoked_at',
      label: 'Revogado em',
      sortable: true,
      width: '165px',
      render: (item) => (item.revoked_at ? formatDateTime(item.revoked_at) : '-'),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      badgeLabels: ['active', 'revoked', 'expired'],
      render: (item) => {
        const status = String(item.status ?? 'active');
        const labels: Record<string, string> = { active: 'Ativo', revoked: 'Revogado', expired: 'Expirado' };
        const cor = status === 'active' ? 'bg-success' : status === 'revoked' ? 'bg-warning' : 'bg-secondary';
        return <span className={`badge ${cor}`}>{labels[status] ?? status}</span>;
      },
    });
    return cols;
  }, [clienteIdFilter]);

  const searchFields = useMemo(() => {
    const fields = [
      { key: 'id', label: 'ID' },
      { key: 'ca_nome', label: 'CA' },
    ];
    if (clienteIdFilter == null) {
      fields.push({ key: 'clienteNome', label: 'Cliente' });
    }
    fields.push(
      { key: 'prefix', label: 'Prefixo' },
      { key: 'asn', label: 'ASN' },
      { key: 'status', label: 'Status' }
    );
    return fields;
  }, [clienteIdFilter]);

  const bulkActions = useMemo(() => [
    {
      label: t('buttons.new'),
      variant: 'primary' as const,
      requiresSelection: false,
      action: (_selectedItems: RpkiRoaRow[]) => {
        setFormMode('create');
        setEditingRoaId(null);
        setShowFormModal(true);
      },
    },
    {
      label: 'Editar',
      variant: 'primary' as const,
      disabled: false,
      action: (selectedItems: RpkiRoaRow[]) => {
        const selected = selectedItems[0];
        if (!selected) return;
        setFormMode('edit');
        setEditingRoaId(selected.id);
        setShowFormModal(true);
      },
    },
    {
      label: 'Deletar',
      variant: 'primary' as const,
      disabled: false,
      action: (selectedItems: RpkiRoaRow[]) => {
        const selected = selectedItems[0];
        if (!selected) return;

        const confirmed = window.confirm(
          'Deseja deletar este ROA permanentemente? Esta ação não pode ser desfeita.'
        );
        if (!confirmed) return;

        const caId = Number(selected.ca_id ?? 0);
        const roaId = Number(selected.id);
        if (!Number.isFinite(caId) || caId <= 0 || !Number.isFinite(roaId) || roaId <= 0) return;
        RpkiCaService.deleteRoa({ caId, roaId })
          .then(() => {
            setRoas((prev) => prev.filter((r) => r.id !== selected.id));
            success('ROA excluído com sucesso');
          })
          .catch((err) => {
            const msg = err instanceof Error ? err.message : 'Erro ao excluir ROA';
            showError(msg);
          });
      },
    },
    {
      label: 'Revogar',
      variant: 'primary' as const,
      disabled: false,
      action: (selectedItems: RpkiRoaRow[]) => {
        const selected = selectedItems[0];
        if (!selected) return;

        const confirmed = window.confirm('Tem certeza que deseja revogar este ROA?');
        if (!confirmed) return;

        const caId = Number(selected.ca_id ?? 0);
        const roaId = Number(selected.id);
        if (!Number.isFinite(caId) || caId <= 0 || !Number.isFinite(roaId) || roaId <= 0) return;
        RpkiCaService.revokeRoa({ caId, roaId })
          .then((updated) => {
            setRoas((prev) =>
              prev.map((r) => (r.id === selected.id ? { ...r, status: updated.status, revoked_at: updated.revoked_at ?? undefined } : r))
            );
            success('ROA revogada com sucesso');
          })
          .catch((err) => {
            const msg = err instanceof Error ? err.message : 'Erro ao revogar ROA';
            showError(msg);
          });
      },
    },
    {
      label: 'Analisar ROAs',
      variant: 'primary' as const,
      requiresSelection: false,
      disabled: false,
      action: (selectedItems: RpkiRoaRow[]) => {
        const selected = selectedItems[0];
        const uniqueCaIds = Array.from(
          new Set(
            roas
              .map((row) => Number(row.ca_id ?? 0))
              .filter((id) => Number.isFinite(id) && id > 0)
          )
        );
        const availableCaIds = Array.from(
          new Set(
            cas
              .map((ca) => Number(ca.id))
              .filter((id) => Number.isFinite(id) && id > 0)
          )
        );

        const caIdsForGlobal = uniqueCaIds.length > 0 ? uniqueCaIds : availableCaIds;

        if (caIdsForGlobal.length === 0) {
          window.alert('Nenhuma CA encontrada para análise.');
          return;
        }

        const selectedCaId = Number(selected?.ca_id ?? 0);
        const targetCaIds =
          Number.isFinite(selectedCaId) && selectedCaId > 0
            ? [selectedCaId]
            : caIdsForGlobal;

        Promise.all(targetCaIds.map((caId) => RpkiCaService.analyzeRoas(caId).then((analysis) => ({ caId, analysis }))))
          .then((results) => {
            const mergedRows = results.flatMap((item) =>
              item.analysis.rows.map((row) => ({
                ...row,
                selectable: Boolean(
                  row.selectable ||
                    row.status === 'not_found' ||
                    row.status === 'inconsistent' ||
                    row.status === 'expired'
                ),
              }))
            );
            const effectiveCaId = targetCaIds.length === 1 ? targetCaIds[0] : 0;
            const caLabel = effectiveCaId > 0
              ? (roas.find((row) => Number(row.ca_id) === effectiveCaId)?.ca_nome ?? `#${effectiveCaId}`)
              : `Múltiplas CAs (${targetCaIds.length})`;
            setAnalysisCaNome(caLabel);
            setAnalysisCaId(effectiveCaId);
            setAnalysisRows(mergedRows);
            setShowAnalysisModal(true);
          })
          .catch((err) => {
            const msg = err instanceof Error ? err.message : 'Erro ao analisar ROAs';
            showError(msg);
          });
      },
    },
    {
      label: 'Validar rota',
      variant: 'primary' as const,
      requiresSelection: true,
      disabled: false,
      action: (selectedItems: RpkiRoaRow[]) => {
        const selected = selectedItems[0];
        if (!selected) return;
        const pref = String(selected.prefix ?? '').trim();
        if (!pref) {
          window.alert('O ROA selecionado não tem prefixo para validar.');
          return;
        }
        const asnRaw = String(selected.asn ?? '').trim();
        const asn = asnRaw.replace(/^AS/i, '').trim();
        openModal('rpki-validar-rota', { initialPrefix: pref, initialAsn: asn });
      },
    },
  ], [cas, openModal, roas, showError, success, t]);

  useEffect(() => {
    if (!show) {
      setShowFormModal(false);
      setEditingRoaId(null);
    }
  }, [show]);

  return (
    <>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <Table
            title={tableTitle}
            config={{
              columns: tableColumns,
              data: roasForTable,
              loading: false,
              searchable: true,
              searchPlaceholder: 'Buscar...',
              searchFields,
              sortable: true,
              striped: true,
              hover: true,
              responsive: true,
              selectable: true,
              multiSelect: false,
              bulkActions: bulkActions.map((action) => ({
                key: action.label.toLowerCase().replace(/\s+/g, '-'),
                label: action.label,
                requiresSelection: action.requiresSelection,
                onClick: action.action,
                disabled: action.disabled,
                variant: action.variant,
              })),
              emptyMessage: 'Nenhum ROA encontrado',
            }}
            tableId="rpki-roas-list-modal"
            syncWithHeader={false}
            onRefresh={() => {}}
            onAudit={handleAuditRoa}
            auditEntity="RpkiRoa"
          />
        </div>
      </div>

      <RpkiRoaCreateEditModal
        show={showFormModal}
        onClose={() => setShowFormModal(false)}
        mode={formMode}
        roa={editingRoa}
        cas={cas.map((ca) => ({ id: ca.id, nome: ca.nome }))}
        onSuccess={(savedRoa) => {
          setRoas((prev) => {
            if (formMode === 'create') {
              const ca = cas.find((c) => c.id === Number(savedRoa.ca_id ?? 0));
              return [{ ...savedRoa, ca_nome: ca?.nome ?? '-' }, ...prev] as RpkiRoaRow[];
            }

            const savedId = savedRoa.id;
            if (savedId === undefined || savedId === null) return prev;

            return prev.map((r) => {
              if (r.id !== savedId) return r;
              const ca = cas.find((c) => c.id === Number(savedRoa.ca_id ?? r.ca_id ?? 0));
              return { ...r, ...savedRoa, ca_nome: ca?.nome ?? r.ca_nome, id: savedId } as RpkiRoaRow;
            });
          });
          setShowFormModal(false);
        }}
      />

      <RpkiRoaAnalysisModal
        show={showAnalysisModal}
        caNome={analysisCaNome}
        rows={analysisRows}
        onClose={() => setShowAnalysisModal(false)}
        onConfirm={(selectedRows) => {
          const rowsToRevoke = selectedRows.filter(
            (row) =>
              row.selectable &&
              row.roa_id > 0 &&
              (row.status === 'not_found' || row.status === 'inconsistent' || row.status === 'expired')
          );
          const rowsToCreate = selectedRows.filter((row) => row.selectable && row.roa_id === 0);
          const suggestionsToCreate = rowsToCreate.map((row) => ({
            prefix: row.prefix,
            asn: row.asn,
            max_length: row.max_length,
          }));

          if (analysisCaId <= 0) {
            setShowAnalysisModal(false);
            success(`Análise concluída. ${selectedRows.length} ROA(s) selecionada(s).`);
            return;
          }

          Promise.resolve()
            .then(async () => {
              let created = 0;
              if (suggestionsToCreate.length > 0) {
                const result = await RpkiCaService.applyRoaSuggestions({
                  caId: analysisCaId,
                  suggestions: suggestionsToCreate,
                });
                created = result.created;
              }

              let revoked = 0;
              for (const row of rowsToRevoke) {
                await RpkiCaService.revokeRoa({ caId: analysisCaId, roaId: row.roa_id });
                revoked += 1;
              }

              success(`${created} ROA(s) criada(s) e ${revoked} ROA(s) revogada(s) automaticamente.`);
            })
            .then(() => {
              return Promise.all(
                cas.map(async (ca) => {
                  const rows = await RpkiCaService.listRoas(ca.id);
                  return rows.map((row) => ({
                    id: row.id,
                    ca_id: row.ca_id,
                    ca_nome: ca.nome,
                    clienteNome: clienteNomeForCa(ca),
                    prefix: row.prefix,
                    asn: row.asn,
                    max_length: row.max_length,
                    not_before: row.not_before,
                    not_after: row.not_after,
                    status: row.status,
                    revoked_at: row.revoked_at ?? undefined,
                  })) as RpkiRoaRow[];
                })
              );
            })
            .then((all) => {
              setRoas(all.flat().sort((a, b) => Number(b.id) - Number(a.id)));
              setShowAnalysisModal(false);
            })
            .catch((err) => {
              const msg = err instanceof Error ? err.message : 'Erro ao aplicar sugestões de ROA';
              showError(msg);
            });
        }}
      />

      <AuditPdfModal
        show={auditoria.showPreview}
        onClose={auditoria.handleClosePreview}
        pdfUrl={auditoria.pdfUrl}
        isGenerating={auditoria.isGeneratingPdf}
        title={auditLogsTitle}
        modalId="auditoria-rpki-roa-modal"
      />
    </>
  );
};

export default RpkiRoaListModal;

