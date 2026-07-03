import React, { useEffect, useRef } from 'react';
import Input from './Input';
import CopiarIconButton from './buttons/CopiarIconButton';
import type { InputType, InputSize } from './types';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import {
  isRequiredValidationMessage,
  shouldNotifyRequiredValidationToast,
  shouldShowInlineValidationMessage,
} from 'utils/requiredValidationToast';

export interface CopyableInputProps {
  id?: string;
  name?: string;
  type?: InputType;
  size?: InputSize;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  autoComplete?: string;
  copyKey?: string;
  /** Texto copiado — padrão: `value` */
  copyText?: string;
  className?: string;
  isInvalid?: boolean;
  error?: string;
  onChange?: (value: string) => void;
  onCopyFailed?: () => void;
  onCopied?: () => void;
}

const CopyableInput: React.FC<CopyableInputProps> = ({
  id,
  name,
  type = 'text',
  size = 'sm',
  value = '',
  placeholder,
  disabled = false,
  readOnly = false,
  required = false,
  autoComplete = 'off',
  copyKey,
  copyText,
  className = '',
  isInvalid = false,
  error,
  onChange,
  onCopyFailed,
  onCopied,
}) => {
  const { error: notifyError } = useNotificationContext();
  const lastRequiredToastRef = useRef<string | null>(null);
  const textToCopy = copyText ?? value;
  const inlineError = shouldShowInlineValidationMessage(error) ? error : undefined;
  const requiredToastMessage = isRequiredValidationMessage(error) ? error : null;
  const wrapperClass = [
    'copyable-input',
    size === 'sm' ? 'copyable-input-sm' : '',
    isInvalid ? 'is-invalid' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    if (!requiredToastMessage) {
      lastRequiredToastRef.current = null;
      return;
    }

    if (lastRequiredToastRef.current === requiredToastMessage) return;

    lastRequiredToastRef.current = requiredToastMessage;
    if (!shouldNotifyRequiredValidationToast()) return;

    notifyError(requiredToastMessage);
  }, [notifyError, requiredToastMessage]);

  return (
    <>
      <div className={wrapperClass}>
        <Input
          type={type}
          id={id}
          name={name}
          size={size}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          autoComplete={autoComplete}
          className="copyable-input-field"
          onChange={(e) => onChange?.((e as { value?: string }).value ?? '')}
        />
        <CopiarIconButton
          text={textToCopy}
          copyKey={copyKey ?? id ?? name}
          disabled={disabled}
          size={size}
          onCopied={onCopied}
          onCopyFailed={onCopyFailed}
        />
      </div>
      {inlineError && <div className="invalid-feedback d-block">{inlineError}</div>}
    </>
  );
};

export default CopyableInput;
