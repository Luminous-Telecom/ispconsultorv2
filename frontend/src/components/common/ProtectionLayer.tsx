import React from 'react';

interface ProtectionLayerProps {
  children: React.ReactNode;
}

const ProtectionLayer: React.FC<ProtectionLayerProps> = ({ children }) => {
  return <>{children}</>;
};

export default ProtectionLayer;
