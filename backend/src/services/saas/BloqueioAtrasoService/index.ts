export interface BloqueioAtrasoInfo {
  bloqueado: boolean;
  titulo_id?: number;
  url_pagamento?: string | null;
  mensagem?: string;
}

export async function desbloquearSeSemAtraso(_empresaId: number): Promise<void> {
  return;
}

export async function getBloqueioAtrasoInfo(_empresaId: number): Promise<BloqueioAtrasoInfo> {
  return { bloqueado: false };
}
