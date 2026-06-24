export function clienteNomeParaOrdemServico(
  cliente: { razao_social?: string | null; nome_fantasia?: string | null },
  fallbackId?: number | string
): string {
  const razao = cliente.razao_social?.trim();
  if (razao) return razao;
  const fantasia = cliente.nome_fantasia?.trim();
  if (fantasia) return fantasia;
  return fallbackId != null ? String(fallbackId) : '';
}
