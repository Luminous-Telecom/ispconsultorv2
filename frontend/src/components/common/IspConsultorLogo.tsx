import React from 'react';
import { SYSTEM_NAME } from 'constants/systemBrand';
import { ispConsultorLogo } from 'constants/systemBrandAssets';

interface IspConsultorLogoProps {
  width?: number | string;
  height?: number | string;
  className?: string;
}

const IspConsultorLogo: React.FC<IspConsultorLogoProps> = ({
  width = 200,
  height,
  className = '',
}) => {
  return (
    <img
      src={ispConsultorLogo}
      alt={`${SYSTEM_NAME} Logo`}
      width={width}
      {...(height != null ? { height } : {})}
      className={`${className} ispconsultor-logo-block`.trim()}
    />
  );
};

export default IspConsultorLogo;
