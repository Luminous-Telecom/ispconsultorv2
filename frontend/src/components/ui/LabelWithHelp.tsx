import React from 'react';

export interface LabelWithHelpProps {
  children?: React.ReactNode;
  helpText?: string;
  required?: boolean;
  htmlFor?: string;
  id?: string;
  className?: string;
  helpIconClassName?: string;
  as?: 'label' | 'span';
}

/** Asterisco vermelho para campos obrigatórios. */
export const RequiredMark: React.FC = () => (
  <span className="required-mark text-danger ms-1" aria-hidden="true">
    *
  </span>
);

const HelpIcon: React.FC<{ text: string; className?: string }> = ({ text, className = 'ms-1' }) => (
  <i
    className={`bi bi-info-circle text-muted flex-shrink-0 ${className}`.trim()}
    style={{ cursor: 'help', fontSize: '0.85rem' }}
    title={text}
    role="img"
    aria-label={text}
  />
);

/** Label (ou span) com asterisco opcional e ícone de ajuda. */
export const LabelWithHelp: React.FC<LabelWithHelpProps> = ({
  children,
  helpText,
  required = false,
  htmlFor,
  id,
  className,
  helpIconClassName,
  as = 'label',
}) => {
  const content = (
    <>
      {children}
      {required && <RequiredMark />}
      {helpText && <HelpIcon text={helpText} className={helpIconClassName} />}
    </>
  );

  if (as === 'span') {
    return (
      <span id={id} className={className}>
        {content}
      </span>
    );
  }

  return (
    <label htmlFor={htmlFor} id={id} className={className}>
      {content}
    </label>
  );
};
