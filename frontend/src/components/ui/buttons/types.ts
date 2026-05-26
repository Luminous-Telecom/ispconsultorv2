import type { TranslationKeys } from 'contexts/I18nContext';
import type { ButtonProps } from '../Button';
import type { SystemButtonAction } from './config';

export interface SystemActionButtonProps
  extends Omit<ButtonProps, 'children' | 'leftIcon' | 'rightIcon' | 'icon' | 'iconOnlyOnMobile' | 'alwaysShowIcon'> {
  isPending?: boolean;
  entity?: string;
  iconOnly?: boolean;
  /** Sobrescreve o texto (ex.: ConfirmModal com mensagem dinâmica). */
  label?: string;
  /** Sobrescreve a chave i18n padrão da ação. */
  i18nKey?: keyof TranslationKeys;
}

export interface SystemButtonProps extends SystemActionButtonProps {
  action: SystemButtonAction;
}

export interface ModalFormActionsProps {
  onCancel: () => void;
  formId?: string;
  isPending?: boolean;
  onSave?: () => void | Promise<void>;
  saveType?: 'submit' | 'button';
  className?: string;
}

export type { ButtonSize, ButtonVariant } from '../Button';
