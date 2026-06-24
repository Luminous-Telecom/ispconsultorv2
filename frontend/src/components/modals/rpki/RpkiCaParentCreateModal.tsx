import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DraggableModal from 'components/common/DraggableModal';
import { CancelarButton, CopiarButton, FormField, NovoButton } from 'components/ui';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES, ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useCopyToClipboard } from 'hooks/useCopyToClipboard';
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
  const { copy: copyToClipboard } = useCopyToClipboard({
    successMessage: 'Requisição da CA-filha copiada',
    errorMessage: ERROR_MESSAGES.COPY_ERROR,
  });

  const { data: cas = [] as RpkiCa[] } = useQuery<RpkiCa[]>({
    queryKey: ['rpki-cas'],
    queryFn: () => RpkiCaService.list(),
  });

  const selectableCas = useMemo((): RpkiCa[] => {
    const caList = cas as RpkiCa[];
    if (!allowedCaIds?.length) return caList;
    const allowed = new Set(allowedCaIds);
    return caList.filter((ca) => allowed.has(ca.id));
  }, [cas, allowedCaIds]);

  useEffect(() => {
    if (!show) return;
    if (initialCaId && selectableCas.some((ca) => ca.id === initialCaId)) {
      setCaId(String(initialCaId));
    } else if (selectableCas.length > 0) {
      setCaId(String(selectableCas[0].id));
    } else {
      setCaId('');
    }
    setParentName('');
    setChildRequestXml('');
    setResponseXml('');
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
      ]);
      success('CA-pai vinculada com sucesso');
      onClose();
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.RPKI_CA_PARENT_LINK_ERROR),
  });

  return (
    <DraggableModal show={show} onClose={onClose} title="CA-pai" size="lg" modalId="rpki-ca-parent-create-modal">
      <div className="p-2">
        <div className="row g-2">
          <div className="col-md-4">
            <FormField
              name="rpki_parent_ca_id"
              type="select"
              label="CA"
              size="sm"
              value={caId}
              options={selectableCas.map((ca) => ({ value: ca.id, label: ca.nome }))}
              onChange={(v) => setCaId(String(v ?? ''))}
            />
          </div>
          <div className="col-md-8">
            <FormField
              name="rpki_parent_name"
              label="Nome da CA-pai"
              size="sm"
              value={parentName}
              onChange={(v) => setParentName(String(v ?? ''))}
            />
          </div>
          <div className="col-12">
            <div style={{ position: 'relative' }}>
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
              <CopiarButton
                iconOnly
                style={{ position: 'absolute', top: 30, right: 18, zIndex: 2, minWidth: 36, padding: '4px 8px' }}
                disabled={!childRequestXml.trim()}
                onClick={() => {
                  if (!childRequestXml.trim()) return;
                  void copyToClipboard(childRequestXml);
                }}
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
              value={responseXml}
              onChange={(v) => setResponseXml(String(v ?? ''))}
            />
          </div>
        </div>
        <div className="d-flex justify-content-end gap-2 mt-3">
          <CancelarButton type="button" onClick={onClose} isPending={createMutation.isPending} />
          <NovoButton
            type="button"
            disabled={createMutation.isPending || !caId.trim() || !parentName.trim() || !responseXml.trim()}
            isPending={createMutation.isPending}
            onClick={() =>
              createMutation.mutate({
                caId: Number(caId),
                parentName: parentName.trim(),
                responseXml: responseXml.trim(),
              })
            }
          />
        </div>
      </div>
    </DraggableModal>
  );
};

export default RpkiCaParentCreateModal;
