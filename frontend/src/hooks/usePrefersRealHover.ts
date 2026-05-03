import { useEffect, useState } from 'react';

/**
 * Em touch / pointer grosso, :hover pode “grudar” após o toque e o par
 * mouseenter/mouseleave não reflete o uso real — pausar o toast por hover
 * nesse caso deixa o timer cancelado sem resume. Só pausamos quando o
 * ambiente reporta hover confiável (ex.: mouse em desktop).
 */
export function usePrefersRealHover(): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover)');
    const handler = () => setMatches(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return matches;
}
