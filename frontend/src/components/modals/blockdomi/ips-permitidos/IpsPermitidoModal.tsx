import React, { useState, useEffect, useRef } from 'react';
import { useCreateIpPermitido, useUpdateIpPermitido } from 'hooks/useIpsPermitidos';
import { IpsPermitidosService, type IpPermitido } from 'services/ipsPermitidosService';
import { useI18n } from 'contexts/I18nContext';
import DraggableModal from 'components/common/DraggableModal';
import { ModalFormActions } from 'components/ui';
import FormField from 'components/ui/FormField';
import EntitySelectField from 'components/ui/EntitySelectField';
import ClienteListModal from 'components/modals/clientes/ClienteListModal';

interface IpsPermitidoModalProps {
  show: boolean;
  onClose: () => void;
  /** Chamado após criar ou editar. No create, recebe o registro criado para o pai poder mudar para modo edição sem fechar o modal. */
  onSuccess?: (createdOrUpdated?: IpPermitido) => void;
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
        const updated = await updateMutation.mutateAsync({ id: ipPermitidoId, data: { faixa_ips: ips.join('; ') } });
        onSuccess?.(updated);
      } else if (clienteId) {
        const created = await createMutation.mutateAsync({ cliente_id: clienteId, faixa_ips: ips.join('; ') });
        onSuccess?.(created);
      }
    } catch {
      // Erro tratado pelo hook
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const headerActions = (
    <ModalFormActions
      onCancel={onClose}
      formId="ips-permitido-form"
      isPending={isSubmitting}
    />
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
        <form id="ips-permitido-form" onSubmit={handleSubmit} className="form-modal-simple">
          <div className="row g-2">
            <div className="col-12">
              {isEditing ? (
                <FormField
                  name="cliente"
                  type="text"
                  label={t('blockdomi.cliente')}
                  value={clienteNome}
                  onChange={() => {}}
                  readOnly
                />
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
            <div className="col-12">
              <FormField
                name="faixa_ips"
                type="textarea"
                label={t('blockdomi.faixaIps')}
                value={faixaIps}
                onChange={(value) => setFaixaIps(String(value ?? ''))}
                placeholder="192.168.1.1; 10.0.0.0/24; 2001:db8::1"
                helpText={t('blockdomi.faixaIpsHelp')}
                required
                rows={4}
                disabled={isSubmitting}
                error={errors.faixa_ips}
              />
            </div>
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
