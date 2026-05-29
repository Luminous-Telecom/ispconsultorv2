import { CarneParcela } from 'types';
import { CLIENTE_RPKI_TAB_IDS, ClienteRpkiTabId } from './types';

const EQUIPAMENTOS_TAB_IDS = ['tunel', 'ssh-devices', 'ssh-backups'] as const;

export function filterParcelasByCancelados(
  parcelas: CarneParcela[],
  showCancelados: boolean
): CarneParcela[] {
  return parcelas.filter((titulo) => {
    if (titulo.status === 'cancelado' && !showCancelados) {
      return false;
    }
    return true;
  });
}

export function enrichParcelasWithSearchFields(parcelas: CarneParcela[]) {
  return parcelas.map((titulo) => ({
    ...titulo,
    plano_nome: titulo.plano?.nome_plano || '',
    numero_titulo_str: (titulo.numero_titulo || titulo.numero_parcela || titulo.id).toString(),
    valor_str: (titulo.valor || titulo.valor_parcela || 0).toString(),
    valor_pago_str: (titulo.valor_pago || 0).toString(),
  }));
}

export function isClienteScrollableTab(activeTab: string): boolean {
  return (
    activeTab === 'contratos' ||
    activeTab === 'financeiro' ||
    activeTab === 'arquivos' ||
    activeTab === 'tunel' ||
    activeTab === 'ssh-devices' ||
    activeTab === 'ssh-backups' ||
    CLIENTE_RPKI_TAB_IDS.includes(activeTab as ClienteRpkiTabId)
  );
}

export function isEquipamentosTab(activeTab: string): boolean {
  return EQUIPAMENTOS_TAB_IDS.includes(activeTab as (typeof EQUIPAMENTOS_TAB_IDS)[number]);
}

export function isRpkiTab(activeTab: string): boolean {
  return CLIENTE_RPKI_TAB_IDS.includes(activeTab as ClienteRpkiTabId);
}
