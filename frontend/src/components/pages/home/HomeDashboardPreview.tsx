import React from 'react';
import { NavLinkButton } from 'components/ui';
import type { Theme } from 'contexts/ThemeContext';
import { getSiteDashboardImage } from 'constants/siteDashboardImages';

export interface HomeDashboardPreviewProps {
  theme: Theme;
  onOpenLightbox: (src: string) => void;
  linkClassName: string;
  imgClassName: string;
}

/** Imagem do dashboard no site — alterna claro/escuro conforme o tema do site. */
const HomeDashboardPreview: React.FC<HomeDashboardPreviewProps> = ({
  theme,
  onOpenLightbox,
  linkClassName,
  imgClassName,
}) => {
  const src = getSiteDashboardImage(theme);

  return (
    <NavLinkButton
      type="button"
      className={linkClassName}
      onClick={() => onOpenLightbox(src)}
      ariaLabel="Ampliar imagem do dashboard"
    >
      <img src={src} alt="ISP Consultor Dashboard" className={imgClassName} />
    </NavLinkButton>
  );
};

export default HomeDashboardPreview;
