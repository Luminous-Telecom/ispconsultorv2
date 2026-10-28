import { act, renderHook } from '@testing-library/react';
import { useEntityRecordEdit } from './useEntityRecordEdit';

jest.mock('components/ui/EntityRecordEditModal', () => ({
  __esModule: true,
  default: ({ kind, recordId }: { kind: string; recordId: number }) => (
    <div>{`${kind}-${recordId}`}</div>
  ),
}));

describe('useEntityRecordEdit', () => {
  it('não abre edição sem id e abre com o id informado', () => {
    const { result } = renderHook(() => useEntityRecordEdit('plano'));

    act(() => result.current.open(0));
    expect(result.current.modal).toBeNull();

    act(() => result.current.open(7712));
    expect(result.current.modal).not.toBeNull();
  });
});
