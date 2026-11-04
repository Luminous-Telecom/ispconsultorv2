import React, { useMemo, useState } from 'react';
import { useI18n } from 'contexts/I18nContext';
import { ModalFormActions, useBulkBtn } from 'components/ui';
import DraggableModal from 'components/common/DraggableModal';
import EmbeddedTablePanel from 'components/common/EmbeddedTablePanel';
import FormField from 'components/ui/FormField';
import { isDnsIpToken } from 'utils/dnsIps';
import { ClienteTabProps } from '../types';

interface DnsIpRow {
  id: number;
  faixa_ips: string;
}

interface EditorState {
  id: number | null;
  value: string;
}

function parseDnsIpRows(raw: string): DnsIpRow[] {
  const rows: DnsIpRow[] = [];
  const seen = new Set<string>();
  for (const token of raw.split(/[;\n,]+/)) {
    const faixa = token.trim();
    const key = faixa.toLowerCase();
    if (!faixa || seen.has(key)) continue;
    seen.add(key);
    rows.push({ id: rows.length + 1, faixa_ips: faixa });
  }
  return rows;
}

function joinDnsIpRows(rows: DnsIpRow[]): string {
  return rows.map((row) => row.faixa_ips).join('; ');
}

interface IpsDnsItemModalProps {
  editor: EditorState | null;
  rows: DnsIpRow[];
  isSubmitting: boolean;
  onClose: () => void;
  onSave: (rows: DnsIpRow[]) => void;
}

const IpsDnsItemModal: React.FC<IpsDnsItemModalProps> = ({
  editor,
  rows,
  isSubmitting,
  onClose,
  onSave,
}) => {
  const { t } = useI18n();
  const [value, setValue] = useState(editor?.value ?? '');
  const [error, setError] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const faixa = value.trim();
    if (!faixa) {
      setError(t('blockdomi.ipsPermitidosRequired'));
      return;
    }
    if (!isDnsIpToken(faixa)) {
      setError(t('form.ipsDnsInvalid'));
      return;
    }
    const key = faixa.toLowerCase();
    const duplicate = rows.some((row) => row.faixa_ips.toLowerCase() === key && row.id !== editor?.id);
    if (duplicate) {
      setError(t('form.ipsDnsDuplicate'));
      return;
    }
    const next = editor?.id == null
      ? [...rows, { id: rows.length + 1, faixa_ips: faixa }]
      : rows.map((row) => (row.id === editor.id ? { ...row, faixa_ips: faixa } : row));
    onSave(next);
  };

  return (
    <DraggableModal
      show={editor != null}
      onClose={onClose}
      title={editor?.id == null ? t('blockdomi.createIpsPermitidos') : t('blockdomi.editIpsPermitidos')}
      size="md"
      modalId="cliente-ips-dns-item-modal"
      headerActions={(
        <ModalFormActions
          onCancel={onClose}
          formId="cliente-ips-dns-item-form"
          isPending={isSubmitting}
        />
      )}
    >
      <form id="cliente-ips-dns-item-form" onSubmit={handleSubmit} className="form-modal-simple">
        <div className="row g-2">
          <div className="col-12">
            <FormField
              name="faixa_ips"
              type="text"
              label={t('blockdomi.faixaIps')}
              placeholder={t('placeholder.ipsDns')}
              helpText={t('form.ipsDnsHelp')}
              value={value}
              onChange={(next) => {
                setValue(String(next ?? ''));
                setError('');
              }}
              required
              disabled={isSubmitting}
              error={error}
            />
          </div>
        </div>
      </form>
    </DraggableModal>
  );
};

const IpsDnsTab: React.FC<ClienteTabProps> = ({
  formData,
  errors,
  handleInputChange,
  isSubmitting,
}) => {
  const { t } = useI18n();
  const bulkBtn = useBulkBtn();
  const rows = useMemo(() => parseDnsIpRows(formData.ips_dns || ''), [formData.ips_dns]);
  const [editor, setEditor] = useState<EditorState | null>(null);

  const commit = (next: DnsIpRow[]) => {
    handleInputChange('ips_dns', joinDnsIpRows(next));
    setEditor(null);
  };

  const openEdit = (item: DnsIpRow) => {
    if (isSubmitting) return;
    setEditor({ id: item.id, value: item.faixa_ips });
  };

  return (
    <div className="d-flex flex-column flex-grow-1 min-h-0">
      {errors.ips_dns ? <div className="text-danger small px-3 pt-2">{errors.ips_dns}</div> : null}
      <EmbeddedTablePanel<DnsIpRow>
        tableId="cliente-ips-dns"
        onRowDoubleClick={openEdit}
        config={{
          columns: [
            {
              key: 'id',
              label: t('table.id'),
              sortable: true,
              searchable: true,
              render: (item) => item.id,
            },
            {
              key: 'faixa_ips',
              label: t('blockdomi.faixaIps'),
              sortable: true,
              searchable: true,
              render: (item) => item.faixa_ips,
            },
          ],
          data: rows,
          loading: false,
          selectable: true,
          multiSelect: false,
          searchable: true,
          sortable: true,
          searchPlaceholder: t('layout.searchPlaceholder'),
          searchField: 'faixa_ips',
          searchFields: [
            { key: 'id', label: t('table.id') },
            { key: 'faixa_ips', label: t('blockdomi.faixaIps') },
          ],
          emptyMessage: t('empty.noIpsDns'),
          className: 'no-padding',
          bulkActions: [
            {
              key: 'new',
              label: bulkBtn.novo.label,
              variant: bulkBtn.novo.variant,
              requiresSelection: false,
              disabled: () => isSubmitting,
              onClick: () => setEditor({ id: null, value: '' }),
            },
            {
              key: 'edit',
              label: bulkBtn.editar.label,
              variant: bulkBtn.editar.variant,
              disabled: (items) => isSubmitting || items.length === 0,
              onClick: (items) => {
                if (items[0]) openEdit(items[0]);
              },
            },
            {
              key: 'delete',
              label: bulkBtn.deletar.label,
              variant: bulkBtn.deletar.variant,
              disabled: (items) => isSubmitting || items.length === 0,
              onClick: (items) => {
                if (items.length === 0) return;
                if (!window.confirm(t('messages.confirmDelete'))) return;
                const ids = new Set(items.map((item) => item.id));
                commit(rows.filter((row) => !ids.has(row.id)));
              },
            },
          ],
        }}
      />
      {editor ? (
        <IpsDnsItemModal
          key={`${editor.id ?? 'new'}-${editor.value}`}
          editor={editor}
          rows={rows}
          isSubmitting={isSubmitting}
          onClose={() => setEditor(null)}
          onSave={commit}
        />
      ) : null}
    </div>
  );
};

export default IpsDnsTab;
