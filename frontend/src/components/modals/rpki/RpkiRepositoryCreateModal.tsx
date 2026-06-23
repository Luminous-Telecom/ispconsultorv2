import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DraggableModal from 'components/common/DraggableModal';
import { CancelarButton, CopiarButton, FormField, NovoButton } from 'components/ui';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES, ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useCopyToClipboard } from 'hooks/useCopyToClipboard';
import { RpkiCaService, type RpkiCa, type RpkiCaParent } from 'services/rpkiCaService';

interface RpkiRepositoryCreateModalProps {
  show: boolean;
  onClose: () => void;
  allowedCaIds?: number[];
  initialCaId?: number | null;
}

const RpkiRepositoryCreateModal: React.FC<RpkiRepositoryCreateModalProps> = ({
  show,
  onClose,
  allowedCaIds,
  initialCaId,
}) => {
  const [caId, setCaId] = useState('');
  const [parentId, setParentId] = useState('');
  const [publisherRequestXml, setPublisherRequestXml] = useState('');
  const [repositoryResponseXml, setRepositoryResponseXml] = useState('');
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const { copy: copyToClipboard } = useCopyToClipboard({
    successMessage: 'publisher_request copiado',
    errorMessage: ERROR_MESSAGES.COPY_ERROR,
  });
  const showApiErrorRef = useRef(showApiError);

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
  const selectedCaId = Number(caId || 0);
  const { data: parents = [] as RpkiCaParent[] } = useQuery<RpkiCaParent[]>({
    queryKey: ['rpki-ca-parents', selectedCaId],
    queryFn: () => RpkiCaService.listParents(selectedCaId),
    enabled: selectedCaId > 0,
  });

  useEffect(() => {
    if (!show) return;
    if (initialCaId && selectableCas.some((ca) => ca.id === initialCaId)) {
      setCaId(String(initialCaId));
    } else if (selectableCas.length > 0) {
      setCaId(String(selectableCas[0].id));
    } else {
      setCaId('');
    }
    setParentId('');
    setPublisherRequestXml('');
    setRepositoryResponseXml('');
  }, [show, selectableCas, initialCaId]);

  useEffect(() => {
    showApiErrorRef.current = showApiError;
  }, [showApiError]);

  useEffect(() => {
    if (!show || !caId.trim()) {
      setPublisherRequestXml('');
      return;
    }
    if (!parentId.trim()) {
      setPublisherRequestXml('');
      return;
    }

    let cancelled = false;
    RpkiCaService.generatePublisherRequest({
      caId: Number(caId),
      parentId: Number(parentId),
    })
      .then((result) => {
        if (cancelled) return;
        setPublisherRequestXml(result.xml);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        showApiErrorRef.current(err, CONTEXT_ERROR_MESSAGES.RPKI_REPOSITORY_PUBLISHER_ERROR);
      });

    return () => {
      cancelled = true;
    };
  }, [show, caId, parentId]);

  useEffect(() => {
    if (!show) return;
    if (parents.length === 0) {
      setParentId('');
      return;
    }
    const currentId = Number(parentId || 0);
    const exists = parents.some((p) => p.id === currentId);
    if (!exists) {
      setParentId(String(parents[0].id));
    }
  }, [show, parents, parentId]);

  const importMutation = useMutation({
    mutationFn: (payload: { caId: number; responseXml: string }) => RpkiCaService.importRepositoryResponse(payload),
    onSuccess: (_row, vars) => {
      success('Repositório vinculado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['rpki-repositories-all'] });
      queryClient.invalidateQueries({ queryKey: ['rpki-ca-repositories', vars.caId] });
      onClose();
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.RPKI_REPOSITORY_IMPORT_ERROR),
  });

  return (
    <DraggableModal show={show} onClose={onClose} title="Novo Repositório" size="lg" modalId="rpki-repository-create-modal">
      <div className="p-2">
        <div className="row g-2">
          <div className="col-md-4">
            <FormField
              name="rpki_repository_ca_id"
              type="select"
              label="CA"
              size="sm"
              value={caId}
              options={selectableCas.map((ca) => ({ value: ca.id, label: ca.nome }))}
              onChange={(v) => {
                setCaId(String(v ?? ''));
                setParentId('');
              }}
            />
          </div>
          <div className="col-md-8">
            <FormField
              name="rpki_repository_parent_id"
              type="select"
              label="CA-pai"
              size="sm"
              value={parentId}
              options={parents.map((p) => ({ value: p.id, label: `${p.parent_name} (${p.parent_handle ?? '—'})` }))}
              onChange={(v) => setParentId(String(v ?? ''))}
            />
          </div>
          <div className="col-12">
            <div style={{ position: 'relative' }}>
              <FormField
                name="rpki_repository_publisher_request_xml"
                type="textarea"
                label="publisher_request"
                size="sm"
                rows={5}
                value={publisherRequestXml}
                onChange={(v) => setPublisherRequestXml(String(v ?? ''))}
              />
              <CopiarButton
                iconOnly
                style={{ position: 'absolute', top: 30, right: 18, zIndex: 2, minWidth: 36, padding: '4px 8px' }}
                disabled={!publisherRequestXml.trim()}
                onClick={() => {
                  if (!publisherRequestXml.trim()) return;
                  void copyToClipboard(publisherRequestXml);
                }}
              />
            </div>
          </div>
          <div className="col-12">
            <FormField
              name="rpki_repository_response_xml"
              type="textarea"
              label="repository_response"
              size="sm"
              rows={6}
              value={repositoryResponseXml}
              onChange={(v) => setRepositoryResponseXml(String(v ?? ''))}
            />
          </div>
        </div>
        <div className="d-flex justify-content-end gap-2 mt-3">
          <CancelarButton type="button" onClick={onClose} isPending={importMutation.isPending} />
          <NovoButton
            type="button"
            disabled={importMutation.isPending || !caId.trim() || !parentId.trim() || !repositoryResponseXml.trim()}
            isPending={importMutation.isPending}
            onClick={() =>
              importMutation.mutate({
                caId: Number(caId),
                responseXml: repositoryResponseXml.trim(),
              })
            }
          />
        </div>
      </div>
    </DraggableModal>
  );
};

export default RpkiRepositoryCreateModal;

