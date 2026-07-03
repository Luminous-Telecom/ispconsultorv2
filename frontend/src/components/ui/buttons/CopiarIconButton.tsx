import React from 'react';
import { useCopyToClipboard } from 'hooks/useCopyToClipboard';
import { CopiarButton } from './buttons';
import type { SystemActionButtonProps } from './types';

export interface CopiarIconButtonProps extends Omit<SystemActionButtonProps, 'iconOnly' | 'isCopied' | 'onClick'> {
  text: string;
  copyKey?: string;
  onCopied?: () => void;
  onCopyFailed?: () => void;
  resetAfterMs?: number;
}

const CopiarIconButton: React.FC<CopiarIconButtonProps> = ({
  text,
  copyKey,
  onCopied,
  onCopyFailed,
  resetAfterMs,
  disabled,
  ...rest
}) => {
  const { copy, isCopied } = useCopyToClipboard({ resetAfterMs });
  const key = copyKey ?? text;
  const copied = isCopied(key);

  return (
    <CopiarButton
      iconOnly
      isCopied={copied}
      disabled={disabled || !text.trim()}
      onClick={async () => {
        const ok = await copy(text, key);
        if (ok) {
          onCopied?.();
        } else {
          onCopyFailed?.();
        }
      }}
      {...rest}
    />
  );
};

export default CopiarIconButton;
