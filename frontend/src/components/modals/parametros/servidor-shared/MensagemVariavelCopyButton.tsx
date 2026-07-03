import React from 'react';
import { CopiarIconButton } from 'components/ui';

interface MensagemVariavelCopyButtonProps {
  variable: string;
  title: string;
}

const MensagemVariavelCopyButton: React.FC<MensagemVariavelCopyButtonProps> = ({
  variable,
  title,
}) => (
  <CopiarIconButton
    text={variable}
    copyKey={variable}
    type="button"
    size="sm"
    variant="ghost"
    className="p-0 text-muted ms-auto fs-sm"
    title={title}
  />
);

export default MensagemVariavelCopyButton;
