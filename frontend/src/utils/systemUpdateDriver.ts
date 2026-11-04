const SYSTEM_UPDATE_DRIVER_KEY = 'isp_system_update_driver';

export const SYSTEM_UPDATE_HANDOFF_EVENT = 'system-update-handoff';

export function markSystemUpdateDriver(): void {
  sessionStorage.setItem(SYSTEM_UPDATE_DRIVER_KEY, '1');
}

export function clearSystemUpdateDriver(): void {
  sessionStorage.removeItem(SYSTEM_UPDATE_DRIVER_KEY);
}

/** A conexão do progresso caiu, mas a atualização segue no servidor. O aviso em tela cheia assume o acompanhamento. */
export function handoffSystemUpdateToOverlay(): void {
  clearSystemUpdateDriver();
  window.dispatchEvent(new Event(SYSTEM_UPDATE_HANDOFF_EVENT));
}

export function isSystemUpdateDriver(): boolean {
  return sessionStorage.getItem(SYSTEM_UPDATE_DRIVER_KEY) === '1';
}
