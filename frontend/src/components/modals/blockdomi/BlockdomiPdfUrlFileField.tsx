import React, { type RefObject } from 'react';
import { FileInput, IconOnlyButton, LabelWithHelp } from 'components/ui';

export interface BlockdomiPdfUrlFileFieldProps {
  id: string;
  name: string;
  label: string;
  placeholder?: string;
  helpText?: string;
  urlValue: string;
  onUrlChange: (value: string) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  selectedFile: File | null;
  onFileChange: (file: File | null) => void;
  onClear: () => void;
  clearDisabled?: boolean;
  clearTitle: string;
  required?: boolean;
}

const BlockdomiPdfUrlFileField: React.FC<BlockdomiPdfUrlFileFieldProps> = ({
  id,
  name,
  label,
  placeholder,
  helpText,
  urlValue,
  onUrlChange,
  fileInputRef,
  selectedFile,
  onFileChange,
  onClear,
  clearDisabled = false,
  clearTitle,
  required = false,
}) => (
  <div className="col-12">
    <div className="form-field ilb-pdf-field-group">
      <LabelWithHelp htmlFor={id} className="form-label" helpText={helpText} required={required}>
        {label}
      </LabelWithHelp>
      <div className="form-field-control">
        <div className="ilb-pdf-url-file-group">
          <input
            id={id}
            name={name}
            type="text"
            className="form-control form-control-sm ilb-pdf-url"
            placeholder={placeholder}
            value={urlValue}
            onChange={(event) => onUrlChange(event.target.value)}
            autoComplete="off"
          />
          <FileInput
            ref={fileInputRef}
            size="sm"
            className="ilb-pdf-file"
            accept=".pdf,application/pdf"
            onFileChange={onFileChange}
          />
          <IconOnlyButton
            type="button"
            size="sm"
            variant="outline-danger"
            className="ilb-pdf-remove-btn"
            onClick={onClear}
            disabled={clearDisabled || !selectedFile}
            title={clearTitle}
            label={clearTitle}
            iconClassName="bi bi-trash"
          />
        </div>
      </div>
    </div>
  </div>
);

export default BlockdomiPdfUrlFileField;
