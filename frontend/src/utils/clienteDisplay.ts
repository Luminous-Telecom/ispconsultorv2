/** Referência mínima para exibir nome do cliente em listagens e formulários. */
export type ClienteNomeFields = {
  razao_social?: string | null;
  nome_fantasia?: string | null;
  id?: number | string | null;
};

/** Nome do cliente para colunas/UI: prioriza razão social; fantasia só se razão vazia. */
export function getClienteRazaoSocialLabel(
  cliente: ClienteNomeFields | null | undefined,
  fallback = '—'
): string {
  if (!cliente) return fallback;
  const razao = cliente.razao_social?.trim();
  if (razao) return razao;
  const fantasia = cliente.nome_fantasia?.trim();
  if (fantasia) return fantasia;
  if (cliente.id != null && cliente.id !== '') {
    return `Cliente #${cliente.id}`;
  }
  return fallback;
}
