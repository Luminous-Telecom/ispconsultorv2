import React from 'react';

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
  // Usar apenas a logo principal
  const logoSrc = '/logos/backnet.png';

  return (
    <img
      src={logoSrc}
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
