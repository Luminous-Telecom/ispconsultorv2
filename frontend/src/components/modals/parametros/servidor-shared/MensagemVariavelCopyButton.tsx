import React from 'react';
import { CopiarButton } from 'components/ui';

interface MensagemVariavelCopyButtonProps {
  variable: string;
  onCopy: (variable: string) => void;
  title: string;
}

const MensagemVariavelCopyButton: React.FC<MensagemVariavelCopyButtonProps> = ({
  variable,
  onCopy,
  title,
}) => (
  <CopiarButton
    type="button"
    size="sm"
    variant="ghost"
    className="p-0 text-muted ms-auto"
    onClick={() => onCopy(variable)}
    title={title}
    aria-label={title}
    iconOnly
    style={{ fontSize: '0.75rem' }}
  />
);

export default MensagemVariavelCopyButton;
