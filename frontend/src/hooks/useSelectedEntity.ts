import { useEffect, useState, useRef } from 'react';

/**
 * Hook utilitário para sincronizar um objeto selecionado com seu ID e a lista de entidades disponível.
 * 
 * Mantém um estado local do objeto selecionado e o atualiza automaticamente sempre que:
 * - O ID fornecido muda (ex.: carregamento de dados para edição);
 * - A lista de entidades é atualizada (ex.: requisição resolve ou refetch);
 * - O ID é resetado (ex.: formulário limpo), garantindo que o objeto também seja limpo.
 *
 * Também permite atualização manual via setter retornado, útil para cenários onde uma seleção ocorre
 * a partir de um modal e precisamos refletir imediatamente o objeto escolhido.
 */
export function useSelectedEntity<T extends { id: number }>(
  selectedId: number | null | undefined,
  entities: T[] | null | undefined
): [T | null, React.Dispatch<React.SetStateAction<T | null>>] {
  const [selectedEntity, setSelectedEntity] = useState<T | null>(null);
  const prevEntitiesRef = useRef<T[] | null | undefined>(null);
  const prevSelectedIdRef = useRef<number | null | undefined>(null);

  useEffect(() => {
    // Verificar se realmente mudou para evitar loops
    const entitiesChanged = prevEntitiesRef.current !== entities;
    const selectedIdChanged = prevSelectedIdRef.current !== selectedId;
    
    if (!entitiesChanged && !selectedIdChanged) {
      return;
    }

    prevEntitiesRef.current = entities;
    prevSelectedIdRef.current = selectedId;

    if (!selectedId) {
      setSelectedEntity(null);
      return;
    }

    if (!entities || entities.length === 0) {
      return;
    }

    setSelectedEntity((previous) => {
      const entity = entities.find((item) => item.id === selectedId) || null;

      if (!entity) {
        return previous && previous.id === selectedId ? previous : previous ?? null;
      }

      // Comparar por ID para evitar atualizações desnecessárias
      if (previous?.id === entity.id) {
        return previous;
      }

      return entity;
    });
  }, [selectedId, entities]);

  return [selectedEntity, setSelectedEntity];
}


