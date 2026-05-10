import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DraggableModal from 'components/common/DraggableModal';
import { Button, FormField } from 'components/ui';
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
}

const RpkiAspaCreateModal: React.FC<RpkiAspaCreateModalProps> = ({ show, onClose, onSave }) => {
  const [caId, setCaId] = useState('');
  const [customerAsn, setCustomerAsn] = useState('');
  const [providers, setProviders] = useState('');

  const { data: cas = [] } = useQuery({
    queryKey: ['rpki-cas'],
    queryFn: () => RpkiCaService.list(),
  });

  useEffect(() => {
    if (!show) return;
    setCaId('');
    setCustomerAsn('');
    setProviders('');
  }, [show]);

  return (
    <DraggableModal show={show} onClose={onClose} title="Novo ASPA" size="sm" modalId="rpki-aspa-create-modal">
      <div className="p-2">
        <FormField
          name="rpki_aspa_ca_id"
          type="select"
          label="CA"
          size="sm"
          value={caId}
          options={cas.map((ca) => ({ value: ca.id, label: ca.nome }))}
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
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={!caId.trim() || !customerAsn.trim() || !providers.trim()}
            onClick={() =>
              onSave({
                caId: Number(caId),
                customerAsn: customerAsn.trim(),
                providers: providers.trim(),
              })
            }
          >
            Salvar
          </Button>
        </div>
      </div>
    </DraggableModal>
  );
};

export default RpkiAspaCreateModal;

