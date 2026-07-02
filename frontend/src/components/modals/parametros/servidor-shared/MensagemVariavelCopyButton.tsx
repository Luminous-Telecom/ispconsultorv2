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
    className="p-0 text-muted ms-auto fs-sm"
  />
);

export default MensagemVariavelCopyButton;
