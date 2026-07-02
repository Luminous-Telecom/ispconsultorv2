import React, { useEffect, useMemo, useState } from 'react';
import DraggableModal from 'components/common/DraggableModal';
import { FormField } from 'components/ui';
import { CancelarButton, NovoButton, SalvarButton } from 'components/ui';
import { RpkiCaService } from 'services/rpkiCaService';
import { normalizeDateOnlyForInput } from 'utils/formatters';

export interface RpkiRoaRow {
  id: number | string;
  ca_id?: number | null;
  prefix?: string;
  asn?: string;
  max_length?: number;
  not_before?: string;
  not_after?: string;
  status?: 'active' | 'revoked' | 'expired';
  revoked_at?: string;
}

export interface RpkiRoaCreateEditModalProps {
  show: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  roa: RpkiRoaRow | null;
  cas: Array<{ id: number; nome: string }>;
  onSuccess: (savedRoa: RpkiRoaRow) => void;
}

type RpkiRoaFormErrors = Record<string, string>;

function isProbablyCidr(prefix: string): boolean {
  const parts = prefix.split('/');
  if (parts.length !== 2) return false;
  const ipPart = parts[0]?.trim();
  const lenStr = parts[1]?.trim();
  if (!ipPart || !lenStr) return false;

  const len = Number(lenStr);
  if (!Number.isInteger(len)) return false;
  if (len < 0 || len > 128) return false;

  if (ipPart.includes('.')) {
    // Validação simples IPv4: 4 octetos numéricos (0-255)
    const octets = ipPart.split('.');
    if (octets.length !== 4) return false;
    return octets.every((o) => {
      if (!/^\d+$/.test(o)) return false;
      const n = Number(o);
      return n >= 0 && n <= 255;
    });
  }

  if (ipPart.includes(':')) {
    // Validação simples IPv6: apenas hex e ':' (não valida compressões com perfeição)
    if (!/^[0-9a-fA-F:]+$/.test(ipPart)) return false;
    return ipPart.split(':').length >= 3;
  }

  return false;
}

const RpkiRoaCreateEditModal: React.FC<RpkiRoaCreateEditModalProps> = ({
  show,
  onClose,
  mode,
  roa,
  cas,
  onSuccess,
}) => {
  const isEditing = mode === 'edit';
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialForm = useMemo(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const isoDate = `${yyyy}-${mm}-${dd}`;

    return {
      ca_id: '',
      prefix: '',
      asn: '',
      max_length: '',
      not_before: isoDate,
      not_after: '',
    };
  }, []);

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<RpkiRoaFormErrors>({});

  useEffect(() => {
    if (!show) return;

    setErrors({});
    if (isEditing && roa) {
      setForm({
        ca_id: roa.ca_id != null ? String(roa.ca_id) : '',
        prefix: roa.prefix ?? '',
        asn: roa.asn ?? '',
        max_length: roa.max_length != null ? String(roa.max_length) : '',
        not_before: normalizeDateOnlyForInput(roa.not_before),
        not_after: normalizeDateOnlyForInput(roa.not_after),
      });
      return;
    }

    setForm(initialForm);
  }, [show, isEditing, roa, initialForm]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const nextErrors: RpkiRoaFormErrors = {};

    const caId = Number(form.ca_id);
    if (!Number.isFinite(caId) || caId <= 0) {
      nextErrors.ca_id = 'CA é obrigatória';
    }

    const prefix = form.prefix.trim();
    if (!prefix) {
      nextErrors.prefix = 'Prefixo é obrigatório';
    } else if (!isProbablyCidr(prefix)) {
      nextErrors.prefix = 'Prefixo deve estar no formato CIDR (IPv4/IPv6)';
    }

    const asnRaw = form.asn.trim();
    if (!asnRaw) {
      nextErrors.asn = 'ASN é obrigatório';
    } else if (!/^\d+$/.test(asnRaw)) {
      nextErrors.asn = 'ASN deve ser numérico';
    } else {
      const asnNumber = Number(asnRaw);
      if (!Number.isInteger(asnNumber) || asnNumber < 0) {
        nextErrors.asn = 'ASN inválido';
      }
    }

    if (!form.max_length.trim()) {
      nextErrors.max_length = 'Max length é obrigatório';
    } else if (!/^\d+$/.test(form.max_length.trim())) {
      nextErrors.max_length = 'Max length deve ser numérico';
    }

    if (!form.not_before) nextErrors.not_before = 'Válido de é obrigatório';
    if (!form.not_after) nextErrors.not_after = 'Válido até é obrigatório';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && roa?.id != null) {
        const updated = await RpkiCaService.updateRoa({
          caId,
          roaId: Number(roa.id),
          prefix,
          asn: form.asn.trim(),
          max_length: Number(form.max_length.trim()),
          not_before: form.not_before,
          not_after: form.not_after,
        });
        onSuccess({
          id: updated.id,
          ca_id: updated.ca_id,
          prefix: updated.prefix,
          asn: updated.asn,
          max_length: updated.max_length,
          not_before: updated.not_before,
          not_after: updated.not_after,
          status: updated.status,
          revoked_at: updated.revoked_at ?? undefined,
        });
      } else {
        const created = await RpkiCaService.createRoa({
          caId,
          prefix,
          asn: form.asn.trim(),
          max_length: Number(form.max_length.trim()),
          not_before: form.not_before,
          not_after: form.not_after,
        });
        onSuccess({
          id: created.id,
          ca_id: created.ca_id,
          prefix: created.prefix,
          asn: created.asn,
          max_length: created.max_length,
          not_before: created.not_before,
          not_after: created.not_after,
          status: created.status,
          revoked_at: created.revoked_at ?? undefined,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = 'ROA';

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={title}
      size="lg"
      headerActions={
        <div className="d-flex gap-2 modal-header-actions">
          <CancelarButton type="button" onClick={onClose} isPending={isSubmitting} />
          {isEditing ? (
            <SalvarButton
              type="button"
              onClick={() => {
                void handleSubmit();
              }}
              isPending={isSubmitting}
            />
          ) : (
            <NovoButton
              type="button"
              onClick={() => {
                void handleSubmit();
              }}
              isPending={isSubmitting}
            />
          )}
        </div>
      }
    >
      <div className="modal-inner-padding-fixed">
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-12">
              <FormField
                name="ca_id"
                type="select"
                label="CA"
                value={form.ca_id}
                onChange={(value) => {
                  setForm((prev) => ({ ...prev, ca_id: String(value ?? '') }));
                  if (errors.ca_id) setErrors((prev) => ({ ...prev, ca_id: '' }));
                }}
                error={errors.ca_id}
                required
                size="sm"
                options={cas.map((ca) => ({ value: String(ca.id), label: ca.nome }))}
                disabled={isEditing}
              />
            </div>

            <div className="col-12">
              <FormField
                name="prefix"
                type="text"
                label="Prefixo"
                value={form.prefix}
                onChange={(value) => {
                  setForm((prev) => ({ ...prev, prefix: String(value ?? '') }));
                  if (errors.prefix) setErrors((prev) => ({ ...prev, prefix: '' }));
                }}
                error={errors.prefix}
                required
                size="sm"
                placeholder="203.0.113.0/24 ou 2001:db8::/32"
              />
            </div>

            <div className="col-12 col-md-4">
              <FormField
                name="asn"
                type="text"
                label="ASN"
                value={form.asn}
                onChange={(value) => {
                  setForm((prev) => ({ ...prev, asn: String(value ?? '') }));
                  if (errors.asn) setErrors((prev) => ({ ...prev, asn: '' }));
                }}
                error={errors.asn}
                required
                size="sm"
                placeholder="64500"
              />
            </div>

            <div className="col-12 col-md-4">
              <FormField
                name="max_length"
                type="text"
                label="Max Length"
                value={form.max_length}
                onChange={(value) => {
                  setForm((prev) => ({ ...prev, max_length: String(value ?? '') }));
                  if (errors.max_length) setErrors((prev) => ({ ...prev, max_length: '' }));
                }}
                error={errors.max_length}
                required
                size="sm"
                placeholder="24"
              />
            </div>

            <div className="col-12 col-md-6">
              <FormField
                name="not_before"
                type="date"
                label="Válido de"
                value={form.not_before}
                onChange={(value) => setForm((prev) => ({ ...prev, not_before: String(value ?? '') }))}
                error={errors.not_before}
                required
                size="sm"
              />
            </div>

            <div className="col-12 col-md-6">
              <FormField
                name="not_after"
                type="date"
                label="Válido até"
                value={form.not_after}
                onChange={(value) => setForm((prev) => ({ ...prev, not_after: String(value ?? '') }))}
                error={errors.not_after}
                required
                size="sm"
              />
            </div>

          </div>
        </form>
      </div>
    </DraggableModal>
  );
};

export default RpkiRoaCreateEditModal;

