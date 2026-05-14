import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DraggableModal from 'components/common/DraggableModal';
import { Button, FormField } from 'components/ui';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { RpkiCaService } from 'services/rpkiCaService';

interface RpkiRepositoryCreateModalProps {
  show: boolean;
  onClose: () => void;
}

const RpkiRepositoryCreateModal: React.FC<RpkiRepositoryCreateModalProps> = ({ show, onClose }) => {
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
  const selectedCaId = Number(caId || 0);
  const { data: parents = [] } = useQuery({
    queryKey: ['rpki-ca-parents', selectedCaId],
    queryFn: () => RpkiCaService.listParents(selectedCaId),
    enabled: selectedCaId > 0,
  });

  useEffect(() => {
    if (!show) return;
    if (cas.length > 0) {
      setCaId(String(cas[0].id));
    } else {
      setCaId('');
    }
    setParentId('');
    setPublisherRequestXml('');
    setRepositoryResponseXml('');
  }, [show, cas]);

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
    <DraggableModal show={show} onClose={onClose} title="Criar Repositório" size="lg" modalId="rpki-repository-create-modal">
      <div className="p-2">
        <div className="row g-2">
          <div className="col-md-4">
            <FormField
              name="rpki_repository_ca_id"
              type="select"
              label="CA"
              size="sm"
              value={caId}
              options={cas.map((ca) => ({ value: ca.id, label: ca.nome }))}
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
              <Button
                type="button"
                variant="secondary"
                size="sm"
                style={{ position: 'absolute', top: 30, right: 18, zIndex: 2, minWidth: 36, padding: '4px 8px' }}
                disabled={!publisherRequestXml.trim()}
                title="Copiar"
                aria-label="Copiar publisher_request"
                onClick={async () => {
                  if (!publisherRequestXml.trim()) return;
                  try {
                    await navigator.clipboard.writeText(publisherRequestXml);
                    success('publisher_request copiado');
                  } catch {
                    error('Não foi possível copiar o publisher_request');
                  }
                }}
              >
                <i className="bi bi-clipboard"></i>
              </Button>
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
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={importMutation.isPending}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={importMutation.isPending || !caId.trim() || !parentId.trim() || !repositoryResponseXml.trim()}
            onClick={() =>
              importMutation.mutate({
                caId: Number(caId),
                responseXml: repositoryResponseXml.trim(),
              })
            }
          >
            Criar repositório
          </Button>
        </div>
      </div>
    </DraggableModal>
  );
};

export default RpkiRepositoryCreateModal;

