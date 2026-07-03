import React from 'react';

interface HomeLightboxProps {
  lightboxSrc: string;
  onClose: () => void;
}

const HomeLightbox: React.FC<HomeLightboxProps> = ({ lightboxSrc, onClose }) => (
  <div
    className="home-lightbox"
    onClick={onClose}
    aria-label="Fechar imagem (clique fora)"
  >
    <img src={lightboxSrc} alt="ISP Consultor Dashboard" onClick={(e) => e.stopPropagation()} />
  </div>
);

export default HomeLightbox;
