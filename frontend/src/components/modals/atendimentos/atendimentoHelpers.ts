import type { Atendimento } from 'services/atendimentoService';

export const isAtendimentoLocal = (atendimento?: Atendimento | null): boolean => {
  if (!atendimento) return false;
  if (atendimento.origem === 'ispconsultor') return true;
  if (atendimento.origem === 'ixc') return false;
  return !String(atendimento.ixc_id ?? '').trim();
};
