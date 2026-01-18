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
  return (
    <img
      src="/backnet.png"
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
