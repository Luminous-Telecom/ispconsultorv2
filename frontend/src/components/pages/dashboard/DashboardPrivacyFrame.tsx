import React from 'react';
import { useDashboardDataObfuscation } from 'hooks/useDashboardDataObfuscation';

interface DashboardPrivacyFrameProps {
  children: React.ReactNode;
}

const DashboardPrivacyFrame: React.FC<DashboardPrivacyFrameProps> = ({ children }) => {
  const { isObfuscated } = useDashboardDataObfuscation();

  return (
    <div
      className={`dashboard-container${isObfuscated ? ' dashboard-container--obfuscated' : ''}`}
      aria-hidden={isObfuscated || undefined}
    >
      {children}
    </div>
  );
};

export default DashboardPrivacyFrame;
