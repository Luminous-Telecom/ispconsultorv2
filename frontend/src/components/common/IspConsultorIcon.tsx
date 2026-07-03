import React from 'react';
import { SYSTEM_NAME } from 'constants/systemBrand';
import { ispConsultorIcon } from 'constants/systemBrandAssets';

interface IspConsultorIconProps {
  size?: number | string;
  className?: string;
}

const IspConsultorIcon: React.FC<IspConsultorIconProps> = ({
  size = 32,
  className = '',
}) => {
  return (
    <img
      src={ispConsultorIcon}
      alt={`${SYSTEM_NAME} Ícone`}
      width={size}
      height={size}
      className={`${className} ispconsultor-icon-block`.trim()}
    />
  );
};

export default IspConsultorIcon;
