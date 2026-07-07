import React from 'react';
import { SshDeviceService } from 'services/sshDeviceService';
import { useI18n } from 'contexts/I18nContext';
import { SshDevice } from 'types';

export type BackupAgendamentoInfo = Awaited<ReturnType<typeof SshDeviceService.getBackupAgendamento>>;
export type I18nTranslateFn = ReturnType<typeof useI18n>['t'];

export function isSwosSshDeviceType(deviceType: string | undefined | null): boolean {
  return String(deviceType ?? '').toLowerCase() === 'swos';
}

export function canOpenSshDeviceTerminal(
  device: Pick<SshDevice, 'device_type'> | undefined
): boolean {
  if (!device) return false;
  return !isSwosSshDeviceType(device.device_type);
}

export function canTestSshDeviceConnection(
  device: Pick<SshDevice, 'device_type'> | undefined
): boolean {
  if (!device) return false;
  return !isSwosSshDeviceType(device.device_type);
}

export function canQueueManualSshDeviceBackup(
  device: Pick<SshDevice, 'is_active' | 'device_type'> | undefined
): boolean {
  if (!device) return false;
  const activeFlag = device.is_active as boolean | number;
  const inactive = activeFlag === false || activeFlag === 0;
  if (inactive) return false;
  const deviceType = String(device.device_type ?? '').toLowerCase();
  return (
    deviceType === 'mikrotik' ||
    deviceType === 'huawei' ||
    deviceType === 'swos'
  );
}

export function renderBackupAgendamentoHint(
  ag: BackupAgendamentoInfo | undefined,
  t: I18nTranslateFn
): React.ReactNode {
  if (!ag?.configurado) return null;
  const f = ag.frequencia;
  const horaDisp = ag.hora_execucao ?? '—';
  let freqLabel = '';
  if (f === 'diaria') freqLabel = t('sshDevice.freqDiaria');
  else if (f === 'semanal') freqLabel = t('sshDevice.freqSemanal');
  else if (f === 'mensal') freqLabel = t('sshDevice.freqMensal');
  else if (f === 'anual') freqLabel = t('sshDevice.freqAnual');
  else if (f === 'personalizada') freqLabel = t('sshDevice.freqPersonalizada');
  else if (f) freqLabel = f;
  const text = t('sshDevice.backupScheduleAt')
    .replace('{{hora}}', horaDisp)
    .replace('{{freq}}', freqLabel);
  return React.createElement('span', { className: 'text-muted small ms-1' }, text);
}
