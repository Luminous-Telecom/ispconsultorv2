/**
 * Formatos de domínio que o site Blockdomi documenta para o MikroTik.
 * v7: DNS Adlist (arquivo de hosts). v6: script de DNS Static.
 */

const OCTETO = '(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';
const IPV4 = new RegExp(`^${OCTETO}(?:\\.${OCTETO}){3}$`);

/** Caracteres que quebram a linha de hosts ou o comando do RouterOS. */
const DOMINIO_INSEGURO = /[\s"'\\#;`$<>]/;

export const ADLIST_IP_PADRAO = '0.0.0.0';
export const MIKROTIK_V6_ADDRESS = '127.0.0.1';

export function ipv4AdlistValido(ip: string): boolean {
  return IPV4.test(ip);
}

export function dominiosParaLista(dominios: string[]): string[] {
  const vistos = new Set<string>();
  const saida: string[] = [];
  for (const bruto of dominios) {
    const nome = bruto.trim();
    if (!nome || DOMINIO_INSEGURO.test(nome)) continue;
    const chave = nome.toLowerCase();
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    saida.push(nome);
  }
  return saida;
}

function texto(linhas: string[]): string {
  if (linhas.length === 0) return '';
  return `${linhas.join('\n')}\n`;
}

/** RouterOS 7.15+: uma linha `IP domínio` para /ip dns adlist. */
export function formatarAdlist(dominios: string[], ip: string): string {
  const nomes = dominiosParaLista(dominios);
  return texto(nomes.map((nome) => `${ip} ${nome}`));
}

/** RouterOS v6: comandos /ip dns static, um por domínio. */
export function formatarMikrotikV6(dominios: string[], address = MIKROTIK_V6_ADDRESS): string {
  const nomes = dominiosParaLista(dominios);
  return texto(
    nomes.map(
      (nome) =>
        `/ip dns static add name="${nome}" address=${address} comment="Blocked by Blockdomi"`
    )
  );
}
