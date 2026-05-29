import { useEffect, type RefObject } from 'react';
import type { RpkiKrillConfigSection } from './types';

interface SectionRefs {
  casCardRef: RefObject<HTMLDivElement | null>;
  casPaiCardRef: RefObject<HTMLDivElement | null>;
  repositoriosCardRef: RefObject<HTMLDivElement | null>;
  aspasCardRef: RefObject<HTMLDivElement | null>;
}

export function useSectionScroll(
  initialSection: RpkiKrillConfigSection | undefined,
  refs: SectionRefs
): void {
  useEffect(() => {
    if (!initialSection) return;

    const sectionMap = {
      cas: refs.casCardRef,
      'cas-pai': refs.casPaiCardRef,
      repositorios: refs.repositoriosCardRef,
      aspas: refs.aspasCardRef,
    } as const;

    const sectionRef = sectionMap[initialSection];
    const timer = window.setTimeout(() => {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [
    initialSection,
    refs.casCardRef,
    refs.casPaiCardRef,
    refs.repositoriosCardRef,
    refs.aspasCardRef,
  ]);
}
