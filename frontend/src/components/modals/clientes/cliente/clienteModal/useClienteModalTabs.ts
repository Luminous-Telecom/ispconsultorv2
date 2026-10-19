import { useMemo } from 'react';
import { useI18n } from 'contexts/I18nContext';
import { ModalTabItem } from 'components/common/ModalTabsOverflow';

interface UseClienteModalTabsParams {
  canEditContratosFinanceiro: boolean;
  hasModuloEquipamentos: boolean;
  hasModuloRpki: boolean;
  showFinanceTabs?: boolean;
}

export function useClienteModalTabs({
  canEditContratosFinanceiro,
  hasModuloEquipamentos,
  hasModuloRpki,
  showFinanceTabs = true,
}: UseClienteModalTabsParams): ModalTabItem[] {
  const { t } = useI18n();

  return useMemo((): ModalTabItem[] => {
    const tabs: ModalTabItem[] = [
      { id: 'dados-basicos', label: t('tabs.basicData') },
      { id: 'contato', label: t('tabs.contact') },
      { id: 'endereco', label: t('tabs.address') },
      {
        id: 'contratos',
        label: t('tabs.contracts'),
        disabled: !canEditContratosFinanceiro,
      },
      ...(showFinanceTabs
        ? [{
          id: 'financeiro',
          label: t('tabs.financial'),
          disabled: !canEditContratosFinanceiro,
        }]
        : []),
      { id: 'observacoes', label: t('tabs.observations') },
      {
        id: 'arquivos',
        label: t('tabs.files'),
        disabled: !canEditContratosFinanceiro,
      },
    ];

    if (hasModuloRpki) {
      tabs.push(
        { id: 'rpki-cas', label: t('tabs.rpkiCas'), disabled: !canEditContratosFinanceiro },
        { id: 'rpki-cas-pai', label: t('tabs.rpkiCaPai'), disabled: !canEditContratosFinanceiro },
        {
          id: 'rpki-repositorios',
          label: t('tabs.rpkiRepositorios'),
          disabled: !canEditContratosFinanceiro,
        },
        { id: 'rpki-roas', label: t('tabs.rpkiRoas'), disabled: !canEditContratosFinanceiro },
        { id: 'rpki-aspas', label: t('tabs.rpkiAspas'), disabled: !canEditContratosFinanceiro }
      );
    }

    if (hasModuloEquipamentos) {
      tabs.push(
        { id: 'tunel', label: t('tabs.tunnelAgents'), disabled: !canEditContratosFinanceiro },
        {
          id: 'ssh-devices',
          label: t('tabs.sshDevicesSection'),
          disabled: !canEditContratosFinanceiro,
        },
        {
          id: 'ssh-backups',
          label: t('tabs.sshDeviceBackups'),
          disabled: !canEditContratosFinanceiro,
        }
      );
    }

    return tabs;
  }, [canEditContratosFinanceiro, hasModuloEquipamentos, hasModuloRpki, showFinanceTabs, t]);
}

export function shouldRenderClienteHeader(
  isLoadingCliente: boolean,
  isEditing: boolean,
  cliente: unknown
): boolean {
  return !(isLoadingCliente && isEditing) && !(!cliente && isEditing);
}
