import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DraggableModal from 'components/common/DraggableModal';
import { CancelarButton, FormField, NovoButton } from 'components/ui';
import { RpkiCaService } from 'services/rpkiCaService';

interface RpkiAspaCreatePayload {
  caId: number;
  customerAsn: string;
  providers: string;
}

interface RpkiAspaCreateModalProps {
  show: boolean;
  onClose: () => void;
  onSave: (payload: RpkiAspaCreatePayload) => void;
  allowedCaIds?: number[];
  initialCaId?: number | null;
}

const RpkiAspaCreateModal: React.FC<RpkiAspaCreateModalProps> = ({
  show,
  onClose,
  onSave,
  allowedCaIds,
  initialCaId,
}) => {
  const [caId, setCaId] = useState('');
  const [customerAsn, setCustomerAsn] = useState('');
  const [providers, setProviders] = useState('');

  const { data: cas = [] } = useQuery({
    queryKey: ['rpki-cas'],
    queryFn: () => RpkiCaService.list(),
  });
  const selectableCas = useMemo(() => {
    if (!allowedCaIds?.length) return cas;
    const allowed = new Set(allowedCaIds);
    return cas.filter((ca) => allowed.has(ca.id));
  }, [cas, allowedCaIds]);

  useEffect(() => {
    if (!show) return;
    if (initialCaId && selectableCas.some((ca) => ca.id === initialCaId)) {
      setCaId(String(initialCaId));
    } else {
      setCaId('');
    }
    setCustomerAsn('');
    setProviders('');
  }, [show, initialCaId, selectableCas]);

  return (
    <DraggableModal show={show} onClose={onClose} title="Novo ASPA" size="sm" modalId="rpki-aspa-create-modal">
      <div className="p-2">
        <FormField
          name="rpki_aspa_ca_id"
          type="select"
          label="CA"
          size="sm"
          value={caId}
          options={selectableCas.map((ca) => ({ value: ca.id, label: ca.nome }))}
          onChange={(v) => setCaId(String(v ?? ''))}
        />
        <div className="mt-2">
          <FormField
            name="rpki_aspa_customer_asn"
            label="Customer ASN"
            size="sm"
            value={customerAsn}
            onChange={(v) => setCustomerAsn(String(v ?? ''))}
          />
        </div>
        <div className="mt-2">
          <FormField
            name="rpki_aspa_providers"
            label="Providers ASN (csv)"
            size="sm"
            value={providers}
            onChange={(v) => setProviders(String(v ?? ''))}
          />
        </div>
        <div className="d-flex justify-content-end gap-2 mt-3">
          <CancelarButton type="button" onClick={onClose} />
          <NovoButton
            type="button"
            disabled={!caId.trim() || !customerAsn.trim() || !providers.trim()}
            onClick={() =>
              onSave({
                caId: Number(caId),
                customerAsn: customerAsn.trim(),
                providers: providers.trim(),
              })
            }
          />
        </div>
      </div>
    </DraggableModal>
  );
};

export default RpkiAspaCreateModal;

