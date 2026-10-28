import { useCallback, useState } from 'react';
import EntityRecordEditModal, { type EntityRecordKind } from 'components/ui/EntityRecordEditModal';

export type { EntityRecordKind };

export function useEntityRecordEdit(kind: EntityRecordKind) {
  const [recordId, setRecordId] = useState<number | null>(null);

  const open = useCallback((id: number) => {
    if (!id || id <= 0) return;
    setRecordId(id);
  }, []);

  const close = useCallback(() => setRecordId(null), []);

  const modal = recordId == null
    ? null
    : <EntityRecordEditModal kind={kind} recordId={recordId} onClose={close} />;

  return { open, modal };
}
