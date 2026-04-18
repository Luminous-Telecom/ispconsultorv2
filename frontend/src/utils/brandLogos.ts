/**
 * Logos de marca: um único lugar no repo — `src/assets/brand-logos/`.
 * Adicione o arquivo (ex.: `mikrotik.png`) e o webpack inclui no bundle com hash.
 */

// Webpack (CRA): require.context
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const logoContext = (require as any).context('../assets/brand-logos', false, /\.(png|jpg|jpeg|svg)$/i) as {
  (id: string): string;
  keys(): string[];
};

function resolveFile(filename: string): string | null {
  const key = `./${filename}`;
  if (!logoContext.keys().includes(key)) {
    return null;
  }
  return logoContext(key) as string;
}

/** Nome exibido → nome do arquivo em `src/assets/brand-logos/` */
const brandLogoFilename: Record<string, string> = {
  VSOL: 'vsol.png',
  Fiberhome: 'fiberhome.png',
  Overteck: 'overtek.png',
  Huawei: 'huawei.png',
  Mikrotik: 'mikrotik.png',
  Intelbras: 'intelbras.png',
  Grandstream: 'grandstream.png',
  'IXC Provedor': 'ixc.png',
  SGP: 'sgp.png',
  Mikweb: 'mikweb.png',
  Atlaz: 'atlaz.png',
  MKAuth: 'mkauth.png',
  Receitanet: 'receitanet.png',
  Proxmox: 'proxmox.png',
  Unbound: 'unbound.png',
  Bind9: 'bind9.png',
  Zabbix: 'zabbix.png',
  Grafana: 'grafana.png',
  'The Dude': 'thedude.jpg',
  LibreNMS: 'librenms.png',
  'Bloqueio Anatel': 'blockdomi.png',
  'Windows Server': 'windows-server.png',
  Debian: 'debian.png',
  Ubuntu: 'ubuntu.png',
  Windows: 'windows.png',
  Mimosa: 'mimosa.png',
  Ubiquiti: 'ubiquiti.png',
};

/** URLs resolvidas pelo webpack (só entradas cujo arquivo exista na pasta). */
export const brandLogos: Record<string, string> = Object.fromEntries(
  Object.entries(brandLogoFilename)
    .map(([brand, file]) => {
      const url = resolveFile(file);
      return url ? ([brand, url] as const) : null;
    })
    .filter((x): x is readonly [string, string] => x !== null)
) as Record<string, string>;

export const getBrandLogo = (brandName: string): string | null => {
  const file = brandLogoFilename[brandName];
  if (!file) return null;
  return resolveFile(file);
};
