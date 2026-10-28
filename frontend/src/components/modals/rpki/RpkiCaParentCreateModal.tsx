import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DraggableModal from 'components/common/DraggableModal';
import { CancelarButton, CopiarIconButton, FormField, NovoButton } from 'components/ui';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { RpkiCaService, type RpkiCa } from 'services/rpkiCaService';

interface RpkiCaParentCreateModalProps {
  show: boolean;
  onClose: () => void;
  initialCaId?: number | null;
  allowedCaIds?: number[];
}

const RpkiCaParentCreateModal: React.FC<RpkiCaParentCreateModalProps> = ({
  show,
  onClose,
  initialCaId,
  allowedCaIds,
}) => {
  const [caId, setCaId] = useState('');
  const [parentName, setParentName] = useState('');
  const [childRequestXml, setChildRequestXml] = useState('');
  const [responseXml, setResponseXml] = useState('');
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  const { data: cas = [] as RpkiCa[] } = useQuery<RpkiCa[]>({
    queryKey: ['rpki-cas'],
    queryFn: () => RpkiCaService.list(),
  });

  const allowedCaIdsKey = (allowedCaIds ?? []).join(',');

  const selectableCas = useMemo((): RpkiCa[] => {
    const caList = cas as RpkiCa[];
    if (!allowedCaIdsKey) return caList;
    const allowed = new Set(
      allowedCaIdsKey
        .split(',')
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0)
    );
    return caList.filter((ca) => allowed.has(ca.id));
  }, [cas, allowedCaIdsKey]);

  // Só reseta campos ao abrir — evita limpar/cancelar a geração da CA-filha a cada re-render do pai
  useEffect(() => {
    if (!show) return;
    setParentName('');
    setChildRequestXml('');
    setResponseXml('');
  }, [show]);

  useEffect(() => {
    if (!show) return;
    if (initialCaId && selectableCas.some((ca) => ca.id === initialCaId)) {
      setCaId(String(initialCaId));
      return;
    }
    if (selectableCas.length > 0) {
      setCaId((prev) =>
        prev && selectableCas.some((ca) => String(ca.id) === prev)
          ? prev
          : String(selectableCas[0].id)
      );
      return;
    }
    setCaId('');
  }, [show, initialCaId, selectableCas]);

  useEffect(() => {
    if (!show || !caId.trim()) {
      setChildRequestXml('');
      return;
    }

    let cancelled = false;
    RpkiCaService.generateChildRequest(Number(caId))
      .then((data) => {
        if (cancelled) return;
        setChildRequestXml(data.xml || '');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setChildRequestXml('');
        showApiError(err, CONTEXT_ERROR_MESSAGES.RPKI_CA_CHILD_REQUEST_ALT_ERROR);
      });

    return () => {
      cancelled = true;
    };
  }, [show, caId, showApiError]);

  const createMutation = useMutation({
    mutationFn: (payload: {
      caId: number;
      parentName: string;
      responseXml: string;
    }) =>
      RpkiCaService.importParentResponse(payload),
    onSuccess: async (_data, vars) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['rpki-cas'] }),
        queryClient.invalidateQueries({ queryKey: ['rpki-ca-parents', vars.caId] }),
        queryClient.invalidateQueries({ queryKey: ['rpki-ca-parents-all'] }),
      ]);
      success('CA-pai vinculada com sucesso');
      onClose();
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.RPKI_CA_PARENT_LINK_ERROR),
  });

  const canSubmit = caId.trim() !== '' && parentName.trim() !== '' && responseXml.trim() !== '';

  const handleSubmit = (event?: React.SyntheticEvent) => {
    event?.preventDefault();
    if (createMutation.isPending || !canSubmit) return;
    createMutation.mutate({
      caId: Number(caId),
      parentName: parentName.trim(),
      responseXml: responseXml.trim(),
    });
  };

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="CA-pai"
      size="lg"
      modalId="rpki-ca-parent-create-modal"
      headerActions={
        <div className="d-flex gap-2 modal-header-actions">
          <CancelarButton type="button" onClick={onClose} isPending={createMutation.isPending} />
          <NovoButton
            type="button"
            disabled={createMutation.isPending || !canSubmit}
            isPending={createMutation.isPending}
            onClick={handleSubmit}
          />
        </div>
      }
    >
      <form id="rpki-ca-parent-create-form" className="form-modal-simple" onSubmit={handleSubmit}>
        <div className="row g-2">
          <div className="col-12">
            <FormField
              name="rpki_parent_ca_id"
              type="select"
              label="CA"
              size="sm"
              required
              value={caId}
              options={selectableCas.map((ca) => ({ value: String(ca.id), label: ca.nome }))}
              onChange={(v) => setCaId(String(v ?? ''))}
            />
          </div>
          <div className="col-12">
            <FormField
              name="rpki_parent_name"
              label="Nome da CA-pai"
              size="sm"
              required
              value={parentName}
              onChange={(v) => setParentName(String(v ?? ''))}
            />
          </div>
          <div className="col-12">
            <div className="rpki-field-relative">
              <FormField
                name="rpki_child_request_preview"
                type="textarea"
                label="Requisição da CA-filha"
                size="sm"
                rows={8}
                value={childRequestXml}
                onChange={() => undefined}
                disabled
              />
              <CopiarIconButton
                text={childRequestXml}
                copyKey="rpki-child-request"
                className="rpki-field-copy-overlay"
              />
            </div>
          </div>
          <div className="col-12">
            <FormField
              name="rpki_parent_response_xml"
              type="textarea"
              label="Resposta da CA-pai (XML)"
              size="sm"
              rows={8}
              required
              value={responseXml}
              onChange={(v) => setResponseXml(String(v ?? ''))}
            />
          </div>
        </div>
      </form>
    </DraggableModal>
  );
};

export default RpkiCaParentCreateModal;
