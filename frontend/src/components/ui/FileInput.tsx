import React from 'react';

export type FileInputSize = 'sm' | 'md' | 'lg';

export interface FileInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size' | 'onChange'> {
  size?: FileInputSize;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFileChange?: (file: File | null) => void;
}

/** Input de ficheiro com visual alinhado ao tema (botão Escolher ficheiro). */
export const FileInput = React.forwardRef<HTMLInputElement, FileInputProps>(function FileInput(
  { size = 'md', className = '', onChange, onFileChange, ...rest },
  ref,
) {
  const sizeClass = size !== 'md' ? `form-control-${size}` : '';

  return (
    <input
      ref={ref}
      type="file"
      className={`form-control ${sizeClass} ${className}`.trim()}
      onChange={(event) => {
        onChange?.(event);
        onFileChange?.(event.target.files?.[0] ?? null);
      }}
      {...rest}
    />
  );
});

export default FileInput;
