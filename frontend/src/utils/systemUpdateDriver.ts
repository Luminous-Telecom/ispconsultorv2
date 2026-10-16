const SYSTEM_UPDATE_DRIVER_KEY = 'isp_system_update_driver';

export function markSystemUpdateDriver(): void {
  sessionStorage.setItem(SYSTEM_UPDATE_DRIVER_KEY, '1');
}

export function clearSystemUpdateDriver(): void {
  sessionStorage.removeItem(SYSTEM_UPDATE_DRIVER_KEY);
}

export function isSystemUpdateDriver(): boolean {
  return sessionStorage.getItem(SYSTEM_UPDATE_DRIVER_KEY) === '1';
}
