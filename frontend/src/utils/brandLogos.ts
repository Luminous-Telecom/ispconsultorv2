// Mapeamento de logos das marcas
// As logos devem estar em /public/logos/{nome-da-marca}.png ou .svg
// Exemplo: /logos/mikrotik.png

export const brandLogos: Record<string, string> = {
  // OLT
  'VSOL': '/logos/vsol.png',
  'Fiberhome': '/logos/fiberhome.png',
  'Overteck': '/logos/overteck.png',
  
  // Roteador de Borda
  'Huawei': '/logos/huawei.png',
  'Mikrotik': '/logos/mikrotik.png',
  
  // Switch
  'Intelbras': '/logos/intelbras.png',
  
  // ERPs
  'IXC Provedor': '/logos/ixc.png',
  'SGP': '/logos/sgp.png',
  'Mikweb': '/logos/mikweb.png',
  'Atlaz': '/logos/atlaz.jpg',
  'MKAuth': '/logos/mkauth.png',
  
  // Virtualização
  'Proxmox': '/logos/proxmox.png',
  
  // DNS
  'Unbound': '/logos/unbound.png',
  'Bind9': '/logos/bind9.png',
  
  // Monitoramento
  'Zabbix': '/logos/zabbix.png',
  'Grafana': '/logos/grafana.png',
  'The Dude': '/logos/thedude.jpg',
  'LibreNMS': '/logos/librenms.jpg',
  
  // API
  'Bloqueio Anatel': '/logos/anatel.jpg',
};

/**
 * Retorna o caminho da logo de uma marca, ou null se não existir
 */
export const getBrandLogo = (brandName: string): string | null => {
  return brandLogos[brandName] || null;
};

