import { clienteDisplayName } from '../../utils/clienteDisplayName';

export function clienteNomeParaOrdemServico(
  cliente: { razao_social?: string | null; nome_fantasia?: string | null },
  fallbackId?: number | string
): string {
  return clienteDisplayName(cliente, fallbackId);
}
