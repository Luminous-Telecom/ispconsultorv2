import React from 'react';

interface SidebarOverlayProps {
  onClose: () => void;
}

const SidebarOverlay: React.FC<SidebarOverlayProps> = ({ onClose }) => (
  <div className="sidebar-overlay" onClick={onClose} />
);

export default SidebarOverlay;
