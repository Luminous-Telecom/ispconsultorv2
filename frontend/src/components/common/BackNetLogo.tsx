import React from 'react';
import logoBacknet from '../../assets/brand-logos/backnet.png';

interface BackNetLogoProps {
  width?: number | string;
  height?: number | string;
  className?: string;
}

const BackNetLogo: React.FC<BackNetLogoProps> = ({
  width = 200,
  height = 60,
  className = ''
}) => {
  return (
    <img
      src={logoBacknet}
      alt="BackNet Logo"
      width={width}
      height={height}
      className={className}
      style={{
        objectFit: 'contain',
        display: 'block'
      }}
    />
  );
};

export default BackNetLogo;
