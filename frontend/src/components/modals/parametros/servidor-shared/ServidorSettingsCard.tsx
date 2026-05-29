import React from 'react';

export interface ServidorSettingsCardProps {
  title: string;
  children: React.ReactNode;
}

const ServidorSettingsCard: React.FC<ServidorSettingsCardProps> = ({ title, children }) => (
  <div className="card">
    <div className="card-header py-1 px-2">
      <small className="fw-bold mb-0">{title}</small>
    </div>
    <div className="card-body p-2">{children}</div>
  </div>
);

export default ServidorSettingsCard;
