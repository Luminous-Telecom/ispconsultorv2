import { useEffect, useState } from 'react';

/** Busca o IP do cliente via endpoint relativo (funciona em qualquer ambiente). */
export function useClientIp(): string {
  const [clientIp, setClientIp] = useState('');

  useEffect(() => {
    let active = true;
    const fetchClientIp = async () => {
      try {
        const response = await fetch('/client-ip');
        if (!response.ok) return;
        const data = await response.json();
        if (active && data.success && data.ip && data.ip !== 'Não disponível') {
          setClientIp(data.ip);
        }
      } catch (err) {
        // Silenciosamente falha se não conseguir obter o IP
      }
    };
    fetchClientIp();
    return () => {
      active = false;
    };
  }, []);

  return clientIp;
}
