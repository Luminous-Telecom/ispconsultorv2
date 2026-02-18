import React, { useState, useEffect, useRef } from 'react';
import { useCreateIpPermitido, useUpdateIpPermitido } from '@/hooks/useIpsPermitidos';
import { IpsPermitidosService, type IpPermitido } from '@/services/ipsPermitidosService';
import { useI18n } from '@/contexts/I18nContext';
import DraggableModal from '@/components/common/DraggableModal';
import { Button } from '@/components/ui';
import EntitySelectField from '@/components/ui/EntitySelectField';
import ClienteListModal from '@/components/modals/clientes/ClienteListModal';

interface IpsPermitidoModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  ipPermitidoId?: number | null;
}

const IpsPermitidoModal: React.FC<IpsPermitidoModalProps> = ({
  show,
  onClose,
  onSuccess,
  ipPermitidoId
}) => {
  const { t } = useI18n();
  const isEditing = !!ipPermitidoId;
  const loadingIdRef = useRef<number | null>(null);

  const [clienteId, setClienteId] = useState<number | null>(null);
  const [clienteNome, setClienteNome] = useState('');
  const [faixaIps, setFaixaIps] = useState('');
  const [showClienteSelect, setShowClienteSelect] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useCreateIpPermitido();
  const updateMutation = useUpdateIpPermitido();

  useEffect(() => {
    if (!show) return;
    if (isEditing && ipPermitidoId) {
      const requestedId = ipPermitidoId;
      loadingIdRef.current = requestedId;
      setClienteId(null);
      setClienteNome('');
      setFaixaIps('');
      IpsPermitidosService.getById(requestedId)
        .then((data: IpPermitido) => {
          if (loadingIdRef.current !== requestedId) return;
          setClienteId(data.cliente_id);
          setClienteNome(data.cliente_nome || data.cliente?.razao_social || '-');
          setFaixaIps(data.faixa_ips || '');
        })
        .catch(() => {
          if (loadingIdRef.current === requestedId) {
            setClienteId(null);
            setClienteNome('');
            setFaixaIps('');
          }
        });
    } else {
      setClienteId(null);
      setClienteNome('');
      setFaixaIps('');
    }
    setErrors({});
  }, [show, isEditing, ipPermitidoId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    const faixaTrim = faixaIps.trim();
    const ips = faixaTrim.split(';').map((s) => s.trim()).filter(Boolean);
    if (ips.length === 0) {
      newErrors.faixa_ips = t('blockdomi.ipsPermitidosRequired');
    }
    if (!isEditing && !clienteId) {
      newErrors.cliente = t('blockdomi.clienteRequired');
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      if (isEditing && ipPermitidoId) {
        await updateMutation.mutateAsync({ id: ipPermitidoId, data: { faixa_ips: ips.join('; ') } });
      } else if (clienteId) {
        await createMutation.mutateAsync({ cliente_id: clienteId, faixa_ips: ips.join('; ') });
      }
      onSuccess?.();
    } catch {
      // Erro tratado pelo hook
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const headerActions = (
    <div className="d-flex gap-2 modal-header-actions">
      <Button type="button" variant="outline-secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
        {t('actions.cancel')}
      </Button>
      <Button type="submit" form="ips-permitido-form" variant="primary" size="sm" disabled={isSubmitting}>
        {t('buttons.save')}
      </Button>
    </div>
  );

  return (
    <>
      <DraggableModal
        show={show}
        onClose={onClose}
        title={isEditing ? t('blockdomi.editIpsPermitidos') : t('blockdomi.createIpsPermitidos')}
        size="md"
        headerActions={headerActions}
      >
        <form id="ips-permitido-form" onSubmit={handleSubmit} className="p-3">
          <div className="mb-3">
            {isEditing ? (
              <>
                <label className="form-label">{t('blockdomi.cliente')}</label>
                <input type="text" className="form-control" value={clienteNome} readOnly disabled />
              </>
            ) : (
              <EntitySelectField
                value={clienteId || 0}
                onChange={(id) => {
                  setClienteId(id || null);
                  if (!id) setClienteNome('');
                }}
                onShowModal={() => setShowClienteSelect(true)}
                entities={clienteId && clienteNome ? [{ id: clienteId, nome: clienteNome }] : []}
                label={t('blockdomi.cliente')}
                placeholder={t('blockdomi.selectCliente')}
                required
                error={errors.cliente}
              />
            )}
          </div>
          <div className="mb-3">
            <label className="form-label">{t('blockdomi.faixaIps')}</label>
            <textarea
              className="form-control"
              rows={4}
              value={faixaIps}
              onChange={(e) => setFaixaIps(e.target.value)}
              placeholder="192.168.1.1; 10.0.0.0/24; 2001:db8::1"
              disabled={isSubmitting}
            />
            <span className="text-muted small">{t('blockdomi.faixaIpsHelp')}</span>
            {errors.faixa_ips && <div className="text-danger small mt-1">{errors.faixa_ips}</div>}
          </div>
        </form>
      </DraggableModal>

      <ClienteListModal
        show={showClienteSelect}
        onClose={() => setShowClienteSelect(false)}
        onSelectClient={(cliente) => {
          setClienteId(cliente.id);
          setClienteNome(cliente.razao_social || cliente.nome_fantasia || String(cliente.id));
          setShowClienteSelect(false);
        }}
        title={t('blockdomi.selectCliente')}
      />
    </>
  );
};

export default IpsPermitidoModal;
