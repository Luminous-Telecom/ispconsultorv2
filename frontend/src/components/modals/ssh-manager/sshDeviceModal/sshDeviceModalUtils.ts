import React from 'react';
import { SshDeviceService } from 'services/sshDeviceService';
import { useI18n } from 'contexts/I18nContext';

export type BackupAgendamentoInfo = Awaited<ReturnType<typeof SshDeviceService.getBackupAgendamento>>;
export type I18nTranslateFn = ReturnType<typeof useI18n>['t'];

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
