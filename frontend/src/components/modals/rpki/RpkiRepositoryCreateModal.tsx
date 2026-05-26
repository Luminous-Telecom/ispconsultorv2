import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DraggableModal from 'components/common/DraggableModal';
import { CancelarButton, CopiarButton, FormField, NovoButton } from 'components/ui';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { RpkiCaService } from 'services/rpkiCaService';

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
  const { success, error } = useNotificationContext();
  const errorRef = useRef(error);

  const { data: cas = [] } = useQuery({
    queryKey: ['rpki-cas'],
    queryFn: () => RpkiCaService.list(),
  });
  const selectableCas = useMemo(() => {
    if (!allowedCaIds?.length) return cas;
    const allowed = new Set(allowedCaIds);
    return cas.filter((ca) => allowed.has(ca.id));
  }, [cas, allowedCaIds]);
  const selectedCaId = Number(caId || 0);
  const { data: parents = [] } = useQuery({
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
    errorRef.current = error;
  }, [error]);

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
        const withMessage = err as { message?: string };
        errorRef.current(withMessage.message || 'Erro ao gerar publisher_request');
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
    onError: (err: unknown) => {
      const withMessage = err as { message?: string };
      error(withMessage.message || 'Erro ao importar repository_response');
    },
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
                onClick={async () => {
                  if (!publisherRequestXml.trim()) return;
                  try {
                    await navigator.clipboard.writeText(publisherRequestXml);
                    success('publisher_request copiado');
                  } catch {
                    error('Não foi possível copiar o publisher_request');
                  }
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

